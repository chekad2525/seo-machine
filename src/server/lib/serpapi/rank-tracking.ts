import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  assertUsageCreditsAvailable,
  getOrCreateOrganizationCustomer,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { getIsoCountryCode } from "@/shared/keyword-locations";
import { SERPAPI_SEARCH_COST_USD } from "@/shared/rank-tracking";

const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const PAGE_SIZE = 10;
const REQUEST_TIMEOUT_MS = 45_000;

const organicResultSchema = z
  .object({
    position: z.number().int().positive(),
    link: z.string().min(1),
  })
  .passthrough();

const responseSchema = z
  .object({
    search_metadata: z
      .object({ status: z.string().optional() })
      .passthrough()
      .optional(),
    organic_results: z.array(organicResultSchema).optional(),
    error: z.string().optional(),
  })
  .passthrough();

type SerpApiResponse = z.infer<typeof responseSchema>;

export interface RankCheckResult {
  keywordId: string;
  keyword: string;
  position: number | null;
  url: string | null;
  serpFeatures: string[];
}

export interface RankCheckInput {
  keyword: string;
  keywordId: string;
  locationCode: number;
  languageCode: string;
  locationName?: string;
  device: "desktop" | "mobile";
  targetDomain: string;
  depth: number;
}

class SerpApiRequestError extends AppError {
  constructor(
    code: ConstructorParameters<typeof AppError>[0],
    message: string,
    readonly searchesUsed: number,
  ) {
    super(code, message);
    this.name = "SerpApiRequestError";
  }
}

function normalizedHostname(value: string): string | null {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesDomain(link: string, targetDomain: string): boolean {
  const hostname = normalizedHostname(link);
  const target = targetDomain.toLowerCase().replace(/^www\./, "");
  return hostname === target || Boolean(hostname?.endsWith("." + target));
}

const IGNORED_RESULT_KEYS = new Set([
  "search_metadata",
  "search_parameters",
  "search_information",
  "organic_results",
  "pagination",
  "serpapi_pagination",
  "error",
]);

function collectSerpFeatures(response: SerpApiResponse): string[] {
  const features = new Set<string>();
  if ((response.organic_results?.length ?? 0) > 0) features.add("organic");

  for (const [key, value] of Object.entries(response)) {
    if (IGNORED_RESULT_KEYS.has(key) || value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }
    features.add(key.replace(/_results$/, ""));
  }
  return [...features];
}

function classifyHttpError(
  status: number,
): ConstructorParameters<typeof AppError>[0] {
  if (status === 401 || status === 403) return "AUTH_CONFIG_MISSING";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "UPSTREAM_UNAVAILABLE";
  return "VALIDATION_ERROR";
}

async function fetchPage(
  apiKey: string,
  input: RankCheckInput,
  start: number,
): Promise<SerpApiResponse> {
  const url = new URL(SERPAPI_SEARCH_URL);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", input.keyword);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("device", input.device);
  url.searchParams.set("hl", input.languageCode);
  url.searchParams.set("gl", getIsoCountryCode(input.locationCode));
  url.searchParams.set("google_domain", "google.com");
  url.searchParams.set("num", String(PAGE_SIZE));
  url.searchParams.set("no_cache", "true");
  if (input.locationName) url.searchParams.set("location", input.locationName);
  if (start > 0) url.searchParams.set("start", String(start));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      error instanceof Error ? error.message : "SerpApi request failed",
    );
  }

  if (!response.ok) {
    throw new AppError(
      classifyHttpError(response.status),
      "SerpApi request failed with HTTP " + response.status,
    );
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "SerpApi returned an invalid response",
    );
  }
  if (parsed.data.error) {
    const lower = parsed.data.error.toLowerCase();
    const code =
      lower.includes("rate") || lower.includes("limit")
        ? "RATE_LIMITED"
        : lower.includes("api key")
          ? "AUTH_CONFIG_MISSING"
          : "UPSTREAM_UNAVAILABLE";
    throw new AppError(code, parsed.data.error);
  }
  return parsed.data;
}

export async function fetchSerpApiRankCheck(
  apiKey: string,
  input: RankCheckInput,
): Promise<{ data: RankCheckResult; searchesUsed: number }> {
  const maxPages = Math.max(
    1,
    Math.min(10, Math.ceil(input.depth / PAGE_SIZE)),
  );
  const features = new Set<string>();
  let searchesUsed = 0;

  for (let page = 0; page < maxPages; page++) {
    let response: SerpApiResponse;
    try {
      response = await fetchPage(apiKey, input, page * PAGE_SIZE);
      searchesUsed += 1;
    } catch (error) {
      if (error instanceof AppError) {
        throw new SerpApiRequestError(
          error.code,
          error.message,
          searchesUsed,
        );
      }
      throw error;
    }

    for (const feature of collectSerpFeatures(response)) features.add(feature);
    const match = response.organic_results?.find((item) =>
      matchesDomain(item.link, input.targetDomain),
    );
    if (match) {
      return {
        data: {
          keywordId: input.keywordId,
          keyword: input.keyword,
          position: page * PAGE_SIZE + match.position,
          url: match.link,
          serpFeatures: [...features],
        },
        searchesUsed,
      };
    }

    if ((response.organic_results?.length ?? 0) < PAGE_SIZE) break;
  }

  return {
    data: {
      keywordId: input.keywordId,
      keyword: input.keyword,
      position: null,
      url: null,
      serpFeatures: [...features],
    },
    searchesUsed,
  };
}

async function trackSerpApiUsage(input: {
  customer: BillingCustomerContext;
  customerId: string;
  monthlyRemaining: number;
  searchesUsed: number;
}) {
  if (input.searchesUsed <= 0) return;
  await trackUsageCreditSpend({
    customer: input.customer,
    customerId: input.customerId,
    creditFeature: "rank_tracking",
    costUsd: input.searchesUsed * SERPAPI_SEARCH_COST_USD,
    monthlyRemaining: input.monthlyRemaining,
    properties: {
      provider: "serpapi",
      searches: input.searchesUsed,
      fromCache: false,
    },
  });
}

export function createSerpApiRankClient(customer: BillingCustomerContext) {
  return {
    rankCheck: async (input: RankCheckInput): Promise<RankCheckResult> => {
      const apiKey = (await getOptionalEnvValue("SERPAPI_API_KEY"))?.trim();
      if (!apiKey) {
        throw new AppError(
          "AUTH_CONFIG_MISSING",
          "Rank tracking requires SERPAPI_API_KEY.",
        );
      }

      if (!(await isHostedServerAuthMode())) {
        return (await fetchSerpApiRankCheck(apiKey, input)).data;
      }

      const billingCustomer = await getOrCreateOrganizationCustomer(customer);
      const { monthlyRemaining } = await assertUsageCreditsAvailable(
        billingCustomer.id,
      );

      try {
        const result = await fetchSerpApiRankCheck(apiKey, input);
        await trackSerpApiUsage({
          customer,
          customerId: billingCustomer.id,
          monthlyRemaining,
          searchesUsed: result.searchesUsed,
        });
        return result.data;
      } catch (error) {
        if (error instanceof SerpApiRequestError) {
          await trackSerpApiUsage({
            customer,
            customerId: billingCustomer.id,
            monthlyRemaining,
            searchesUsed: error.searchesUsed,
          });
        }
        throw error;
      }
    },
  } as const;
}

export type SerpApiRankClient = ReturnType<typeof createSerpApiRankClient>;

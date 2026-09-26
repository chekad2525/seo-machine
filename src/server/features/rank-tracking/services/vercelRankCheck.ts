import { waitUntil } from "@vercel/functions";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { createSerpApiRankClient } from "@/server/lib/serpapi/rank-tracking";
import { AppError } from "@/server/lib/errors";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type {
  RankCheckTriggerResult,
  RankTrackingConfig,
} from "@/types/schemas/rank-tracking";

type Keyword = { id: string; keyword: string };
const STALE_RUN_MS = 10 * 60 * 1000;
const KEYWORDS_PER_BATCH = 5;

export async function beginVercelRankCheck(input: {
  config: RankTrackingConfig;
  projectId: string;
  billingCustomer: BillingCustomerContext;
  keywords: Keyword[];
  keywordIds?: string[];
}): Promise<RankCheckTriggerResult> {
  const selected = input.keywordIds?.length
    ? input.keywords.filter((keyword) => input.keywordIds?.includes(keyword.id))
    : input.keywords;
  if (selected.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Select at least one tracked keyword.");
  }

  let created = false;
  let runId = "";
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    runId = crypto.randomUUID();
    created = await RankTrackingRepository.tryCreateRun({
      id: runId,
      configId: input.config.id,
      projectId: input.projectId,
      keywordsTotal: selected.length,
      isSubsetRun: Boolean(input.keywordIds?.length),
    });
    if (!created && attempt === 0) {
      const active = await RankTrackingRepository.getActiveRunForConfig(input.config.id);
      if (active && Date.now() - new Date(active.startedAt).getTime() > STALE_RUN_MS) {
        await RankTrackingRepository.updateRun(active.id, {
          status: "failed",
          errorMessage: "Previous Vercel rank check timed out.",
          completedAt: new Date().toISOString(),
        });
      }
    }
  }
  if (!created) {
    const active = await RankTrackingRepository.getActiveRunForConfig(input.config.id);
    return { ok: false, reason: "already_running", blockingRunId: active?.id ?? null };
  }

  try {
    waitUntil(runVercelRankCheck({ ...input, keywords: selected, runId }));
  } catch (error) {
    await RankTrackingRepository.updateRun(runId, {
      status: "failed",
      errorMessage: "Could not start the Vercel rank check.",
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
  return { ok: true, runId };
}

async function runVercelRankCheck(input: {
  config: RankTrackingConfig;
  projectId: string;
  billingCustomer: BillingCustomerContext;
  keywords: Keyword[];
  runId: string;
}) {
  try {
    await RankTrackingRepository.updateRun(input.runId, { status: "running" });
    const client = createSerpApiRankClient(input.billingCustomer);
    const devices: Array<"desktop" | "mobile"> =
      input.config.devices === "both" ? ["desktop", "mobile"] : [input.config.devices];
    let checked = 0;
    let firstError: string | null = null;

    for (let offset = 0; offset < input.keywords.length; offset += KEYWORDS_PER_BATCH) {
      const batch = input.keywords.slice(offset, offset + KEYWORDS_PER_BATCH);
      const requests = batch.flatMap((keyword) =>
        devices.map(async (device) => {
          const result = await client.rankCheck({
            keywordId: keyword.id,
            keyword: keyword.keyword,
            locationCode: input.config.locationCode,
            languageCode: input.config.languageCode,
            locationName: input.config.locationName ?? undefined,
            device,
            targetDomain: input.config.domain,
            depth: input.config.serpDepth,
          });
          return {
            runId: input.runId,
            trackingKeywordId: keyword.id,
            keyword: keyword.keyword,
            device,
            position: result.position,
            url: result.url,
            serpFeatures: result.serpFeatures.length
              ? JSON.stringify(result.serpFeatures)
              : null,
          };
        }),
      );
      const settled = await Promise.allSettled(requests);
      const snapshots = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      for (const result of settled) {
        if (result.status === "rejected") {
          firstError ??= result.reason instanceof Error
            ? result.reason.message
            : "SerpApi rank check failed.";
        }
      }
      if (snapshots.length) {
        await RankTrackingRepository.insertSnapshots(snapshots);
      }
      checked += new Set(snapshots.map((snapshot) => snapshot.trackingKeywordId)).size;
      await RankTrackingRepository.updateRun(input.runId, {
        keywordsChecked: checked,
        ...(firstError ? { errorMessage: firstError } : {}),
      });
    }

    const completedAt = new Date().toISOString();
    const status = checked > 0 ? "completed" : "failed";
    await RankTrackingRepository.updateRun(input.runId, {
      status,
      keywordsChecked: checked,
      completedAt,
      errorMessage: checked < input.keywords.length
        ? firstError ?? "Some keywords could not be checked."
        : null,
    });
    if (status === "completed") {
      await RankTrackingRepository.updateConfig(input.config.id, input.projectId, {
        lastCheckedAt: completedAt,
        lastSkipReason: null,
      });
    }
  } catch (error) {
    console.error("Vercel rank check failed:", error);
    await RankTrackingRepository.updateRun(input.runId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Rank check failed.",
      completedAt: new Date().toISOString(),
    });
  }
}

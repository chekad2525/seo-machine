import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/billing/subscription", () => ({
  assertUsageCreditsAvailable: vi.fn(),
  getOrCreateOrganizationCustomer: vi.fn(),
  trackUsageCreditSpend: vi.fn(),
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: vi.fn(),
  isHostedServerAuthMode: vi.fn(),
}));
import { fetchSerpApiRankCheck } from "./rank-tracking";

const input = {
  keyword: "rank tracker",
  keywordId: "keyword-1",
  locationCode: 2840,
  languageCode: "en",
  device: "desktop" as const,
  targetDomain: "example.com",
  depth: 20,
};

function organicPage(
  links: string[],
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      search_metadata: { status: "Success" },
      organic_results: links.map((link, index) => ({
        position: index + 1,
        link,
      })),
      ...extras,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("SerpApi rank tracking", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("matches the tracked domain and its subdomains", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      organicPage([
        "https://other.test/one",
        "https://blog.example.com/result",
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result).toMatchObject({
      searchesUsed: 1,
      data: {
        position: 2,
        url: "https://blog.example.com/result",
      },
    });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get("api_key")).toBe("secret");
    expect(url.searchParams.get("gl")).toBe("us");
    expect(url.searchParams.get("no_cache")).toBe("true");
  });

  it("paginates and converts page-relative positions to absolute rank", async () => {
    const firstPage = Array.from(
      { length: 10 },
      (_, index) => "https://other" + index + ".test/",
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(organicPage(firstPage, { local_results: [{}] }))
      .mockResolvedValueOnce(
        organicPage([
          "https://another.test/",
          "https://example.com/winner",
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result.data.position).toBe(12);
    expect(result.data.serpFeatures).toEqual(
      expect.arrayContaining(["organic", "local"]),
    );
    expect(result.searchesUsed).toBe(2);
    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(secondUrl.searchParams.get("start")).toBe("10");
  });

  it("returns a null rank when the result depth is exhausted", async () => {
    const page = Array.from(
      { length: 10 },
      (_, index) => "https://other" + index + ".test/",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(organicPage(page))),
    );

    const result = await fetchSerpApiRankCheck("secret", input);

    expect(result.data.position).toBeNull();
    expect(result.data.url).toBeNull();
    expect(result.searchesUsed).toBe(2);
  });
});

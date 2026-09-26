import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import { beginVercelRankCheck } from "./vercelRankCheck";

const mocks = vi.hoisted(() => ({
  jobs: [] as Promise<unknown>[],
  tryCreateRun: vi.fn(),
  getActiveRunForConfig: vi.fn(),
  updateRun: vi.fn(),
  insertSnapshots: vi.fn(),
  updateConfig: vi.fn(),
  rankCheck: vi.fn(),
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: (job: Promise<unknown>) => { mocks.jobs.push(job); },
}));
vi.mock("@/server/features/rank-tracking/repositories/RankTrackingRepository", () => ({
  RankTrackingRepository: mocks,
}));
vi.mock("@/server/lib/serpapi/rank-tracking", () => ({
  createSerpApiRankClient: () => ({ rankCheck: mocks.rankCheck }),
}));

const config = {
  id: "config-1",
  projectId: "project-1",
  domain: "example.com",
  locationCode: 2364,
  languageCode: "fa",
  locationName: null,
  devices: "both",
  serpDepth: 10,
} as RankTrackingConfig;

describe("Vercel SerpApi rank runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jobs.length = 0;
    mocks.tryCreateRun.mockResolvedValue(true);
    mocks.updateRun.mockResolvedValue(undefined);
    mocks.insertSnapshots.mockResolvedValue(undefined);
    mocks.updateConfig.mockResolvedValue(undefined);
    mocks.rankCheck.mockImplementation(async ({ keywordId, keyword }: {
      keywordId: string; keyword: string;
    }) => ({
      keywordId, keyword, position: 4, url: "https://example.com/page",
      serpFeatures: ["organic", "local"],
    }));
  });

  it("persists both device ranks and marks the run complete", async () => {
    const result = await beginVercelRankCheck({
      config,
      projectId: "project-1",
      billingCustomer: {
        userId: "user-1", userEmail: "owner@example.com",
        organizationId: "org-1",
      },
      keywords: [{ id: "keyword-1", keyword: "seo" }],
    });

    expect(result.ok).toBe(true);
    await Promise.all(mocks.jobs);
    expect(mocks.rankCheck).toHaveBeenCalledTimes(2);
    expect(mocks.insertSnapshots).toHaveBeenCalledWith([
      expect.objectContaining({
        trackingKeywordId: "keyword-1", device: "desktop",
        position: 4, url: "https://example.com/page",
        serpFeatures: JSON.stringify(["organic", "local"]),
      }),
      expect.objectContaining({
        trackingKeywordId: "keyword-1", device: "mobile", position: 4,
      }),
    ]);
    expect(mocks.updateRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "completed", keywordsChecked: 1 }),
    );
  });
});

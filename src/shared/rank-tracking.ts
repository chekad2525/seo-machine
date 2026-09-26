import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  SEO_DATA_COST_MARKUP,
  roundUsdForBilling,
} from "./billing";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";

// ---------------------------------------------------------------------------
// Cost constants
// ---------------------------------------------------------------------------

/** SerpApi Starter plan: $25 / 1,000 fresh Google searches. */
export const SERPAPI_SEARCH_COST_USD = 0.025;

/**
 * Kept for API compatibility with existing callers. SerpApi handles manual and
 * scheduled checks through the same endpoint and price model.
 */
type RankCheckMethod = "live" | "queued";

/** How many keywords are checked per batch */
export const KEYWORDS_PER_BATCH = 10;

/** Approximate seconds per batch */
export const SECONDS_PER_BATCH = 6;

/** Soft application limit for keywords per rank tracking config */
export const MAX_KEYWORDS_PER_CONFIG = 1000;

/** Maximum length of a single tracked keyword */
export const MAX_TRACKED_KEYWORD_LENGTH = 200;

/** Maximum configs (domain+location combos) per project */
export const MAX_CONFIGS_PER_PROJECT = 500;

/** Maximum queued rank-check tasks DataForSEO accepts in one task_post. */
export const MAX_TASKS_PER_POST = 100;

export const rankCheckCostApprovalError = (
  costCredits: number,
  maxCostCredits: number,
) => {
  return `The current rank check costs ${costCredits} credits, above the approved maximum of ${maxCostCredits}. Call estimate_rank_tracker_cost again and ask the user to approve the updated amount.`;
};

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

/** Worst-case SerpApi cost for a keyword/device pair at the given depth. */
function costPerSerpAtDepth(depth: number): number {
  return depthToPages(depth) * SERPAPI_SEARCH_COST_USD;
}

export function depthToPages(depth: number): number {
  return depth / 10;
}

export function pagesToDepth(pages: number): number {
  return pages * 10;
}

export function estimateRankCheckCredits(
  keywordCount: number,
  devices: RankTrackingConfig["devices"],
  depth: number,
  _method: RankCheckMethod,
) {
  const totalChecks = keywordCount * devicesCount(devices);
  let costUsd = 0;
  let costCredits = 0;

  // Each keyword/device pair is metered independently. This intentionally uses
  // the maximum pages for the configured depth; runtime stops when it finds the
  // domain or reaches the end of the result set.
  for (let offset = 0; offset < totalChecks; offset += 1) {
    const callCostUsd = roundUsdForBilling(
      costPerSerpAtDepth(depth) * SEO_DATA_COST_MARKUP,
    );
    costUsd += callCostUsd;
    costCredits += Math.ceil(callCostUsd * AUTUMN_SEO_DATA_CREDITS_PER_USD);
  }

  costUsd = roundUsdForBilling(costUsd);
  return { costUsd, costCredits };
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

type ScheduledRankTrackingInterval = Exclude<
  RankTrackingConfig["scheduleInterval"],
  "manual"
>;

// Values written to rank_tracking_configs.last_skip_reason (free-form text in
// the schema; this union keeps writers and UI comparisons in sync).
export type RankTrackingSkipReason =
  | "plan_required"
  | "no_keywords"
  | "insufficient_credits";

export function estimateScheduledRankCheckCredits(
  keywordCount: number,
  devices: RankTrackingConfig["devices"],
  depth: number,
  scheduleInterval: ScheduledRankTrackingInterval,
) {
  const { costUsd, costCredits } = estimateRankCheckCredits(
    keywordCount,
    devices,
    depth,
    "queued",
  );
  const checksPerMonth =
    scheduleInterval === "daily" ? 30 : scheduleInterval === "weekly" ? 4 : 1;
  return {
    scheduleInterval,
    costUsd,
    costCredits,
    checksPerMonth,
    monthlyCostUsd: costUsd * checksPerMonth,
    monthlyCostCredits: costCredits * checksPerMonth,
  };
}

export function isScheduledRankTrackingInterval(
  interval: RankTrackingConfig["scheduleInterval"],
): interval is ScheduledRankTrackingInterval {
  return interval !== "manual";
}

function endOfMonthWithTime(source: Date, monthOffset = 0): Date {
  const endOfMonth = new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth() + monthOffset + 1,
      0,
    ),
  );
  endOfMonth.setUTCHours(
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  );
  return endOfMonth;
}

/**
 * Compute the next check time for a scheduled config.
 *
 * If `previousNextCheckAt` is provided, advances from that anchor by the
 * interval until the result is in the future. This prevents schedule drift
 * when runs are delayed (e.g., a weekly config due Monday that fires on
 * Wednesday will still schedule the next check for the following Monday).
 *
 * Otherwise a random hour (04–09 UTC) and minute are chosen.
 */
export function computeNextCheckAt(
  interval: ScheduledRankTrackingInterval,
  previousNextCheckAt?: string | null,
): string {
  const now = Date.now();

  if (interval === "monthly") {
    if (previousNextCheckAt) {
      const anchor = new Date(previousNextCheckAt);
      let monthOffset = 1;
      let nextDate = endOfMonthWithTime(anchor, monthOffset);
      while (nextDate.getTime() <= now) {
        monthOffset += 1;
        nextDate = endOfMonthWithTime(anchor, monthOffset);
      }
      return nextDate.toISOString();
    }

    const hour = 4 + Math.floor(Math.random() * 6);
    const minute = Math.floor(Math.random() * 60);
    const nextDate = endOfMonthWithTime(new Date());
    nextDate.setUTCHours(hour, minute, 0, 0);
    if (nextDate.getTime() <= now) {
      const followingMonth = endOfMonthWithTime(nextDate, 1);
      followingMonth.setUTCHours(hour, minute, 0, 0);
      return followingMonth.toISOString();
    }
    return nextDate.toISOString();
  }

  const daysAhead = interval === "daily" ? 1 : 7;

  if (previousNextCheckAt) {
    const anchor = new Date(previousNextCheckAt).getTime();
    const intervalMs = daysAhead * 86_400_000;
    const steps = Math.floor(Math.max(0, now - anchor) / intervalMs) + 1;
    return new Date(anchor + steps * intervalMs).toISOString();
  }

  const nextDate = new Date();
  nextDate.setUTCDate(nextDate.getUTCDate() + daysAhead);
  const hour = 4 + Math.floor(Math.random() * 6);
  const minute = Math.floor(Math.random() * 60);
  nextDate.setUTCHours(hour, minute, 0, 0);
  return nextDate.toISOString();
}

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export function devicesLabel(devices: RankTrackingConfig["devices"]): string {
  if (devices === "both") return "Desktop + Mobile";
  return devices === "desktop" ? "Desktop" : "Mobile";
}

export function scheduleLabel(
  interval: RankTrackingConfig["scheduleInterval"],
): string {
  if (interval === "daily") return "Daily";
  if (interval === "weekly") return "Weekly";
  if (interval === "monthly") return "Monthly";
  return "Manual";
}

export function devicesCount(devices: RankTrackingConfig["devices"]): number {
  return devices === "both" ? 2 : 1;
}

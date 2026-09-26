import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { createSerpApiRankClient } from "./rank-tracking";

/**
 * Keep the existing provider client shape so rank-check persistence and batch
 * code remain stable, while routing the actual rank lookup to SerpApi.
 * DataForSEO remains available for keyword volume/difficulty enrichment.
 */
export function createRankTrackingClient(
  customer: BillingCustomerContext,
): ReturnType<typeof createDataforseoClient> {
  const base = createDataforseoClient(customer);
  const serpApi = createSerpApiRankClient(customer);
  return {
    ...base,
    serp: {
      ...base.serp,
      rankCheck: serpApi.rankCheck,
    },
  };
}

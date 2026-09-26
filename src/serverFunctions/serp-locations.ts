import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { searchSerpApiLocations } from "@/server/lib/serpapi/locations";

/** ISO 3166-1 alpha-2, e.g. "us". */
const countryCodeField = z.string().regex(/^[a-z]{2}$/i);

const searchSerpLocationsSchema = z.object({
  query: z.string().min(1).max(100),
  countryCode: countryCodeField,
});

export const searchSerpLocations = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(searchSerpLocationsSchema)
  .handler(async ({ data }) => {
    return searchSerpApiLocations(data);
  });

/**
 * Kept for the existing UI call site. SerpApi searches locations directly, so
 * there is no country catalog to warm.
 */
export const prewarmSerpLocations = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ countryCode: countryCodeField }))
  .handler(async () => ({ warmed: true }));

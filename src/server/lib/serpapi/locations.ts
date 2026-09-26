import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { formatLocationLabel } from "@/shared/keyword-locations";

const SERPAPI_LOCATIONS_URL = "https://serpapi.com/locations.json";
const INCLUDED_LOCATION_TYPES = new Set([
  "City",
  "County",
  "Municipality",
  "DMA Region",
  "Region",
]);

const locationSchema = z.object({
  google_id: z.number().int(),
  canonical_name: z.string().min(1),
  country_code: z.string().min(2),
  target_type: z.string().min(1),
});

const locationsSchema = z.array(locationSchema);

export interface SerpLocationResult {
  locationCode: number;
  locationName: string;
  locationType: string;
  displayLabel: string;
}

export async function searchSerpApiLocations(input: {
  query: string;
  countryCode: string;
}): Promise<SerpLocationResult[]> {
  const url = new URL(SERPAPI_LOCATIONS_URL);
  url.searchParams.set("q", input.query);
  url.searchParams.set("limit", "10");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "SerpApi locations request failed",
    );
  }
  if (!response.ok) {
    throw new AppError(
      response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_UNAVAILABLE",
      "SerpApi locations request failed with HTTP " + response.status,
    );
  }

  const parsed = locationsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "SerpApi returned invalid location data",
    );
  }

  const countryCode = input.countryCode.toUpperCase();
  return parsed.data
    .filter(
      (item) =>
        item.country_code.toUpperCase() === countryCode &&
        INCLUDED_LOCATION_TYPES.has(item.target_type),
    )
    .map((item) => ({
      locationCode: item.google_id,
      locationName: item.canonical_name,
      locationType: item.target_type,
      displayLabel: formatLocationLabel(item.canonical_name),
    }));
}

function normalizeLocationName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

export async function assertSerpApiLocationAccepted(input: {
  locationName: string;
  countryCode: string;
}): Promise<void> {
  const locations = await searchSerpApiLocations({
    query: input.locationName,
    countryCode: input.countryCode,
  });
  const expected = normalizeLocationName(input.locationName);
  if (
    !locations.some(
      (item) => normalizeLocationName(item.locationName) === expected,
    )
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "SerpApi does not recognize this location. Select a location from the search results.",
    );
  }
}

export type AnalyticsMetricRow = {
  date: Date;
  clicks: number;
  impressions: number;
  position: number;
};

export type AnalyticsTotals = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type DailyAnalytics = AnalyticsTotals & { date: string };

function summarize(rows: AnalyticsMetricRow[]): AnalyticsTotals {
  let clicks = 0;
  let impressions = 0;
  let weightedPosition = 0;

  for (const row of rows) {
    clicks += row.clicks;
    impressions += row.impressions;
    weightedPosition += row.position * row.impressions;
  }

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weightedPosition / impressions : 0,
  };
}

export function aggregateAnalytics(rows: AnalyticsMetricRow[]) {
  const grouped = new Map<string, AnalyticsMetricRow[]>();
  for (const row of rows) {
    const date = row.date.toISOString().slice(0, 10);
    const day = grouped.get(date) ?? [];
    day.push(row);
    grouped.set(date, day);
  }

  const daily: DailyAnalytics[] = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, day]) => ({ date, ...summarize(day) }));

  return { totals: summarize(rows), daily };
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}


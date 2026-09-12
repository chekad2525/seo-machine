export type KeywordMetric = { date: Date; query: string; clicks: number; impressions: number; position: number };
export type TrackedKeywordInput = { id: string; query: string; targetPage: string | null; createdAt: Date };

function weightedPosition(rows: KeywordMetric[]) {
  const visible = rows.filter((row) => row.impressions > 0 && row.position > 0);
  const impressions = visible.reduce((sum, row) => sum + row.impressions, 0);
  return impressions ? visible.reduce((sum, row) => sum + row.position * row.impressions, 0) / impressions : null;
}

export function buildKeywordTracking(tracked: TrackedKeywordInput[], metrics: KeywordMetric[], now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const currentStart = new Date(end); currentStart.setUTCDate(currentStart.getUTCDate() - 6);
  const previousStart = new Date(currentStart); previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  const previousEnd = new Date(currentStart); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);

  return tracked.map((item) => {
    const rows = metrics.filter((row) => row.query === item.query);
    const currentRows = rows.filter((row) => row.date >= currentStart && row.date <= end);
    const previousRows = rows.filter((row) => row.date >= previousStart && row.date <= previousEnd);
    const position = weightedPosition(currentRows);
    const previousPosition = weightedPosition(previousRows);
    const daily = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime()).map((row) => ({ date: row.date.toISOString().slice(0, 10), position: row.position || null }));
    return {
      ...item,
      position,
      change: position !== null && previousPosition !== null ? position - previousPosition : null,
      clicks: currentRows.reduce((sum, row) => sum + row.clicks, 0),
      impressions: currentRows.reduce((sum, row) => sum + row.impressions, 0),
      daily,
    };
  }).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
}

export function buildKeywordSuggestions(metrics: KeywordMetric[], excluded: Set<string>, limit = 8) {
  const grouped = new Map<string, { query: string; clicks: number; impressions: number; weighted: number }>();
  for (const row of metrics) {
    if (excluded.has(row.query)) continue;
    const value = grouped.get(row.query) ?? { query: row.query, clicks: 0, impressions: 0, weighted: 0 };
    value.clicks += row.clicks; value.impressions += row.impressions; value.weighted += row.position * row.impressions;
    grouped.set(row.query, value);
  }
  return [...grouped.values()].filter((row) => row.impressions >= 10).map((row) => ({ query: row.query, clicks: row.clicks, impressions: row.impressions, position: row.impressions ? row.weighted / row.impressions : null })).sort((a, b) => b.impressions - a.impressions).slice(0, limit);
}

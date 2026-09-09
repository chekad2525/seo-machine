type RawDimensionRow = {
  clicks: number;
  impressions: number;
  position: number;
};

type QueryRow = RawDimensionRow & { query: string };
type PageRow = RawDimensionRow & { page: string };
type OpportunityRow = RawDimensionRow & { query: string; page: string };

export type InsightMetric = {
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleRecommendation = {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  observation: string;
  action: string;
  dependency: string;
  failureCheck: string;
  leadingIndicator: string;
};

export type SelectedOpportunity = RawDimensionRow & {
  query: string;
  page: string;
  ctr: number;
  score: number;
  reason: 'low-ctr' | 'striking-distance';
};

function aggregate<T extends RawDimensionRow>(rows: T[], key: (row: T) => string): InsightMetric[] {
  const groups = new Map<string, Omit<InsightMetric, 'label' | 'ctr' | 'position'> & { weightedPosition: number }>();
  for (const row of rows) {
    const label = key(row);
    const current = groups.get(label) ?? { clicks: 0, impressions: 0, weightedPosition: 0 };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.position * row.impressions;
    groups.set(label, current);
  }
  return [...groups.entries()].map(([label, value]) => ({
    label,
    clicks: value.clicks,
    impressions: value.impressions,
    ctr: value.impressions ? value.clicks / value.impressions : 0,
    position: value.impressions ? value.weightedPosition / value.impressions : 0,
  }));
}

function ctrBenchmark(position: number) {
  if (position <= 3) return 0.1;
  if (position <= 5) return 0.06;
  if (position <= 10) return 0.035;
  if (position <= 15) return 0.02;
  return 0.01;
}

function selectOpportunities(rows: OpportunityRow[]): SelectedOpportunity[] {
  const pairs = new Map<string, OpportunityRow & { weightedPosition: number }>();
  for (const row of rows) {
    const key = `${row.query}\u0000${row.page}`;
    const current = pairs.get(key) ?? { ...row, clicks: 0, impressions: 0, weightedPosition: 0 };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.position * row.impressions;
    pairs.set(key, current);
  }
  const candidates = [...pairs.values()].map((row) => {
    const position = row.impressions ? row.weightedPosition / row.impressions : 0;
    const ctr = row.impressions ? row.clicks / row.impressions : 0;
    return { ...row, position, ctr };
  }).filter((row) => row.impressions >= 20 && row.position > 0 && row.position <= 20);
  const maxImpressions = Math.max(...candidates.map((row) => row.impressions), 1);
  const ranked = candidates.map((row) => {
    const benchmark = ctrBenchmark(row.position);
    const lowCtr = row.ctr < benchmark * 0.7;
    const strikingDistance = row.position >= 4 && row.position <= 15;
    const visibility = Math.log1p(row.impressions) / Math.log1p(maxImpressions) * 45;
    const positionValue = row.position <= 10 ? 35 : row.position <= 15 ? 27 : 12;
    const ctrGap = Math.min(20, Math.max(0, (benchmark - row.ctr) / benchmark * 20));
    return { query: row.query, page: row.page, clicks: row.clicks, impressions: row.impressions, position: row.position, ctr: row.ctr, score: Math.round(visibility + positionValue + ctrGap), reason: lowCtr ? 'low-ctr' as const : 'striking-distance' as const, eligible: lowCtr || strikingDistance };
  }).filter((row) => row.eligible).sort((a, b) => b.score - a.score || b.impressions - a.impressions);

  const pageCounts = new Map<string, number>();
  const selected: SelectedOpportunity[] = [];
  for (const row of ranked) {
    if ((pageCounts.get(row.page) ?? 0) >= 2) continue;
    selected.push(row);
    pageCounts.set(row.page, (pageCounts.get(row.page) ?? 0) + 1);
    if (selected.length === 8) break;
  }
  return selected;
}

export function buildSearchConsoleInsights(queryRows: QueryRow[], pageRows: PageRow[], opportunityRows: OpportunityRow[] = []) {
  const queries = aggregate(queryRows, (row) => row.query);
  const pages = aggregate(pageRows, (row) => row.page);
  const topQueries = [...queries].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15);
  const topPages = [...pages].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15);
  const selectedOpportunities = selectOpportunities(opportunityRows);
  const strikingDistance = selectedOpportunities.filter((row) => row.reason === 'striking-distance');
  const lowCtr = selectedOpportunities.filter((row) => row.reason === 'low-ctr');
  const selectedPages = new Set(selectedOpportunities.map((row) => row.page)).size;
  const selectedKeywords = new Set(selectedOpportunities.map((row) => row.query)).size;

  const recommendations: SearchConsoleRecommendation[] = [];
  if (lowCtr.length) {
    const impressions = lowCtr.reduce((sum, row) => sum + row.impressions, 0);
    recommendations.push({
      id: 'improve-serp-ctr', priority: 'high', title: 'عنوان و توضیحات نتایج کم‌کلیک را بازنویسی کنید',
      observation: `${lowCtr.length} عبارت در ده نتیجه اول، با ${impressions} نمایش، نرخ کلیک کمتر از ۲٪ دارند.`,
      action: 'از بالاترین عبارت شروع کنید؛ عنوان، توضیح متا و تطابق وعده صفحه با نیت جست‌وجو را اصلاح کنید.',
      dependency: 'قبل از تغییر، صفحه مقصد و اسنیپت فعلی هر عبارت را ثبت کنید.',
      failureCheck: 'اگر پس از ۲۸ روز نرخ کلیک بهتر نشد یا رتبه افت کرد، تغییر را بازبینی یا برگردانید.',
      leadingIndicator: 'افزایش CTR همان عبارت‌ها، بدون افت محسوس میانگین رتبه.',
    });
  }
  if (strikingDistance.length) {
    const impressions = strikingDistance.reduce((sum, row) => sum + row.impressions, 0);
    recommendations.push({
      id: 'striking-distance', priority: 'high', title: 'عبارت‌های نزدیک صفحه اول را تقویت کنید',
      observation: `${strikingDistance.length} عبارت با ${impressions} نمایش در رتبه‌های ۴ تا ۱۵ قرار دارند.`,
      action: 'محتوا را برای پاسخ دقیق‌تر به نیت جست‌وجو کامل کنید و از صفحات مرتبط، لینک داخلی توصیفی بدهید.',
      dependency: 'صفحه مقصد هر عبارت باید مشخص باشد؛ داده فعلی Query و Page را جداگانه نگه می‌دارد.',
      failureCheck: 'اگر نمایش یا رتبه طی ۲۸ روز افت کرد، تغییر محتوا و لینک‌های جدید را بررسی کنید.',
      leadingIndicator: 'حرکت میانگین رتبه به سمت ۳ نتیجه اول و افزایش کلیک.',
    });
  }
  if (selectedOpportunities.length) {
    recommendations.push({
      id: 'protect-winners', priority: 'medium', title: 'صفحات برنده را حفظ و توسعه دهید',
      observation: `${selectedPages} صفحه برای ${selectedKeywords} عبارت، امتیاز فرصت کافی برای بررسی عمیق گرفته‌اند.`,
      action: 'تازگی محتوا، لینک‌های داخلی، canonical و دسترس‌پذیری این صفحات را کنترل و موضوعات فرعی مرتبط را توسعه دهید.',
      dependency: 'ابتدا مطمئن شوید تغییرات، هدف و URL اصلی صفحه را عوض نمی‌کنند.',
      failureCheck: 'افت کلیک یا نمایش نسبت به دوره قبل، علامت توقف و بررسی تغییرات است.',
      leadingIndicator: 'ثبات کلیک صفحات اصلی و رشد نمایش صفحات مرتبط جدید.',
    });
  }

  return {
    counts: { queries: queries.length, pages: pages.length, selectedKeywords, selectedPages },
    topQueries,
    topPages,
    opportunities: { selected: selectedOpportunities, strikingDistance, lowCtr },
    recommendations,
    methodology: {
      rangeDays: 28,
      freshnessNote: 'داده‌های Search Console معمولاً ۲ تا ۳ روز تأخیر دارند.',
      limitation: 'فقط ۸ فرصت برتر نمایش داده می‌شود و از هر صفحه حداکثر دو عبارت انتخاب می‌شود؛ جمع‌های نمایشی ممکن است با Total بدون‌بُعد در GSC کمی تفاوت داشته باشند.',
    },
  };
}

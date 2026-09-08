type RawDimensionRow = {
  clicks: number;
  impressions: number;
  position: number;
};

type QueryRow = RawDimensionRow & { query: string };
type PageRow = RawDimensionRow & { page: string };

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

export function buildSearchConsoleInsights(queryRows: QueryRow[], pageRows: PageRow[]) {
  const queries = aggregate(queryRows, (row) => row.query);
  const pages = aggregate(pageRows, (row) => row.page);
  const topQueries = [...queries].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15);
  const topPages = [...pages].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15);
  const strikingDistance = queries
    .filter((row) => row.position >= 4 && row.position <= 15 && row.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
  const lowCtr = queries
    .filter((row) => row.position <= 10 && row.impressions >= 20 && row.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

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
  if (topPages.length) {
    recommendations.push({
      id: 'protect-winners', priority: 'medium', title: 'صفحات برنده را حفظ و توسعه دهید',
      observation: `${topPages.length} صفحه بیشترین کلیک بازه را ایجاد کرده‌اند؛ صفحه اول ${topPages[0]?.clicks ?? 0} کلیک داشته است.`,
      action: 'تازگی محتوا، لینک‌های داخلی، canonical و دسترس‌پذیری این صفحات را کنترل و موضوعات فرعی مرتبط را توسعه دهید.',
      dependency: 'ابتدا مطمئن شوید تغییرات، هدف و URL اصلی صفحه را عوض نمی‌کنند.',
      failureCheck: 'افت کلیک یا نمایش نسبت به دوره قبل، علامت توقف و بررسی تغییرات است.',
      leadingIndicator: 'ثبات کلیک صفحات اصلی و رشد نمایش صفحات مرتبط جدید.',
    });
  }

  return {
    counts: { queries: queries.length, pages: pages.length },
    topQueries,
    topPages,
    opportunities: { strikingDistance, lowCtr },
    recommendations,
    methodology: {
      rangeDays: 28,
      freshnessNote: 'داده‌های Search Console معمولاً ۲ تا ۳ روز تأخیر دارند.',
      limitation: 'به‌دلیل ذخیره جداگانه ابعاد Query و Page، نسبت‌دادن قطعی هر عبارت به یک صفحه انجام نمی‌شود؛ جمع‌های نمایشی نیز بر پایه ردیف‌های ذخیره‌شده‌اند و ممکن است با Total بدون‌بُعد در GSC کمی تفاوت داشته باشند.',
    },
  };
}

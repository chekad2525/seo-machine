type Totals = { clicks: number; impressions: number; ctr: number; position: number };
type Comparison = { clicksPercent: number | null; impressionsPercent: number | null; ctrPercent: number | null; positionDelta: number | null };
type DailyPoint = Totals & { date: string };

export type SearchPerformanceSummary = {
  range: { startDate: string; endDate: string };
  totals: Totals;
  comparison: Comparison;
  daily: DailyPoint[];
};

const faNumber = new Intl.NumberFormat('fa-IR');
const faDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

function changeLabel(value: number | null, reverse = false) {
  if (value === null) return { text: 'بدون دورهٔ مبنا', tone: 'neutral' };
  const improved = reverse ? value < 0 : value > 0;
  const declined = reverse ? value > 0 : value < 0;
  return {
    text: `${value > 0 ? '+' : ''}${faDecimal.format(value)}${reverse ? '' : '٪'}`,
    tone: improved ? 'positive' : declined ? 'negative' : 'neutral',
  };
}

export default function SearchPerformance({ summary }: { summary: SearchPerformanceSummary }) {
  const cards = [
    { label: 'کلیک', value: faNumber.format(summary.totals.clicks), change: changeLabel(summary.comparison.clicksPercent) },
    { label: 'نمایش', value: faNumber.format(summary.totals.impressions), change: changeLabel(summary.comparison.impressionsPercent) },
    { label: 'نرخ کلیک', value: `${faDecimal.format(summary.totals.ctr * 100)}٪`, change: changeLabel(summary.comparison.ctrPercent) },
    { label: 'میانگین رتبه', value: faDecimal.format(summary.totals.position), change: changeLabel(summary.comparison.positionDelta, true) },
  ];
  const maxClicks = Math.max(...summary.daily.map((point) => point.clicks), 1);
  const maxImpressions = Math.max(...summary.daily.map((point) => point.impressions), 1);
  const chartWidth = 760;
  const chartHeight = 180;
  const points = summary.daily.map((point, index) => {
    const x = summary.daily.length === 1 ? chartWidth / 2 : (index / (summary.daily.length - 1)) * chartWidth;
    const y = chartHeight - (point.clicks / maxClicks) * (chartHeight - 22) - 11;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const dateLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return <section className="search-performance" aria-labelledby="search-performance-title">
    <div className="performance-head">
      <div><p className="app-overline">عملکرد ارگانیک</p><h2 id="search-performance-title">نبض جست‌وجوی سایت</h2></div>
      <span>{dateLabel(summary.range.startDate)} تا {dateLabel(summary.range.endDate)}</span>
    </div>
    <div className="performance-kpis">
      {cards.map((card) => <article key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small className={card.change.tone}>{card.change.text} نسبت به دوره قبل</small></article>)}
    </div>
    <div className="performance-chart">
      <div className="chart-legend"><span><i className="clicks"/> کلیک</span><span><i className="impressions"/> نمایش (مقیاس نسبی)</span></div>
      {summary.daily.length ? <>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="نمودار روزانه کلیک و نمایش Search Console" preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="0" x2={chartWidth} y1={chartHeight * ratio} y2={chartHeight * ratio} className="chart-grid-line"/>)}
          {summary.daily.map((point, index) => {
            const slot = chartWidth / summary.daily.length;
            const height = (point.impressions / maxImpressions) * (chartHeight - 20);
            return <rect key={point.date} x={index * slot + slot * .18} y={chartHeight - height} width={Math.max(slot * .64, 2)} height={height} className="impression-bar"/>;
          })}
          <polyline points={points} className="click-line"/>
          {summary.daily.map((point, index) => {
            const x = summary.daily.length === 1 ? chartWidth / 2 : (index / (summary.daily.length - 1)) * chartWidth;
            const y = chartHeight - (point.clicks / maxClicks) * (chartHeight - 22) - 11;
            return <circle key={point.date} cx={x} cy={y} r="3.5" className="click-point"><title>{dateLabel(point.date)}: {faNumber.format(point.clicks)} کلیک</title></circle>;
          })}
        </svg>
        <div className="chart-axis"><span>{dateLabel(summary.daily[0].date)}</span><span>{dateLabel(summary.daily[Math.floor(summary.daily.length / 2)].date)}</span><span>{dateLabel(summary.daily[summary.daily.length - 1].date)}</span></div>
      </> : <div className="empty-chart"><b>هنوز داده‌ای برای این بازه ثبت نشده است.</b><span>پس از نخستین همگام‌سازی، روند روزانه در این بخش نمایش داده می‌شود.</span></div>}
    </div>
  </section>;
}


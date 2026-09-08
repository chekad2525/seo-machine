import Link from 'next/link';
import { auth } from '../../auth';
import { internalApiFetch } from '../../lib/internal-api';
import Brand from '../components/brand';
import SearchPerformance, { type SearchPerformanceSummary } from '../dashboard/search-performance';

type Metric = { label: string; clicks: number; impressions: number; ctr: number; position: number };
type Recommendation = {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  observation: string;
  action: string;
  dependency: string;
  failureCheck: string;
  leadingIndicator: string;
};
type Insights = {
  range: { startDate: string; endDate: string };
  counts: { queries: number; pages: number };
  topQueries: Metric[];
  topPages: Metric[];
  opportunities: { strikingDistance: Metric[]; lowCtr: Metric[] };
  recommendations: Recommendation[];
  methodology: { freshnessNote: string; limitation: string };
};

async function internalJson<T>(target: string, userId: string): Promise<T | null> {
  try {
    const response = await internalApiFetch(target, { userId });
    if (!response.ok) return null;
    const text = await response.text();
    return text.trim() ? JSON.parse(text) as T : null;
  } catch (error) {
    console.error('[analytics] request failed', error);
    return null;
  }
}

const faNumber = new Intl.NumberFormat('fa-IR');
const faDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

function MetricTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: Metric[] }) {
  return <section className="analysis-table-card">
    <div className="analysis-section-head"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{faNumber.format(rows.length)} مورد</span></div>
    {rows.length ? <div className="analysis-table-scroll"><table className="analysis-table">
      <thead><tr><th>عبارت / صفحه</th><th>کلیک</th><th>نمایش</th><th>CTR</th><th>رتبه</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label}>
        <td title={row.label}>{row.label}</td><td>{faNumber.format(row.clicks)}</td><td>{faNumber.format(row.impressions)}</td><td>{faDecimal.format(row.ctr * 100)}٪</td><td>{faDecimal.format(row.position)}</td>
      </tr>)}</tbody>
    </table></div> : <div className="analysis-empty">در این بازه موردی با معیار انتخاب‌شده پیدا نشد.</div>}
  </section>;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell app-guard" dir="rtl"><div className="app-guard-card"><Brand/><h1>برای دیدن تحلیل‌ها وارد شوید.</h1><Link className="app-submit" href="/sign-in">ورود به حساب</Link></div></main>;
  const onboarding = await internalJson<{ organizations?: Array<{ workspaces?: Array<{ projects?: Array<{ id: string; domain: string }> }> }> }>('/api/v1/onboarding', session.user.id);
  const project = onboarding?.organizations?.[0]?.workspaces?.[0]?.projects?.[0];
  const [summary, insights, latest] = project ? await Promise.all([
    internalJson<SearchPerformanceSummary>(`/api/v1/integrations/google-search-console/summary?projectId=${encodeURIComponent(project.id)}`, session.user.id),
    internalJson<Insights>(`/api/v1/integrations/google-search-console/insights?projectId=${encodeURIComponent(project.id)}`, session.user.id),
    internalJson<{ completedAt?: string | null; rowsUpserted?: number }>(`/api/v1/integrations/google-search-console/sync/latest?projectId=${encodeURIComponent(project.id)}`, session.user.id),
  ]) : [null, null, null];

  return <main className="dashboard-shell app-dashboard analysis-page" dir="rtl">
    <a className="skip-link" href="#analysis-content">پرش به محتوای تحلیل</a>
    <header className="app-product-header"><Brand/><nav className="dashboard-links" aria-label="ناوبری اصلی"><Link href="/dashboard">نمای کلی</Link><Link className="active" href="/analytics">تحلیل‌ها</Link><Link href="/dashboard#connection">اتصال‌ها</Link></nav><div className="app-user-chip"><span>{(session.user.name ?? session.user.email ?? 'ک').slice(0, 1)}</span><div><small>حساب فعال</small><b>{session.user.email ?? session.user.name}</b></div></div></header>
    <div className="formal-dashboard" id="analysis-content">
      <div className="analysis-hero"><div><p className="app-overline">مرکز تحلیل Search Console</p><h1>فرصت‌ها را از دل داده پیدا کنید.</h1><p>رتبه، نمایش و نرخ کلیک را به اقدام‌های قابل‌اندازه‌گیری تبدیل کنید.</p></div><div className="analysis-freshness"><span>آخرین همگام‌سازی</span><strong>{latest?.completedAt ? new Date(latest.completedAt).toLocaleString('fa-IR') : 'نامشخص'}</strong><small>{latest?.rowsUpserted ? `${faNumber.format(latest.rowsUpserted)} ردیف پردازش شده` : 'داده همگام‌سازی نشده است'}</small></div></div>

      {!project || !summary || !insights ? <section className="analysis-unavailable"><h2>داده تحلیل آماده نیست.</h2><p>ابتدا اتصال Search Console و همگام‌سازی داده‌ها را در داشبورد بررسی کنید.</p><Link className="app-submit inline" href="/dashboard">بازگشت به داشبورد</Link></section> : <>
        <div className="analysis-counts" aria-label="پوشش داده"><article><span>عبارت‌های یکتا</span><strong>{faNumber.format(insights.counts.queries)}</strong></article><article><span>صفحه‌های یکتا</span><strong>{faNumber.format(insights.counts.pages)}</strong></article><article><span>فرصت نزدیک صفحه اول</span><strong>{faNumber.format(insights.opportunities.strikingDistance.length)}</strong></article><article><span>فرصت بهبود CTR</span><strong>{faNumber.format(insights.opportunities.lowCtr.length)}</strong></article></div>
        <SearchPerformance summary={summary}/>
        <section className="recommendations" aria-labelledby="recommendations-title"><div className="analysis-section-head"><div><p className="app-overline">برنامه اقدام</p><h2 id="recommendations-title">پیشنهادهای اولویت‌دار</h2><p>هر پیشنهاد با شاهد، پیش‌نیاز و معیار موفقیت ارائه شده است.</p></div></div><div className="recommendation-grid">{insights.recommendations.map((item, index) => <article key={item.id} className={`recommendation-card priority-${item.priority}`}><div className="recommendation-title"><span>{faNumber.format(index + 1)}</span><div><small>{item.priority === 'high' ? 'اولویت بالا' : item.priority === 'medium' ? 'اولویت متوسط' : 'اولویت پایین'}</small><h3>{item.title}</h3></div></div><dl><div><dt>مشاهده</dt><dd>{item.observation}</dd></div><div><dt>اقدام</dt><dd>{item.action}</dd></div><div><dt>پیش‌نیاز</dt><dd>{item.dependency}</dd></div><div><dt>اگر جواب نداد</dt><dd>{item.failureCheck}</dd></div><div><dt>شاخص زودهنگام</dt><dd>{item.leadingIndicator}</dd></div></dl></article>)}</div></section>
        <div className="analysis-table-grid"><MetricTable title="فرصت‌های نزدیک صفحه اول" subtitle="عبارت‌های رتبه ۴ تا ۱۵ با حداقل ۲۰ نمایش" rows={insights.opportunities.strikingDistance}/><MetricTable title="نمایش بالا، کلیک پایین" subtitle="عبارت‌های ده نتیجه اول با CTR کمتر از ۲٪" rows={insights.opportunities.lowCtr}/></div>
        <div className="analysis-table-grid"><MetricTable title="عبارت‌های برتر" subtitle="مرتب‌شده بر اساس کلیک" rows={insights.topQueries}/><MetricTable title="صفحه‌های برتر" subtitle="مرتب‌شده بر اساس کلیک" rows={insights.topPages}/></div>
        <aside className="analysis-methodology"><strong>درباره داده</strong><p>{insights.methodology.freshnessNote}</p><p>{insights.methodology.limitation}</p></aside>
      </>}
    </div>
  </main>;
}

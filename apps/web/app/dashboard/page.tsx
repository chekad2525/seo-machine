import { auth } from '../../auth';
import Link from 'next/link';
import Brand from '../components/brand';
import ConnectSearchConsole from './connect-search-console';
import SyncSearchConsole from './sync-search-console';
import { internalApiFetch } from '../../lib/internal-api';
import SearchPerformance, { type SearchPerformanceSummary } from './search-performance';

const gscMessages: Record<string, string> = {
  'upstream-rejected': 'سرویس گوگل به‌جای پاسخ API، صفحهٔ خطا برگرداند. علت هنوز مشخص نیست؛ اتصال تأیید نشده است.',
  'permission-denied': 'گوگل اجازهٔ خواندن داده‌های Search Console را نداد. مجوز درخواست‌شده و دسترسی حساب انتخاب‌شده را بررسی کنید.',
  'authorization-expired': 'مجوز گوگل معتبر نیست یا منقضی شده است. اتصال را دوباره انجام دهید.',
  'offline-access-required': 'گوگل مجوز دریافت خودکار داده‌ها را برنگرداند. دوباره متصل شوید و دسترسی را تأیید کنید.',
  'network-blocked': 'ارتباط سرور با Google Search Console توسط IP یا شبکه مسدود شده است. VPN سراسری ویندوز یا پراکسی سرور را فعال کنید و دوباره تلاش کنید.',
  'property-not-found': 'این حساب گوگل به دامنهٔ پروژه در Search Console دسترسی ندارد. همان حسابی را انتخاب کنید که مالک یا کاربر کامل Property است.',
  'api-unavailable': 'دسترسی Search Console API در پروژهٔ Google Cloud آماده نیست. API را در همان پروژهٔ OAuth فعال کنید و دوباره تلاش کنید.',
  'google-unavailable': 'ارتباط موقت با گوگل برقرار نشد. چند لحظه دیگر دوباره تلاش کنید.',
  cancelled: 'فرایند اتصال در گوگل لغو شد و هیچ دسترسی‌ای ذخیره نشد.',
  'connection-failed': 'اتصال Search Console کامل نشد. دوباره تلاش کنید یا دسترسی حساب گوگل را بررسی کنید.',
};

async function internalJson<T>(target: string, userId: string): Promise<T | null> {
  try {
    const response = await internalApiFetch(target, { userId });
    if (!response.ok) {
      console.error(`[dashboard] ${target} returned HTTP ${response.status}`);
      return null;
    }
    const body = await response.text();
    if (!body.trim()) {
      console.error(`[dashboard] ${target} returned an empty response body`);
      return null;
    }
    try {
      return JSON.parse(body) as T;
    } catch {
      console.error(`[dashboard] ${target} returned invalid JSON`);
      return null;
    }
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[dashboard] ${target} failed: ${message}`);
    return null;
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ gsc?: string; reason?: string }> }) {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell app-guard" dir="rtl"><div className="app-guard-card"><Brand/><span className="app-guard-icon">↗</span><h1>این فضای کاری خصوصی است.</h1><p>برای مشاهده پروژه‌ها و داده‌های جست‌وجو وارد حساب خود شوید.</p><Link className="app-submit" href="/sign-in">ورود به حساب <span>←</span></Link></div></main>;
  const status = await internalJson<{ organizations?: Array<{ workspaces?: Array<{ projects?: Array<{ id: string; domain: string }> }> }> }>('/api/v1/onboarding', session.user.id);
  const project = status?.organizations?.[0]?.workspaces?.[0]?.projects?.[0];
  const connections = project ? await internalJson<Array<{ status: 'PENDING' | 'CONNECTED' | 'ERROR' }>>(`/api/v1/integrations/google-search-console/status?projectId=${encodeURIComponent(project.id)}`, session.user.id) ?? [] : [];
  const connected = connections.some((item) => item.status === 'CONNECTED');
  const latest = project && connected ? await internalJson<{ status?: 'RUNNING' | 'COMPLETED' | 'FAILED'; completedAt?: string | null }>(`/api/v1/integrations/google-search-console/sync/latest?projectId=${encodeURIComponent(project.id)}`, session.user.id) : null;
  const summary = project && connected ? await internalJson<SearchPerformanceSummary>(`/api/v1/integrations/google-search-console/summary?projectId=${encodeURIComponent(project.id)}`, session.user.id) : null;
  const gscLabel = connected ? latest?.status === 'RUNNING' ? 'در حال همگام‌سازی' : latest?.status === 'COMPLETED' ? 'آماده' : 'متصل' : 'در انتظار اتصال';
  const gscDescription = connected ? latest?.completedAt ? `آخرین دریافت داده: ${new Date(latest.completedAt).toLocaleDateString('fa-IR')}` : 'اتصال آماده اولین همگام‌سازی است.' : 'برای دریافت داده‌ها، دسترسی فقط‌خواندنی را تأیید کنید.';
  const query = await searchParams;
  const callbackMessage = query.gsc === 'error' ? gscMessages[query.reason ?? 'connection-failed'] ?? gscMessages['connection-failed'] : query.gsc === 'connected' ? 'اتصال Search Console با موفقیت انجام شد.' : null;
  return <main className="dashboard-shell app-dashboard" dir="rtl">
    <header className="app-product-header"><Brand/><nav className="dashboard-links"><a className="active" href="#overview">نمای کلی</a>{connected && <Link href="/analytics">تحلیل‌ها</Link>}<a href="#connection">اتصال‌ها</a></nav><div className="app-user-chip"><span>{(session.user.name??session.user.email??'ک').slice(0,1)}</span><div><small>حساب فعال</small><b>{session.user.email??session.user.name}</b></div></div></header>
    <section className="formal-dashboard" id="overview">
      {callbackMessage && <div className={`formal-callback-message ${query.gsc === 'connected' ? 'success' : 'error'}`} role="status">{callbackMessage}</div>}
      <div className="formal-dashboard-head"><div><p className="app-overline">داشبورد عملکرد جست‌وجو</p><h1>سلام؛ فضای کاری شما آماده است.</h1><p>وضعیت پروژه و اتصال Search Console را از همین صفحه مدیریت کنید.</p></div><span className="workspace-status"><i/> فضای کاری فعال</span></div>
      <div className="dashboard-stat-grid">
        <article><div className="stat-label"><span>پروژه‌ها</span><b>01</b></div><strong>{project?'۰۱':'۰۰'}</strong><p>{project?'یک سایت آماده تحلیل است.':'برای شروع، اولین پروژه را بسازید.'}</p></article>
        <article><div className="stat-label"><span>وضعیت سرچ کنسول</span><b>GSC</b></div><strong className="status-value">{gscLabel}</strong><p>{gscDescription}</p></article>
        <article className="stat-secure"><div className="stat-label"><span>سطح دسترسی</span><b>OAuth</b></div><strong>فقط‌خواندنی</strong><p>هیچ تغییری در سایت شما انجام نمی‌شود.</p></article>
      </div>
      {connected && summary && <SearchPerformance summary={summary}/>} 
      <div className="dashboard-main-grid" id="connection">
        <article className="dashboard-action-card"><div className="action-card-head"><span className="action-icon">↗</span><div><p>اقدام پیشنهادی</p><h2>لایه داده‌های جست‌وجو را فعال کنید.</h2></div></div><p>با اتصال Search Console، کلیک‌ها، نمایش‌ها و صفحه‌های در حال رشد را در یک نمای مشترک ببینید.</p><div className="dashboard-actions">{project?<><ConnectSearchConsole projectId={project.id} property={project.domain}/><SyncSearchConsole projectId={project.id} connected={connected}/></>:<Link className="app-submit inline" href="/onboarding">ساخت اولین پروژه <span>←</span></Link>}</div></article>
        <aside className="dashboard-readiness"><p className="app-overline">آمادگی سیستم</p><h3>مسیر شروع شما</h3><ul><li className="done"><span>✓</span><div><b>حساب کاربری</b><small>هویت شما تأیید شده است.</small></div></li><li className={project?'done':''}><span>{project?'✓':'۲'}</span><div><b>پروژه و دامنه</b><small>{project?project.domain:'هنوز ساخته نشده است.'}</small></div></li><li className={connected?'done':''}><span>{connected?'✓':'۳'}</span><div><b>اتصال Search Console</b><small>{connected?'اتصال برقرار است.':'در انتظار تأیید گوگل'}</small></div></li></ul></aside>
      </div>
    </section>
  </main>;
}

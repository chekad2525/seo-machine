import Link from 'next/link';
import { auth } from '../../auth';
import { internalApiFetch } from '../../lib/internal-api';
import AppHeader from '../components/app-header';
import Brand from '../components/brand';
import KeywordTracker, { type KeywordSuggestion, type TrackedKeyword } from './keyword-tracker';

async function internalJson<T>(target: string, userId: string): Promise<T | null> {
  try { const response = await internalApiFetch(target, { userId }); const text = await response.text(); return response.ok && text.trim() ? JSON.parse(text) as T : null; }
  catch (error) { console.error('[keywords] request failed', error); return null; }
}

export default async function KeywordsPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell app-guard" dir="rtl"><div className="app-guard-card"><Brand/><h1>برای رهگیری کلمات وارد شوید.</h1><Link className="app-submit" href="/sign-in">ورود به حساب</Link></div></main>;
  const onboarding = await internalJson<{ organizations?: Array<{ workspaces?: Array<{ projects?: Array<{ id: string; domain: string }> }> }> }>('/api/v1/onboarding', session.user.id);
  const project = onboarding?.organizations?.[0]?.workspaces?.[0]?.projects?.[0];
  const data = project ? await internalJson<{ range: { startDate: string; endDate: string }; freshnessNote: string; exactRankNote: string; keywords: TrackedKeyword[]; suggestions: KeywordSuggestion[] }>(`/api/v1/integrations/google-search-console/keyword-tracking?projectId=${encodeURIComponent(project.id)}`, session.user.id) : null;
  const identity = session.user.email ?? session.user.name;
  return <main className="dashboard-shell app-dashboard keyword-page" dir="rtl"><a className="skip-link" href="#keyword-content">پرش به رهگیری کلمات</a><AppHeader active="keywords" identity={identity} connected={Boolean(data)}/><div className="formal-dashboard" id="keyword-content"><section className="keyword-hero"><div><p className="app-overline">رادار عبارت‌های کلیدی</p><h1>حرکت رتبه‌ها را<br/><em>قبل از تبدیل‌شدن به روند</em> ببینید.</h1><p>کلمات مهم را جدا از هزاران عبارت Search Console دنبال کنید و تغییر هفتگی آن‌ها را بسنجید.</p></div><div className="keyword-radar" aria-hidden="true"><i/><i/><i/><span><b>{data?.keywords.length ?? 0}</b><small>کلمه زیر نظر</small></span></div></section>{!project || !data ? <section className="analysis-unavailable"><h2>داده رهگیری آماده نیست.</h2><p>ابتدا اتصال Search Console و همگام‌سازی داده‌ها را از داشبورد انجام دهید.</p><Link className="app-submit inline" href="/dashboard">بازگشت به داشبورد</Link></section> : <><div className="keyword-meta"><span>بازه داده: {new Date(data.range.startDate).toLocaleDateString('fa-IR')} تا {new Date(data.range.endDate).toLocaleDateString('fa-IR')}</span><span>{data.freshnessNote}</span></div><KeywordTracker projectId={project.id} initialKeywords={data.keywords} suggestions={data.suggestions} exactRankNote={data.exactRankNote}/></>}</div></main>;
}

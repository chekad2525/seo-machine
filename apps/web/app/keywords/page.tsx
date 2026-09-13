import Link from 'next/link';
import { auth } from '../../auth';
import { internalApiFetch } from '../../lib/internal-api';
import AppHeader from '../components/app-header';
import Brand from '../components/brand';
import KeywordTracker, { type TrackedKeyword, type TrackingSettings, type TrackingSummary } from './keyword-tracker';
import KeywordProjectSetup from './keyword-project-setup';

type InternalResult<T> = { data: T | null; error: string | null };

async function internalJson<T>(target: string, userId: string): Promise<InternalResult<T>> {
  try {
    const response = await internalApiFetch(target, { userId });
    const text = await response.text();
    if (!response.ok) {
      let message = `سرویس رهگیری با خطای ${response.status} پاسخ داد.`;
      try { message = (JSON.parse(text) as { message?: string }).message ?? message; } catch { /* keep safe status message */ }
      console.error(`[keywords] ${target} returned HTTP ${response.status}`);
      return { data: null, error: message };
    }
    if (!text.trim()) return { data: null, error: 'سرویس رهگیری پاسخ خالی برگرداند.' };
    return { data: JSON.parse(text) as T, error: null };
  } catch (error) {
    console.error('[keywords] request failed', error);
    return { data: null, error: 'ارتباط با API رهگیری برقرار نشد. تنظیمات و استقرار سرویس API را بررسی کنید.' };
  }
}

export default async function KeywordsPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell app-guard" dir="rtl"><div className="app-guard-card"><Brand/><h1>برای رهگیری کلمات وارد شوید.</h1><Link className="app-submit" href="/sign-in">ورود به حساب</Link></div></main>;
  const onboarding = await internalJson<{ organizations?: Array<{ workspaces?: Array<{ projects?: Array<{ id: string; domain: string }> }> }> }>('/api/v1/onboarding', session.user.id);
  const project = onboarding.data?.organizations?.flatMap((organization) => organization.workspaces ?? []).flatMap((workspace) => workspace.projects ?? [])[0];
  const report = project ? await internalJson<{ settings: TrackingSettings; capabilities: { mobile: boolean }; summary: TrackingSummary; exactRankNote: string; exactRankReady: boolean; keywords: TrackedKeyword[] }>(`/api/v1/keyword-tracking?projectId=${encodeURIComponent(project.id)}`, session.user.id) : { data: null, error: null };
  const data = report.data;
  const identity = session.user.email ?? session.user.name;
  return <main className="dashboard-shell app-dashboard keyword-page" dir="rtl"><a className="skip-link" href="#keyword-content">پرش به رهگیری کلمات</a><AppHeader active="keywords" identity={identity}/><div className="formal-dashboard" id="keyword-content"><section className="keyword-hero"><div><p className="app-overline">رادار عبارت‌های کلیدی</p><h1>حرکت رتبه‌ها را<br/><em>به تصمیم سئو تبدیل کنید.</em></h1><p>کلمات را با Excel، CSV یا ورود دستی اضافه کنید و جایگاه واقعی دامنه را در نتایج گوگل، همراه با اقدام بعدی هر عبارت ببینید.</p></div><div className="keyword-radar" aria-hidden="true"><i/><i/><i/><span><b>{data?.keywords.length ?? 0}</b><small>کلمه زیر نظر</small></span></div></section>{onboarding.error ? <section className="analysis-unavailable keyword-service-error"><p className="app-overline">خطای اتصال سرویس</p><h2>اطلاعات پروژه دریافت نشد.</h2><p>{onboarding.error}</p><Link className="app-submit inline" href="/keywords">تلاش دوباره <span>←</span></Link></section> : !project ? <section className="analysis-unavailable keyword-project-empty"><p className="app-overline">شروع رهگیری مستقل</p><h2>اولین پروژه رهگیری را بسازید.</h2><p>فقط نام پروژه و دامنه لازم است. اتصال Search Console برای این بخش ضروری نیست.</p><KeywordProjectSetup/></section> : report.error || !data ? <section className="analysis-unavailable keyword-service-error"><p className="app-overline">پروژه: {project.domain}</p><h2>گزارش رتبه دریافت نشد.</h2><p>{report.error ?? 'پاسخ گزارش قابل استفاده نبود.'}</p><Link className="app-submit inline" href="/keywords">تلاش دوباره <span>←</span></Link></section> : <KeywordTracker projectId={project.id} initialKeywords={data.keywords} settings={data.settings} capabilities={data.capabilities} summary={data.summary} exactRankNote={data.exactRankNote} exactRankReady={data.exactRankReady}/>}</div></main>;
}

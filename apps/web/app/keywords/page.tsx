import Link from 'next/link';
import { auth } from '../../auth';
import { internalApiFetch } from '../../lib/internal-api';
import AppHeader from '../components/app-header';
import Brand from '../components/brand';
import KeywordTracker, { type TrackedKeyword, type TrackingSettings, type TrackingSummary } from './keyword-tracker';

async function internalJson<T>(target: string, userId: string): Promise<T | null> {
  try { const response = await internalApiFetch(target, { userId }); const text = await response.text(); return response.ok && text.trim() ? JSON.parse(text) as T : null; }
  catch (error) { console.error('[keywords] request failed', error); return null; }
}

export default async function KeywordsPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell app-guard" dir="rtl"><div className="app-guard-card"><Brand/><h1>برای رهگیری کلمات وارد شوید.</h1><Link className="app-submit" href="/sign-in">ورود به حساب</Link></div></main>;
  const onboarding = await internalJson<{ organizations?: Array<{ workspaces?: Array<{ projects?: Array<{ id: string; domain: string }> }> }> }>('/api/v1/onboarding', session.user.id);
  const project = onboarding?.organizations?.[0]?.workspaces?.[0]?.projects?.[0];
  const data = project ? await internalJson<{ settings: TrackingSettings; capabilities: { mobile: boolean }; summary: TrackingSummary; exactRankNote: string; exactRankReady: boolean; keywords: TrackedKeyword[] }>(`/api/v1/keyword-tracking?projectId=${encodeURIComponent(project.id)}`, session.user.id) : null;
  const identity = session.user.email ?? session.user.name;
  return <main className="dashboard-shell app-dashboard keyword-page" dir="rtl"><a className="skip-link" href="#keyword-content">پرش به رهگیری کلمات</a><AppHeader active="keywords" identity={identity}/><div className="formal-dashboard" id="keyword-content"><section className="keyword-hero"><div><p className="app-overline">رادار عبارت‌های کلیدی</p><h1>حرکت رتبه‌ها را<br/><em>به تصمیم سئو تبدیل کنید.</em></h1><p>کلمات را با Excel، CSV یا ورود دستی اضافه کنید و جایگاه واقعی دامنه را در نتایج گوگل، همراه با اقدام بعدی هر عبارت ببینید.</p></div><div className="keyword-radar" aria-hidden="true"><i/><i/><i/><span><b>{data?.keywords.length ?? 0}</b><small>کلمه زیر نظر</small></span></div></section>{!project || !data ? <section className="analysis-unavailable"><h2>پروژه رهگیری آماده نیست.</h2><p>ابتدا یک پروژه و دامنه بسازید. رهگیری رتبه به Search Console وابسته نیست.</p><Link className="app-submit inline" href="/dashboard">بازگشت به داشبورد</Link></section> : <KeywordTracker projectId={project.id} initialKeywords={data.keywords} settings={data.settings} capabilities={data.capabilities} summary={data.summary} exactRankNote={data.exactRankNote} exactRankReady={data.exactRankReady}/>}</div></main>;
}

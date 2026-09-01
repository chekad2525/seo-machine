import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Brand from '../components/brand';
import OnboardingForm from './onboarding-form';
import { internalApiFetch } from '../../lib/internal-api';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell app-guard" dir="rtl"><div className="app-guard-card"><Brand /><span className="app-guard-icon">↗</span><h1>برای ساخت فضای کاری وارد شوید.</h1><p>سازمان‌ها و پروژه‌ها باید به یک حساب تأییدشده در SEO Machine متصل باشند.</p><Link className="app-submit" href="/sign-in">ورود به حساب <span>←</span></Link></div></main>;
  const statusResponse = await internalApiFetch('/api/v1/onboarding', { userId: session.user.id });
  if (statusResponse.ok) {
    const status = await statusResponse.json() as { completed?: boolean };
    if (status.completed) redirect('/dashboard');
  }
  return <main className="setup-shell app-setup" dir="rtl">
    <header className="app-product-header"><Brand /><div className="app-user-chip"><span>{(session.user.name ?? session.user.email ?? 'ک').slice(0,1)}</span><div><small>حساب فعال</small><b>{session.user.email ?? session.user.name}</b></div></div></header>
    <div className="app-setup-layout">
      <aside className="app-setup-aside"><p className="app-overline">راه‌اندازی اولیه</p><h1>ساختار کار را یک‌بار درست بسازید.</h1><p>سازمان، فضای کاری و اولین پروژه شما پایهٔ گزارش‌ها و دسترسی‌های بعدی خواهند بود.</p><div className="setup-assurance"><b>اتصال امن و مرحله‌ای</b><span>اطلاعات شما بعد از تکمیل هر چهار مرحله ثبت می‌شود.</span></div></aside>
      <section className="app-setup-panel" aria-label="فرم راه‌اندازی فضای کاری"><OnboardingForm /></section>
    </div>
  </main>;
}

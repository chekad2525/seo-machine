import { auth, signIn } from '../../auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Brand from '../components/brand';
import PhoneSignIn from './phone-sign-in';
import { privatePageMetadata } from '../../lib/seo';

export const metadata = privatePageMetadata('ورود امن به حساب', 'ورود امن به فضای کاری خصوصی SEO Machine با حساب گوگل یا شماره موبایل تأییدشده.', true);

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect('/onboarding');

  return <main className="auth-shell app-auth" dir="rtl">
    <header className="app-auth-header"><Brand /><Link className="app-back" href="/">بازگشت به صفحه اصلی <span>←</span></Link></header>
    <section className="app-auth-layout">
      <aside className="app-auth-aside">
        <p className="app-overline">ورود امن به فضای کاری</p>
        <h1>داده‌های جست‌وجوی شما، در یک فضای منظم.</h1>
        <p>به پروژه‌ها، گزارش‌های Search Console و فرصت‌های رشد سایت دسترسی پیدا کنید.</p>
        <ul><li><span>✓</span> اتصال رسمی و امن حساب گوگل</li><li><span>✓</span> دسترسی فقط‌خواندنی به داده‌ها</li><li><span>✓</span> تفکیک کامل فضای هر سازمان</li></ul>
      </aside>
      <div className="app-auth-card">
        <div className="app-card-heading"><span className="app-lock" aria-hidden="true">✓</span><div><p>خوش آمدید</p><h2>وارد حساب خود شوید</h2></div></div>
        <p className="app-card-lede">برای ادامه، روش ورود امن خود را انتخاب کنید.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/onboarding' }); }}>
          <button className="app-google-button" type="submit"><span className="google-g" aria-hidden="true">G</span> ادامه با حساب گوگل <b>←</b></button>
        </form>
        <div className="app-divider"><span>یا ورود با شماره موبایل</span></div>
        <PhoneSignIn />
        <p className="app-privacy">با ورود به SEO Machine، اطلاعات شما فقط برای ارائه خدمات این فضای کاری پردازش می‌شود.</p>
      </div>
    </section>
  </main>;
}

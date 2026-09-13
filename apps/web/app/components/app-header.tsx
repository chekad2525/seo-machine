import Link from 'next/link';
import Brand from './brand';

type ActivePage = 'dashboard' | 'analytics' | 'keywords';

export default function AppHeader({ active, identity, connected = false }: { active: ActivePage; identity?: string | null; connected?: boolean }) {
  return <header className="app-product-header app-command-header">
    <Brand/>
    <nav className="dashboard-links" aria-label="ناوبری اصلی">
      <Link className={active === 'dashboard' ? 'active' : ''} href="/dashboard">نمای کلی</Link>
      <Link className={active === 'analytics' ? 'active' : ''} href="/analytics">تحلیل سرچ کنسول</Link>
      <Link className={active === 'keywords' ? 'active' : ''} href="/keywords">رهگیری کلمات</Link>
    </nav>
    <div className="header-tools">
      <details className="mega-menu">
        <summary aria-label="بازکردن منوی ابزارها"><span className="mega-grid-icon" aria-hidden="true">••<br/>••</span><b>مرکز فرمان</b><i>⌄</i></summary>
        <div className="mega-panel">
          <div className="mega-intro"><span>SEO MACHINE / COMMAND</span><h2>از سیگنال جست‌وجو<br/>به تصمیم برسید.</h2><p>ابزارهای روزانه پایش، تحلیل و اقدام در یک مسیر.</p><div className={active === 'keywords' || connected ? 'mega-health ready' : 'mega-health'}><i/>{active === 'keywords' ? 'رهگیری رتبه مستقل از Search Console' : connected ? 'داده‌های Search Console متصل است' : 'اتصال Search Console نیاز به بررسی دارد'}</div></div>
          <div className="mega-groups">
            <section><p>رصد و اندازه‌گیری</p><Link href="/dashboard"><span>۰۱</span><div><b>نمای کلی</b><small>نبض پروژه و آخرین همگام‌سازی</small></div><i>←</i></Link><Link href="/keywords"><span>۰۲</span><div><b>رهگیری کلمات کلیدی</b><small>روند رتبه و تغییرات هفتگی</small></div><i>←</i></Link></section>
            <section><p>تحلیل و اقدام</p><Link href="/analytics"><span>۰۳</span><div><b>تحلیل سرچ کنسول</b><small>صفحات و عبارت‌های ثبت‌شده در GSC</small></div><i>←</i></Link><Link href="/dashboard#connection"><span>۰۴</span><div><b>اتصال و دریافت داده</b><small>مدیریت GSC و همگام‌سازی</small></div><i>←</i></Link></section>
          </div>
          <div className="mega-foot"><span>{active === 'keywords' ? 'رتبه‌ها مستقیماً از ارائه‌دهنده SERP گوگل ثبت می‌شوند' : 'داده‌های تحلیلی Search Console معمولاً ۲–۳ روز تأخیر دارند'}</span><Link href="/keywords">بازکردن رهگیر <b>←</b></Link></div>
        </div>
      </details>
      <div className="app-user-chip"><span>{(identity ?? 'ک').slice(0, 1)}</span><div><small>حساب فعال</small><b>{identity}</b></div></div>
    </div>
  </header>;
}

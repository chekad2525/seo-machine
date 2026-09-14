import Link from 'next/link';
import type { Metadata } from 'next';
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, siteUrl } from '../lib/seo';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/', languages: { 'fa-IR': '/' } },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: '/',
    siteName: SITE_NAME,
    title: `${HOME_TITLE} | ${SITE_NAME}`,
    description: HOME_DESCRIPTION,
  },
  twitter: { card: 'summary', title: `${HOME_TITLE} | ${SITE_NAME}`, description: HOME_DESCRIPTION },
};

const features = [
  ['داده','تصمیم‌گیری با داده واقعی','کلیک، نمایش، جایگاه و نرخ کلیک را مستقیماً از Google Search Console دریافت کنید؛ بدون فایل‌های پراکنده و گزارش‌های دستی.'],
  ['تمرکز','فرصت‌ها را زودتر ببینید','صفحه‌ها و عبارت‌هایی را که ظرفیت رشد دارند پیدا کنید و بدانید بهینه‌سازی بعدی باید از کجا شروع شود.'],
  ['ساختار','چند سایت، یک فضای منظم','سازمان، فضای کاری و پروژه‌های مختلف را جدا نگه دارید و هر سایت را با دسترسی مشخص مدیریت کنید.'],
];
const steps = [
  ['۱','حساب خود را بسازید','با حساب گوگل یا شماره موبایل وارد شوید و فضای کاری اختصاصی خود را ایجاد کنید.'],
  ['۲','سایت را متصل کنید','دسترسی فقط‌خواندنی Search Console را تأیید کنید؛ SEO Machine اجازه تغییر در سایت شما ندارد.'],
  ['۳','سیگنال‌های رشد را دنبال کنید','داده‌ها را همگام کنید و روند عملکرد هر پروژه را در یک داشبورد روشن ببینید.'],
];

export default function HomePage() {
  const origin = siteUrl().toString();
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${origin}#organization`, name: SITE_NAME, url: origin },
      { '@type': 'WebSite', '@id': `${origin}#website`, name: SITE_NAME, url: origin, inLanguage: 'fa-IR', description: HOME_DESCRIPTION, publisher: { '@id': `${origin}#organization` } },
      { '@type': 'WebPage', '@id': `${origin}#webpage`, name: `${HOME_TITLE} | ${SITE_NAME}`, url: origin, inLanguage: 'fa-IR', description: HOME_DESCRIPTION, isPartOf: { '@id': `${origin}#website` }, about: { '@id': `${origin}#organization` } },
    ],
  };

  return <main className="fa-home" dir="rtl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <header className="fa-header">
      <Link className="fa-logo" href="/" aria-label="صفحه اصلی SEO Machine"><Logo /><span><b>SEO</b> Machine<small>ماشین رشد جست‌وجو</small></span></Link>
      <nav className="fa-nav" aria-label="منوی اصلی"><a href="#features">امکانات</a><a href="#workflow">نحوه کار</a><a href="#security">امنیت</a></nav>
      <div className="fa-header-actions"><Link className="fa-login" href="/sign-in">ورود</Link><Link className="fa-button fa-button-small" href="/sign-in">ساخت حساب <span>←</span></Link></div>
    </header>

    <section className="fa-hero">
      <div className="fa-hero-copy">
        <p className="fa-kicker"><span /> مرکز فرماندهی سئوی شما</p>
        <h1>تحلیل سرچ کنسول؛<br />از داده‌ها <em>تصمیم روشن</em> بسازید.</h1>
        <p className="fa-hero-lede">SEO Machine داده‌های Search Console را به یک مسیر کاری قابل‌فهم تبدیل می‌کند؛ تا به‌جای جابه‌جایی بین گزارش‌ها، فرصت‌های واقعی رشد سایت را پیدا کنید و با تمرکز جلو بروید.</p>
        <div className="fa-hero-actions"><Link className="fa-button" href="/sign-in">ساخت فضای کاری <span>←</span></Link><a className="fa-text-link" href="#workflow">ببینید چگونه کار می‌کند <span>↓</span></a></div>
        <div className="fa-trust-row"><span>دسترسی فقط‌خواندنی</span><span>اتصال امن گوگل</span><span>مناسب چند پروژه</span></div>
      </div>
      <DashboardPreview />
    </section>

    <section className="fa-proof"><p>برای تیم‌هایی که می‌خواهند سئو را <strong>منظم، قابل‌اندازه‌گیری و پیوسته</strong> پیش ببرند.</p><div><span>یک منبع داده معتبر</span><span>اولویت‌بندی واضح</span><span>گزارش بدون آشفتگی</span></div></section>

    <section className="fa-section" id="features">
      <div className="fa-section-heading"><p>چرا SEO Machine؟</p><h2>همه‌چیز برای دیدن<br />قدم بعدی.</h2><span>ابزار بیشتر همیشه به معنی نتیجه بهتر نیست. اینجا فقط اطلاعاتی را می‌بینید که برای تصمیم بعدی لازم دارید.</span></div>
      <div className="fa-feature-grid">{features.map(([tag,title,text],i)=><article className="fa-feature" key={title}><div className="fa-feature-top"><span>{tag}</span><b>{['۰۱','۰۲','۰۳'][i]}</b></div><FeatureIcon index={i}/><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="fa-workflow" id="workflow">
      <div className="fa-workflow-intro"><p>شروع بدون پیچیدگی</p><h2>از اتصال تا اولین بینش، در سه قدم.</h2><div className="fa-workflow-line" /></div>
      <div className="fa-steps">{steps.map(([n,title,text])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </section>

    <section className="fa-seo-explainer" aria-labelledby="seo-machine-definition">
      <div className="fa-section-heading">
        <p>پاسخ روشن، پیش از گزارش</p>
        <h2 id="seo-machine-definition">SEO Machine چیست؟</h2>
        <span>یک فضای کاری فارسی برای تبدیل داده‌های جست‌وجو به تصمیم‌های مشخص، قابل‌اندازه‌گیری و قابل‌پیگیری.</span>
      </div>
      <div className="fa-explainer-grid">
        <article><h3>چه داده‌هایی تحلیل می‌شوند؟</h3><p>SEO Machine کلیک، نمایش، نرخ کلیک و میانگین جایگاه را از اتصال فقط‌خواندنی Google Search Console دریافت می‌کند. رهگیر کلمات نیز جایگاه دامنه را با کشور، زبان، موقعیت و دستگاه ثابت بررسی می‌کند تا تغییر رتبه‌ها با شرایط یکسان مقایسه شوند.</p></article>
        <article><h3>چطور فرصت سئو پیدا می‌شود؟</h3><p>عبارت‌های نزدیک صفحه اول، صفحه‌های دارای نمایش بالا و نرخ کلیک پایین، و تغییرات رتبه به فرصت‌های قابل اقدام تبدیل می‌شوند. هر پیشنهاد همراه با مشاهده، پیش‌نیاز، شاخص زودهنگام و معیار شکست ارائه می‌شود تا نتیجه فقط یک فهرست توصیه عمومی نباشد.</p></article>
        <article><h3>داده‌های سایت چطور محافظت می‌شوند؟</h3><p>اتصال Search Console از OAuth رسمی گوگل و دسترسی فقط‌خواندنی استفاده می‌کند. توکن‌ها به‌صورت رمزگذاری‌شده نگهداری می‌شوند و داده‌های هر سازمان و پروژه از فضای دیگر کاربران جدا می‌مانند؛ SEO Machine اجازه تغییر مستقیم محتوای سایت را دریافت نمی‌کند.</p></article>
      </div>
    </section>

    <section className="fa-security" id="security"><div className="fa-security-mark" aria-hidden="true"><span>✓</span></div><div><p>امنیت از ابتدا، نه در انتها</p><h2>داده‌های شما فقط برای تحلیل خوانده می‌شوند.</h2></div><ul><li>اتصال رسمی OAuth گوگل</li><li>دسترسی فقط‌خواندنی Search Console</li><li>نگهداری رمزگذاری‌شده توکن‌ها</li><li>تفکیک داده‌های سازمان‌ها و پروژه‌ها</li></ul></section>

    <section className="fa-final-cta"><p>آماده‌اید سئو را منظم‌تر پیش ببرید؟</p><h2>اولین پروژه‌تان را بسازید<br />و سیگنال‌های رشد را ببینید.</h2><Link className="fa-button fa-button-light" href="/sign-in">شروع با SEO Machine <span>←</span></Link></section>
    <footer className="fa-footer"><div className="fa-footer-brand"><Logo /><div><b>SEO Machine</b><p>فضای کاری هوشمند برای رشد جست‌وجوی ارگانیک</p></div></div><div className="fa-footer-links"><a href="#features">امکانات</a><a href="#workflow">نحوه کار</a><a href="#security">امنیت</a><Link href="/sign-in">ورود به حساب</Link></div><div className="fa-footer-bottom"><span>© ۱۴۰۵ SEO Machine</span><span>ساخته‌شده برای وب فارسی</span></div></footer>
  </main>;
}

function Logo(){return <span className="fa-logo-mark" aria-hidden="true"><i/><i/><i/></span>}
function FeatureIcon({index}:{index:number}){return <div className={`fa-feature-icon icon-${index+1}`} aria-hidden="true"><i/><i/><i/></div>}
function DashboardPreview(){return <div className="fa-command-wrap" aria-label="نمونه نمایشی داشبورد عملکرد جست‌وجو"><div className="fa-orbit one"/><div className="fa-orbit two"/><div className="fa-command"><div className="fa-command-head"><span><i/> نمونه نمایشی</span><b>۲۸ روز اخیر</b></div><div className="fa-command-title"><p>نمای کلی جست‌وجوی ارگانیک</p><span>داده‌های نمونه</span></div><div className="fa-metric-row"><div><small>کلیک‌ها</small><strong>۱۲,۸۴۰</strong><em>٪۲۸٫۴ ↑</em></div><div><small>نمایش‌ها</small><strong>۳۴۱K</strong><em>٪۱۸٫۲ ↑</em></div><div><small>میانگین جایگاه</small><strong>۸٫۶</strong><em>۱٫۳ ↑</em></div></div><div className="fa-chart" aria-hidden="true">{Array.from({length:12},(_,i)=><span key={i}/>)}<svg viewBox="0 0 600 150" preserveAspectRatio="none"><path d="M0 125 C55 130 62 90 112 105 S175 120 205 80 S270 95 305 58 S365 76 400 48 S466 65 495 30 S555 38 600 8"/></svg></div><div className="fa-query"><span>فرصت نمونه</span><p>۳۴ عبارت در آستانه صفحه اول قرار دارند.</p><b>مشاهده ←</b></div></div><div className="fa-floating-note"><span>سیگنال نمونه</span><strong>«خدمات سئو»</strong><small>رشد نمایش در ۷ روز اخیر</small></div></div>}

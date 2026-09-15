# برنامه اقدام SEO پس از انتشار

## P0 — قبل از انتشار

1. `APP_ORIGIN`، `NEXTAUTH_URL` و `AUTH_URL` را روی دامنه نهایی با HTTPS تنظیم کنید.
2. صفحه اصلی، `robots.txt`، `sitemap.xml` و `llms.txt` را روی دامنه نهایی بازبینی کنید و مطمئن شوید هیچ canonical به `localhost` اشاره نمی‌کند.
3. schema صفحه اصلی را با Rich Results Test یا Schema Markup Validator اعتبارسنجی کنید.

## P1 — هفته اول انتشار

1. دامنه را در Google Search Console تأیید و sitemap را ارسال کنید.
2. با URL Inspection صفحه اصلی را برای canonical، دسترسی crawl و وضعیت index بررسی کنید.
3. Lighthouse موبایل و PageSpeed Insights را روی صفحه اصلی اجرا کنید؛ LCP، INP و CLS را به‌عنوان baseline ثبت کنید.
4. وضعیت `noindex` مسیرهای ورود، onboarding، dashboard، analytics و keywords را از پاسخ production تأیید کنید.

## P2 — پس از دریافت داده واقعی

1. queryها و صفحات ورودی را بر اساس impressions، clicks، CTR و average position تحلیل کنید.
2. محتوای عمومی جدید را فقط برای تقاضای جست‌وجویی اثبات‌شده ایجاد کنید؛ صفحه‌های thin یا برنامه‌ای بدون ارزش مستقل نسازید.
3. صفحات اعتماد و حقوقی را با اطلاعات واقعی کسب‌وکار منتشر کنید و سپس Organization schema را با داده‌های قابل تأیید توسعه دهید.
4. امتیاز ممیزی را با داده‌های میدانی Core Web Vitals و Search Console به‌روزرسانی کنید.

## معیار پذیرش

- canonicalها فقط به دامنه نهایی HTTPS اشاره کنند.
- sitemap تنها URLهای عمومی، ۲۰۰ و قابل‌ایندکس را فهرست کند.
- مسیرهای خصوصی در نتایج جست‌وجو ظاهر نشوند.
- schema هیچ قیمت، امتیاز، شبکه اجتماعی یا مشخصه تأییدنشده‌ای نداشته باشد.
- صفحه اصلی در موبایل CWV را در سطح Good پاس کند یا برای هر معیار ناموفق issue مشخص ثبت شود.


# دریافت مشخصات اتصال Google برای SEO Machine

## اجرای محلی با فایل دانلودشده (Node.js 22 یا جدیدتر)

فایل محرمانه را در چت یا GitHub ارسال نکنید. دستور زیر فایل را محلی می‌خواند، هر دو callback را بررسی می‌کند و `.env` نادیده‌گرفته‌شده توسط Git را با کلیدهای تصادفی داخلی می‌سازد. اگر `.env` موجود باشد، آن را تغییر نمی‌دهد:

```powershell
node scripts/setup-local-google.mjs "C:\path\to\client_secret.json"
```

پس از روشن شدن Docker Desktop، از ریشه پروژه اجرا کنید:

```powershell
docker compose up -d postgres
node scripts/local.mjs migrate
node scripts/local.mjs dev
```

اجراکننده محلی `.env` را به هر دو برنامه و ابزار مهاجرت می‌رساند. برای ورود، `http://localhost:3000/sign-in` را باز کنید؛ callback را مستقیم باز نکنید. این تنظیمات فقط توسعه محلی است؛ پیامک آزمایشی روشن و همگام‌سازی خودکار خاموش است. فایل `.env` و JSON را از هر بستهٔ دانلودی و مخزن خارج نگه دارید.

برای ورود با گوگل و اتصال Search Console به OAuth Client نیاز دارید؛ API Key ساده کافی نیست. Client Secret را در چت، GitHub، کد مرورگر یا فایل عمومی قرار ندهید.

۱. وارد [Google Cloud Console](https://console.cloud.google.com/) شوید و یک پروژه بسازید یا پروژه‌ی موجود را انتخاب کنید.

۲. در APIs & Services → Library، سرویس **Google Search Console API** را جست‌وجو و فعال کنید.

۳. صفحه‌ی رضایت را در Google Auth Platform / OAuth consent screen تنظیم کنید: نام برنامه، ایمیل پشتیبانی، مخاطبان و اطلاعات تماس. هنگام تست، حساب گوگل خودتان را به Test users اضافه کنید. حساب باید به سایتی که می‌خواهید متصل کنید در Search Console دسترسی داشته باشد.

۴. از بخش Clients / Credentials یک **OAuth client ID** با نوع **Web application** بسازید. برای اجرای محلی هر دو Authorized redirect URI زیر را دقیق وارد کنید:

```text
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/v1/integrations/google-search-console/callback
```

آدرس اول برای ورود به برنامه است؛ آدرس دوم برای اجازه‌ی خواندن Search Console. اگر Authorized JavaScript origins خواسته شد، `http://localhost:3000` را وارد کنید.

۵. Client ID و Client Secret را فقط در تنظیمات سرور ذخیره کنید. برای این پروژه می‌توان همان OAuth Client را در هر دو اتصال استفاده کرد:

```dotenv
AUTH_GOOGLE_ID=YOUR_CLIENT_ID
AUTH_GOOGLE_SECRET=YOUR_CLIENT_SECRET
GSC_CLIENT_ID=YOUR_CLIENT_ID
GSC_CLIENT_SECRET=YOUR_CLIENT_SECRET
GSC_REDIRECT_URI=http://localhost:3001/api/v1/integrations/google-search-console/callback
APP_ORIGIN=http://localhost:3000
```

۶. دامنه را در Search Console ثبت و تأیید کنید. سپس در SEO Machine با گوگل وارد شوید، پروژه را بسازید و Connect Search Console را بزنید. داده‌ها پس از تأیید دسترسی از دکمه‌ی Sync دریافت می‌شوند. این نسخه برای اتصال پیش‌فرض داشبورد از property نوع `sc-domain:example.com` استفاده می‌کند.

برای سرور واقعی، آدرس‌های بالا را با HTTPS و دامنه‌ی واقعی جایگزین کنید و همان مقدار را در Google و تنظیمات برنامه وارد کنید. فقط مسیر callback لازم است از بیرون به API برسد؛ باقی API را پشت شبکه‌ی داخلی نگه دارید. انتشار عمومی برنامه‌ی OAuth ممکن است به تأیید Google نیاز داشته باشد.

`INTERNAL_API_SECRET` را از Google دریافت نمی‌کنید: این کلید مشترک بین وب و API خود پروژه است و باید محلی و تصادفی تولید شود. `TOKEN_ENCRYPTION_KEY` نیز کلید داخلی رمزنگاری توکن‌هاست. `KAVENEGAR_API_KEY` جداست و فقط برای ارسال پیامک استفاده می‌شود.

منبع: [راهنمای رسمی OAuth برای برنامه‌های وب Google](https://developers.google.com/identity/protocols/oauth2/web-server).

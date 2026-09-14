import { HOME_DESCRIPTION, SITE_NAME, siteUrl } from '../../lib/seo';

export function GET() {
  const homepage = siteUrl().toString();
  const body = `# ${SITE_NAME}\n> ${HOME_DESCRIPTION}\n\n## صفحه عمومی\n- [${SITE_NAME}](${homepage}): معرفی محصول، قابلیت‌ها، شیوه اتصال و اصول امنیت داده.\n\n## قابلیت‌های اصلی\n- تحلیل داده‌های Google Search Console با دسترسی فقط‌خواندنی\n- شناسایی فرصت‌های سئو بر پایه کلیک، نمایش، نرخ کلیک و جایگاه\n- رهگیری مستقل رتبه کلمات با کشور، زبان، موقعیت و دستگاه ثابت\n\n## دسترسی\nداشبورد، تحلیل‌ها، رهگیری کلمات و راه‌اندازی پروژه خصوصی هستند و برای استفاده به حساب تأییدشده نیاز دارند.\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

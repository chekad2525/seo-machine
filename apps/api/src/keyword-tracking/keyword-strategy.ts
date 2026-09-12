export type KeywordActionPriority = 'urgent' | 'high' | 'medium' | 'low';

export type KeywordAction = {
  priority: KeywordActionPriority;
  code: 'pending' | 'provider-error' | 'rank-drop' | 'target-mismatch' | 'not-ranked' | 'protect' | 'quick-win' | 'strengthen' | 'rebuild';
  title: string;
  detail: string;
};

function comparablePage(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return `${host}${path}`;
  } catch {
    return value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}

export function buildKeywordAction(input: { rank: number | null; change: number | null; targetPage: string | null; resultUrl: string | null; status?: string | null }): KeywordAction {
  if (input.status === 'PENDING') return { priority: 'low', code: 'pending', title: 'در انتظار نتیجه', detail: 'درخواست ثبت شده است؛ پس از آماده‌شدن پاسخ ارائه‌دهنده، رتبه و پیشنهاد به‌روز می‌شود.' };
  if (input.status === 'FAILED') return { priority: 'urgent', code: 'provider-error', title: 'رفع خطای دریافت رتبه', detail: 'پیام خطای ارائه‌دهنده و اعتبار تنظیمات موقعیت و حساب API را بررسی کنید.' };
  if (input.rank === null) return { priority: 'high', code: 'not-ranked', title: 'بررسی نبودن در نتایج', detail: 'ارتباط محتوا، وضعیت ایندکس و نیاز به ساخت یا تقویت صفحه مناسب را بررسی کنید.' };
  if (input.change !== null && input.change >= 3) return { priority: 'urgent', code: 'rank-drop', title: 'بررسی فوری افت رتبه', detail: 'تغییرات اخیر صفحه، رقبا و شکل نتایج گوگل را با ثبت قبلی مقایسه کنید.' };
  if (input.targetPage && input.resultUrl && comparablePage(input.targetPage) !== comparablePage(input.resultUrl)) return { priority: 'high', code: 'target-mismatch', title: 'هم‌راستایی صفحه هدف', detail: 'صفحه رتبه‌گرفته با صفحه هدف متفاوت است؛ هم‌نوع‌خواری و ارتباط جست‌وجو با صفحه را بررسی کنید.' };
  if (input.rank <= 3) return { priority: 'low', code: 'protect', title: 'حفظ و پایش جایگاه', detail: 'تغییرات رقبا، عنوان، اسنیپت و سلامت صفحه را بدون بازنویسی پرریسک پایش کنید.' };
  if (input.rank <= 10) return { priority: 'medium', code: 'quick-win', title: 'فرصت رشد سریع', detail: 'عنوان، پوشش نیت جست‌وجو و لینک‌های داخلی این صفحه را تقویت کنید.' };
  if (input.rank <= 20) return { priority: 'medium', code: 'strengthen', title: 'تقویت محتوا و اعتبار', detail: 'شکاف محتوایی با نتایج صفحه اول و لینک‌های داخلی و خارجی را بررسی کنید.' };
  return { priority: 'high', code: 'rebuild', title: 'بازطراحی مسیر محتوا', detail: 'نیت جست‌وجو، ساختار صفحه و نیاز به محتوای تازه یا صفحه اختصاصی را بازبینی کنید.' };
}

import type { Metadata } from 'next';

export const SITE_NAME = 'SEO Machine';
export const HOME_TITLE = 'نرم‌افزار تحلیل سئو و سرچ کنسول';
export const HOME_DESCRIPTION = 'SEO Machine داده‌های Google Search Console و رتبه کلمات کلیدی را در یک فضای کاری فارسی جمع می‌کند تا فرصت‌های رشد را پیدا کنید و اقدام بعدی سئو را با شواهد واقعی انتخاب کنید.';

export function siteUrl() {
  const configured = process.env.APP_ORIGIN?.trim() || process.env.NEXTAUTH_URL?.trim() || 'http://localhost:3000';
  try {
    return new URL(configured);
  } catch {
    return new URL('http://localhost:3000');
  }
}

export function privatePageMetadata(title: string, description: string, follow = false): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      googleBot: {
        index: false,
        follow,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
      },
    },
  };
}

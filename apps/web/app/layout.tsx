import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'SEO Machine | مرکز فرماندهی رشد جست‌وجو', description: 'داده‌های Google Search Console را به تصمیم‌های روشن و فرصت‌های قابل اقدام تبدیل کنید.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa"><body>{children}</body></html>;
}

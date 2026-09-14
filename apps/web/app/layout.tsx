import './globals.css';
import type { Metadata } from 'next';
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, siteUrl } from '../lib/seo';

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${HOME_TITLE} | ${SITE_NAME}`, template: `%s | ${SITE_NAME}` },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  category: 'technology',
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { address: false, email: false, telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa-IR" dir="rtl"><body>{children}</body></html>;
}

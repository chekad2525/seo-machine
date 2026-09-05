import Link from 'next/link';

export default function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`app-brand${compact ? ' compact' : ''}`} href="/" aria-label="صفحه اصلی SEO Machine">
    <span className="app-brand-mark" aria-hidden="true"><i /><i /><i /></span>
    <span><b>SEO Machine</b>{!compact && <small>مرکز فرماندهی رشد جست‌وجو</small>}</span>
  </Link>;
}

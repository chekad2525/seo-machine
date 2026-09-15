'use client';

const faNumber = new Intl.NumberFormat('fa-IR');

export default function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
  label = 'صفحه‌بندی نتایج',
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === pageCount || Math.abs(item - page) <= 1,
  );

  return <nav className="data-pagination" aria-label={label}>
    <p><b>{faNumber.format(first)}–{faNumber.format(last)}</b> از {faNumber.format(totalItems)} مورد</p>
    <div>
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="صفحه قبل">→</button>
      {pages.map((item, index) => <span key={item} className="pagination-slot">
        {index > 0 && item - pages[index - 1] > 1 && <i aria-hidden="true">…</i>}
        <button type="button" className={item === page ? 'active' : ''} aria-current={item === page ? 'page' : undefined} onClick={() => onPageChange(item)}>{faNumber.format(item)}</button>
      </span>)}
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === pageCount} aria-label="صفحه بعد">←</button>
    </div>
  </nav>;
}


'use client';

import { useState } from 'react';
import Pagination from '../components/pagination';

export type Metric = { label: string; clicks: number; impressions: number; ctr: number; position: number };
export type SelectedOpportunity = Omit<Metric, 'label'> & { query: string; page: string; score: number; reason: 'low-ctr' | 'striking-distance' };

const PAGE_SIZE = 10;
const faNumber = new Intl.NumberFormat('fa-IR');
const faDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

function csvValue(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = rows.map((row) => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportToolbar({ domain, topQueries, topPages, opportunities }: { domain: string; topQueries: Metric[]; topPages: Metric[]; opportunities: SelectedOpportunity[] }) {
  function exportReport() {
    const header = ['section', 'query_or_page', 'target_page', 'clicks', 'impressions', 'ctr_percent', 'average_position', 'score', 'reason'];
    const queryRows = topQueries.map((row) => ['top-query', row.label, '', row.clicks, row.impressions, row.ctr * 100, row.position, '', '']);
    const pageRows = topPages.map((row) => ['top-page', row.label, '', row.clicks, row.impressions, row.ctr * 100, row.position, '', '']);
    const opportunityRows = opportunities.map((row) => ['opportunity', row.query, row.page, row.clicks, row.impressions, row.ctr * 100, row.position, row.score, row.reason]);
    downloadCsv(`seo-report-${domain.replace(/[^a-z0-9.-]+/gi, '-')}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...queryRows, ...pageRows, ...opportunityRows]);
  }

  return <section className="report-toolbar" aria-label="تهیه گزارش">
    <div><span>گزارش آماده ارائه</span><strong>{domain}</strong><small>جدول‌ها، فرصت‌ها و شاخص‌های این صفحه در خروجی لحاظ می‌شوند.</small></div>
    <div className="report-toolbar-actions"><button type="button" onClick={exportReport}>دریافت CSV</button><button type="button" onClick={() => window.print()}>چاپ / ذخیره PDF</button></div>
  </section>;
}

export function MetricTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: Metric[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return <section className="analysis-table-card">
    <div className="analysis-section-head"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{faNumber.format(rows.length)} مورد</span></div>
    {rows.length ? <><div className="analysis-table-scroll"><table className="analysis-table">
      <thead><tr><th>عبارت / صفحه</th><th>کلیک</th><th>نمایش</th><th>CTR</th><th>میانگین جایگاه</th></tr></thead>
      <tbody>{visibleRows.map((row) => <tr key={row.label}>
        <td title={row.label}>{row.label}</td><td>{faNumber.format(row.clicks)}</td><td>{faNumber.format(row.impressions)}</td><td>{faDecimal.format(row.ctr * 100)}٪</td><td>{faDecimal.format(row.position)}</td>
      </tr>)}</tbody>
    </table></div><Pagination page={safePage} pageCount={pageCount} totalItems={rows.length} pageSize={PAGE_SIZE} onPageChange={setPage} label={`صفحه‌بندی ${title}`}/></> : <div className="analysis-empty">در این بازه موردی با معیار انتخاب‌شده پیدا نشد.</div>}
  </section>;
}

export function OpportunityTable({ rows }: { rows: SelectedOpportunity[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return <section className="analysis-table-card selected-opportunities">
    <div className="analysis-section-head"><div><h2>فهرست کوتاه بهبود</h2><p>فقط فرصت‌هایی که از فیلتر داده و امتیاز اولویت عبور کرده‌اند</p></div><span>{faNumber.format(rows.length)} فرصت منتخب</span></div>
    {rows.length ? <><div className="analysis-table-scroll"><table className="analysis-table"><thead><tr><th>کلمه کلیدی</th><th>صفحه</th><th>دلیل</th><th>نمایش</th><th>میانگین جایگاه</th><th>امتیاز</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={`${row.query}-${row.page}`}><td title={row.query}>{row.query}</td><td title={row.page}>{row.page}</td><td>{row.reason === 'low-ctr' ? 'CTR پایین' : 'نزدیک صفحه اول'}</td><td>{faNumber.format(row.impressions)}</td><td>{faDecimal.format(row.position)}</td><td><b className="opportunity-score">{faNumber.format(row.score)}</b></td></tr>)}</tbody></table></div><Pagination page={safePage} pageCount={pageCount} totalItems={rows.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="صفحه‌بندی فرصت‌های منتخب"/></> : <div className="analysis-empty">برای ساخت این فهرست، پس از اعمال migration یک‌بار داده‌ها را دوباره همگام‌سازی کنید.</div>}
  </section>;
}

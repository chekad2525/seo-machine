'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readSheet } from 'read-excel-file/browser';

export type ExactRank = { provider: string; rank: number | null; groupRank: number | null; change: number | null; resultUrl: string | null; checkedAt: string; device: string; locationCode: number };
export type TrackedKeyword = { id: string; query: string; targetPage: string | null; position: number | null; change: number | null; clicks: number; impressions: number; daily: Array<{ date: string; position: number | null }>; exact: ExactRank | null; exactHistory: Array<{ date: string; rank: number | null }>; exactStatus: string | null; exactError: string | null };
export type KeywordSuggestion = { query: string; clicks: number; impressions: number; position: number | null };
type ImportedKeyword = { query: string; targetPage?: string };

const faNumber = new Intl.NumberFormat('fa-IR');
const faDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
const keywordHeaders = new Set(['keyword', 'query', 'کلمه کلیدی', 'کلمه', 'عبارت کلیدی']);
const pageHeaders = new Set(['target_url', 'target url', 'url', 'page', 'target page', 'صفحه هدف', 'لینک هدف']);

function normalizedCell(value: unknown) { return String(value ?? '').trim().replace(/\s+/g, ' '); }

function parseKeywordRows(rows: unknown[][]) {
  if (!rows.length) throw new Error('فایل خالی است.');
  const first = rows[0].map((cell) => normalizedCell(cell).toLocaleLowerCase('fa'));
  const keywordIndex = first.findIndex((cell) => keywordHeaders.has(cell));
  const pageIndex = first.findIndex((cell) => pageHeaders.has(cell));
  const hasHeader = keywordIndex >= 0;
  const index = hasHeader ? keywordIndex : 0;
  const unique = new Map<string, ImportedKeyword>();
  for (const row of rows.slice(hasHeader ? 1 : 0)) {
    const query = normalizedCell(row[index]);
    const targetPage = pageIndex >= 0 ? normalizedCell(row[pageIndex]) : '';
    if (!query) continue;
    if (query.length > 250) throw new Error(`کلمه «${query.slice(0, 30)}…» بیشتر از ۲۵۰ نویسه است.`);
    if (targetPage.length > 2000) throw new Error(`نشانی صفحه هدف برای «${query}» بیش از حد طولانی است.`);
    unique.set(query.toLocaleLowerCase('fa'), { query, ...(targetPage ? { targetPage } : {}) });
  }
  const keywords = [...unique.values()];
  if (!keywords.length) throw new Error('هیچ کلمه‌ای در فایل پیدا نشد. ستون اول یا ستون keyword را بررسی کنید.');
  if (keywords.length > 100) throw new Error('هر فایل می‌تواند حداکثر ۱۰۰ کلمه یکتا داشته باشد.');
  return keywords;
}

function Trend({ points, exact = false }: { points: Array<{ date: string; position?: number | null; rank?: number | null }>; exact?: boolean }) {
  const valid = points.map((point) => ({ date: point.date, value: exact ? point.rank : point.position })).filter((point): point is { date: string; value: number } => point.value !== null && point.value !== undefined && point.value > 0);
  if (valid.length < 2) return <span className="trend-empty">داده کافی نیست</span>;
  const min = Math.min(...valid.map((point) => point.value));
  const max = Math.max(...valid.map((point) => point.value));
  const range = Math.max(max - min, 1);
  const path = valid.map((point, index) => `${index ? 'L' : 'M'} ${index * (94 / (valid.length - 1)) + 3} ${5 + ((point.value - min) / range) * 28}`).join(' ');
  return <svg className="rank-trend" viewBox="0 0 100 38" role="img" aria-label="روند رتبه؛ عدد کمتر بهتر است"><path d={path}/><circle cx={97} cy={5 + ((valid[valid.length - 1].value - min) / range) * 28} r="2.5"/></svg>;
}

function ReportSummary({ keywords }: { keywords: TrackedKeyword[] }) {
  const ranked = keywords.filter((item) => item.exact?.rank !== null && item.exact?.rank !== undefined);
  const average = ranked.length ? ranked.reduce((sum, item) => sum + (item.exact?.rank ?? 0), 0) / ranked.length : null;
  const improved = ranked.filter((item) => (item.exact?.change ?? 0) < 0).length;
  const declined = ranked.filter((item) => (item.exact?.change ?? 0) > 0).length;
  const buckets = [
    { label: '۳ رتبه اول', count: ranked.filter((item) => (item.exact?.rank ?? 999) <= 3).length },
    { label: 'رتبه ۴ تا ۱۰', count: ranked.filter((item) => (item.exact?.rank ?? 999) >= 4 && (item.exact?.rank ?? 999) <= 10).length },
    { label: 'رتبه ۱۱ تا ۲۰', count: ranked.filter((item) => (item.exact?.rank ?? 999) >= 11 && (item.exact?.rank ?? 999) <= 20).length },
    { label: 'بعد از ۲۰', count: ranked.filter((item) => (item.exact?.rank ?? 0) > 20).length },
  ];
  const byDate = new Map<string, { sum: number; count: number }>();
  keywords.forEach((item) => item.exactHistory.forEach((point) => {
    if (point.rank === null) return;
    const value = byDate.get(point.date) ?? { sum: 0, count: 0 };
    value.sum += point.rank; value.count++; byDate.set(point.date, value);
  }));
  const overallTrend = [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, rank: value.sum / value.count }));
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const lastCheck = ranked.map((item) => item.exact?.checkedAt ?? '').sort().at(-1);
  return <>
    <section className="rank-kpis" aria-label="خلاصه رهگیری رتبه">
      <article><span>کلمات زیر نظر</span><strong>{faNumber.format(keywords.length)}</strong><small>سقف هر پروژه ۱۰۰ کلمه</small></article>
      <article><span>رتبه واقعی ثبت‌شده</span><strong>{faNumber.format(ranked.length)}</strong><small>از نتایج زنده گوگل</small></article>
      <article><span>حضور در ۱۰ نتیجه اول</span><strong>{faNumber.format(ranked.filter((item) => (item.exact?.rank ?? 999) <= 10).length)}</strong><small>بر اساس آخرین بررسی</small></article>
      <article><span>آخرین بررسی</span><strong className="kpi-date">{lastCheck ? new Date(lastCheck).toLocaleDateString('fa-IR') : '—'}</strong><small>{lastCheck ? new Date(lastCheck).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : 'هنوز اجرا نشده'}</small></article>
    </section>
    <section className="rank-report-grid">
      <article className="rank-report-card average-card"><header><div><span>میانگین رتبه واقعی</span><strong>{average === null ? '—' : faDecimal.format(average)}</strong></div><small>عدد کمتر بهتر است</small></header><div className="report-chart"><Trend points={overallTrend} exact/></div></article>
      <article className="rank-report-card movement-card"><header><span>حرکت از بررسی قبل</span><small>بر مبنای دو ثبت واقعی اخیر</small></header><div className="movement-bars"><div><b>{faNumber.format(improved)}</b><i style={{ height: `${28 + Math.min(improved * 9, 72)}%` }}/><span>صعود</span></div><div><b>{faNumber.format(declined)}</b><i className="down" style={{ height: `${28 + Math.min(declined * 9, 72)}%` }}/><span>سقوط</span></div><div><b>{faNumber.format(Math.max(0, ranked.length - improved - declined))}</b><i className="still" style={{ height: `${28 + Math.min((ranked.length - improved - declined) * 9, 72)}%` }}/><span>بدون تغییر</span></div></div></article>
      <article className="rank-report-card distribution-card"><header><span>توزیع رتبه‌ها</span><small>آخرین نتیجه ثبت‌شده</small></header><div className="distribution-bars">{buckets.map((bucket) => <div key={bucket.label}><span>{bucket.label}</span><i><b style={{ width: `${(bucket.count / maxBucket) * 100}%` }}/></i><strong>{faNumber.format(bucket.count)}</strong></div>)}</div></article>
    </section>
  </>;
}

export default function KeywordTracker({ projectId, initialKeywords, suggestions, exactRankNote, exactRankReady }: { projectId: string; initialKeywords: TrackedKeyword[]; suggestions: KeywordSuggestion[]; exactRankNote: string; exactRankReady: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [targetPage, setTargetPage] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [importRows, setImportRows] = useState<ImportedKeyword[]>([]);
  const [fileName, setFileName] = useState('');
  const [notice, setNotice] = useState('');
  const rows = useMemo(() => initialKeywords.filter((item) => item.query.toLocaleLowerCase('fa').includes(filter.trim().toLocaleLowerCase('fa'))), [filter, initialKeywords]);
  const hasPendingExact = initialKeywords.some((item) => item.exactStatus === 'PENDING');

  async function postKeyword(payload: Record<string, unknown>) {
    const response = await fetch('/api/keywords', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, ...payload }) });
    const text = await response.text();
    const data = text ? JSON.parse(text) as Record<string, unknown> : {};
    if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'درخواست انجام نشد.');
    return data;
  }

  async function mutate(payload: Record<string, unknown>) {
    setBusy(String(payload.id ?? payload.query ?? payload.action)); setError(''); setNotice('');
    try {
      await postKeyword(payload);
      setQuery(''); setTargetPage(''); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'درخواست انجام نشد.'); }
    finally { setBusy(''); }
  }

  async function selectWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(''); setNotice(''); setImportRows([]); setFileName('');
    if (!file) return;
    if (!file.name.toLocaleLowerCase('en').endsWith('.xlsx')) { setError('فقط فایل Excel با پسوند xlsx پذیرفته می‌شود.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم فایل باید کمتر از ۵ مگابایت باشد.'); return; }
    setBusy('parse-file');
    try {
      const sheet = await readSheet(file);
      const parsed = parseKeywordRows(sheet as unknown[][]);
      setImportRows(parsed); setFileName(file.name);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'فایل Excel خوانده نشد.'); }
    finally { setBusy(''); event.target.value = ''; }
  }

  async function importAndTrack() {
    if (!importRows.length) return;
    setBusy('bulk-import'); setError(''); setNotice('');
    try {
      const result = await postKeyword({ action: 'bulk-import', keywords: importRows });
      const imported = Number(result.imported ?? 0);
      const updated = Number(result.updated ?? 0);
      if (exactRankReady) {
        try {
          const rankResult = await postKeyword({ action: 'exact-refresh' });
          const remaining = Number(rankResult.remaining ?? 0);
          setNotice(`${faNumber.format(imported)} کلمه تازه وارد شد و ${faNumber.format(updated)} مورد به‌روزرسانی شد. بررسی رتبه واقعی آغاز شد${remaining ? `؛ ${faNumber.format(remaining)} کلمه در نوبت اجرای بعدی است` : ''}.`);
        } catch (rankError) {
          setNotice(`${faNumber.format(imported)} کلمه وارد شد، اما بررسی رتبه شروع نشد: ${rankError instanceof Error ? rankError.message : 'خطای سرویس رتبه'}`);
        }
      } else {
        setNotice(`${faNumber.format(imported)} کلمه تازه وارد شد و ${faNumber.format(updated)} مورد به‌روزرسانی شد. برای رتبه واقعی، کلید ارائه‌دهنده را در محیط API تنظیم کنید.`);
      }
      setImportRows([]); setFileName(''); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'ورود کلمات انجام نشد.'); }
    finally { setBusy(''); }
  }

  function submit(event: FormEvent) { event.preventDefault(); if (query.trim()) void mutate({ action: 'add', query: query.trim(), targetPage: targetPage.trim() }); }

  return <>
    <ReportSummary keywords={initialKeywords}/>
    <section className="keyword-intake-grid">
      <div className="keyword-import-card">
        <div><p className="app-overline">ورود گروهی از Excel</p><h2>فهرست کلمات را یکجا وارد کنید</h2><p>ستون اول را به کلمات اختصاص دهید، یا از عنوان <b>keyword</b> استفاده کنید. ستون اختیاری <b>target_url</b> صفحه هدف را مشخص می‌کند.</p></div>
        <label className={`excel-dropzone ${fileName ? 'ready' : ''}`}>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectWorkbook(event)} disabled={Boolean(busy)}/>
          <span className="excel-mark">XLSX</span><strong>{busy === 'parse-file' ? 'در حال خواندن فایل…' : fileName || 'فایل Excel را انتخاب کنید'}</strong><small>{fileName ? `${faNumber.format(importRows.length)} کلمه یکتا آماده ورود است` : 'حداکثر ۱۰۰ کلمه و ۵ مگابایت'}</small>
        </label>
        {importRows.length > 0 && <div className="excel-preview"><div>{importRows.slice(0, 4).map((item) => <span key={item.query}>{item.query}</span>)}{importRows.length > 4 && <span>+ {faNumber.format(importRows.length - 4)} کلمه دیگر</span>}</div><button type="button" onClick={() => void importAndTrack()} disabled={Boolean(busy)}>{busy === 'bulk-import' ? 'در حال ثبت…' : exactRankReady ? 'ورود و شروع بررسی واقعی' : 'ورود کلمات'}</button></div>}
      </div>
      <section className="keyword-add-card compact">
        <div><p className="app-overline">افزودن دستی</p><h2>یک عبارت تازه</h2><p>برای افزودن سریع یک کلمه، آن را همراه صفحه هدف ثبت کنید.</p></div>
        <form onSubmit={submit}><label htmlFor="keyword-query">کلمه کلیدی</label><input id="keyword-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={250} placeholder="مثلاً: تحلیل سئو سایت" required/><label htmlFor="target-page">صفحه هدف <span>اختیاری</span></label><input id="target-page" value={targetPage} onChange={(event) => setTargetPage(event.target.value)} maxLength={2000} placeholder="https://example.com/page" inputMode="url"/><button className="app-submit" disabled={Boolean(busy)}>افزودن <span>←</span></button></form>
      </section>
    </section>
    {error && <p className="formal-callback-message error" role="alert">{error}</p>}
    {notice && <p className="formal-callback-message success" role="status">{notice}</p>}
    {!exactRankReady && <aside className="rank-config-note"><b>بررسی واقعی هنوز پیکربندی نشده است.</b><span>برای Serper مقدار <code>SERPER_API_KEY</code> یا برای DataForSEO اطلاعات ورود و کد موقعیت را در محیط API تنظیم کنید.</span></aside>}
    {suggestions.length > 0 && <section className="keyword-suggestions"><div><b>پیشنهاد از داده‌های شما</b><span>عبارت‌های پربازدید که هنوز دنبال نمی‌کنید</span></div><div>{suggestions.map((item) => <button key={item.query} type="button" disabled={Boolean(busy)} onClick={() => void mutate({ action: 'add', query: item.query })}><span>{item.query}</span><small>{faNumber.format(item.impressions)} نمایش · رتبه {item.position === null ? '—' : faDecimal.format(item.position)}</small><b>{busy === item.query ? '…' : '+'}</b></button>)}</div></section>}
    <section className="keyword-table-card">
      <div className="keyword-table-head"><div><p className="app-overline">گزارش رتبه ذخیره‌شده</p><h2>کلمات زیر نظر</h2><small>{exactRankNote}</small></div><div className="keyword-table-tools"><label><span>جست‌وجو در فهرست</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="نام کلمه…"/></label><button className="exact-rank-button" type="button" disabled={Boolean(busy) || !initialKeywords.length || !exactRankReady} onClick={() => void mutate({ action: hasPendingExact ? 'exact-collect' : 'exact-refresh' })}>{busy === (hasPendingExact ? 'exact-collect' : 'exact-refresh') ? 'در حال بررسی…' : hasPendingExact ? 'دریافت نتیجه واقعی' : 'بررسی رتبه واقعی امروز'}</button></div></div>
      {rows.length ? <div className="keyword-table-scroll"><table className="keyword-table"><thead><tr><th>کلمه کلیدی</th><th>میانگین GSC</th><th>تغییر هفتگی</th><th>رتبه واقعی</th><th>تاریخچه واقعی</th><th>کلیک</th><th>نمایش</th><th>صفحه هدف</th><th><span className="sr-only">عملیات</span></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><b>{item.query}</b><small>Google · دسکتاپ برای رتبه واقعی</small></td><td><strong>{item.position === null ? '—' : faDecimal.format(item.position)}</strong></td><td>{item.change === null ? <span className="rank-change neutral">—</span> : <span className={`rank-change ${item.change < 0 ? 'up' : item.change > 0 ? 'down' : 'neutral'}`}>{item.change < 0 ? '↑' : item.change > 0 ? '↓' : '—'} {item.change ? faDecimal.format(Math.abs(item.change)) : ''}</span>}</td><td><div className="exact-rank" title={item.exactError ?? ''}>{item.exact ? <><strong>{item.exact.rank === null ? '۱۰۰+' : faNumber.format(item.exact.rank)}</strong>{item.exact.change !== null && <span className={item.exact.change < 0 ? 'up' : item.exact.change > 0 ? 'down' : 'neutral'}>{item.exact.change < 0 ? '↑' : item.exact.change > 0 ? '↓' : '—'} {item.exact.change ? faNumber.format(Math.abs(item.exact.change)) : ''}</span>}<small>{item.exact.provider === 'serper' ? 'Serper' : 'DataForSEO'} · {new Date(item.exact.checkedAt).toLocaleDateString('fa-IR')}</small></> : item.exactStatus === 'PENDING' ? <span className="exact-pending">در صف</span> : item.exactStatus === 'FAILED' ? <span className="exact-failed">خطا</span> : <span className="trend-empty">هنوز بررسی نشده</span>}</div></td><td><Trend points={item.exactHistory} exact/></td><td>{faNumber.format(item.clicks)}</td><td>{faNumber.format(item.impressions)}</td><td className="target-page" title={item.targetPage ?? ''}>{item.targetPage || 'تعیین نشده'}</td><td><button className="remove-keyword" type="button" disabled={Boolean(busy)} onClick={() => void mutate({ action: 'remove', id: item.id })}>{busy === item.id ? '…' : 'حذف'}</button></td></tr>)}</tbody></table></div> : <div className="keyword-empty"><span>⌁</span><h3>هنوز کلمه‌ای زیر نظر نیست.</h3><p>فایل Excel را وارد کنید یا اولین کلمه را دستی اضافه کنید.</p></div>}
    </section>
  </>;
}

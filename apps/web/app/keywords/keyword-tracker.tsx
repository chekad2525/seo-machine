'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readSheet } from 'read-excel-file/browser';
import { parseDelimitedText, parseKeywordRows, type ImportedKeyword, type KeywordImportResult } from './keyword-import';

export type ExactRank = { provider: string; rank: number | null; groupRank: number | null; change: number | null; resultUrl: string | null; checkedAt: string; device: string; locationCode: number };
export type KeywordAction = { priority: 'urgent' | 'high' | 'medium' | 'low'; code: string; title: string; detail: string };
export type TrackedKeyword = { id: string; query: string; targetPage: string | null; createdAt: string; exact: ExactRank | null; exactHistory: Array<{ date: string; rank: number | null }>; exactStatus: string | null; exactError: string | null; action: KeywordAction };
export type TrackingSettings = { countryCode: string; languageCode: string; locationName: string; device: 'desktop' | 'mobile' };
export type TrackingSummary = { tracked: number; checked: number; top10: number; averageRank: number | null; improved: number; declined: number };

const faNumber = new Intl.NumberFormat('fa-IR');
const faDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
const priorityLabels = { urgent: 'فوری', high: 'زیاد', medium: 'متوسط', low: 'پایش' } as const;

function Trend({ points, large = false }: { points: Array<{ date: string; rank: number | null }>; large?: boolean }) {
  const valid = points.filter((point): point is { date: string; rank: number } => point.rank !== null && point.rank > 0);
  if (valid.length < 2) return <span className="trend-empty">داده کافی نیست</span>;
  const min = Math.min(...valid.map((point) => point.rank)); const max = Math.max(...valid.map((point) => point.rank)); const range = Math.max(max - min, 1);
  const path = valid.map((point, index) => `${index ? 'L' : 'M'} ${index * (94 / (valid.length - 1)) + 3} ${5 + ((point.rank - min) / range) * 28}`).join(' ');
  const lastY = 5 + ((valid.at(-1)!.rank - min) / range) * 28;
  return <svg className={`rank-trend${large ? ' large' : ''}`} viewBox="0 0 100 38" role="img" aria-label="روند رتبه؛ عدد کمتر بهتر است"><path d={path}/><circle cx="97" cy={lastY} r="2.5"/></svg>;
}

function csvValue(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function visibleStatus(item: TrackedKeyword) {
  if (item.exactStatus === 'PENDING') return 'pending';
  if (item.exactStatus === 'FAILED') return 'failed';
  if (!item.exact || item.exact.rank === null) return 'unranked';
  if ((item.exact.change ?? 0) < 0) return 'improved';
  if ((item.exact.change ?? 0) > 0) return 'declined';
  return 'stable';
}

function urlPath(value: string) {
  try { const url = new URL(value); return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`; }
  catch { return value; }
}

function Summary({ keywords, summary }: { keywords: TrackedKeyword[]; summary: TrackingSummary }) {
  const buckets = [
    { label: '۳ رتبه اول', count: keywords.filter((item) => (item.exact?.rank ?? 999) <= 3).length },
    { label: 'رتبه ۴ تا ۱۰', count: keywords.filter((item) => (item.exact?.rank ?? 999) >= 4 && (item.exact?.rank ?? 999) <= 10).length },
    { label: 'رتبه ۱۱ تا ۲۰', count: keywords.filter((item) => (item.exact?.rank ?? 999) >= 11 && (item.exact?.rank ?? 999) <= 20).length },
    { label: 'بعد از ۲۰', count: keywords.filter((item) => (item.exact?.rank ?? 0) > 20).length },
  ];
  const byDate = new Map<string, { sum: number; count: number }>();
  keywords.forEach((item) => item.exactHistory.forEach((point) => { if (point.rank === null) return; const value = byDate.get(point.date) ?? { sum: 0, count: 0 }; value.sum += point.rank; value.count++; byDate.set(point.date, value); }));
  const trend = [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, rank: value.sum / value.count }));
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const lastCheck = keywords.map((item) => item.exact?.checkedAt ?? '').sort().at(-1);
  return <>
    <section className="rank-kpis" aria-label="خلاصه رهگیری رتبه">
      <article><span>کلمات زیر نظر</span><strong>{faNumber.format(summary.tracked)}</strong><small>سقف پروژه ۱۰۰ عبارت</small></article>
      <article><span>جایگاه ثبت‌شده</span><strong>{faNumber.format(summary.checked)}</strong><small>از نتایج زنده گوگل</small></article>
      <article><span>حضور در ۱۰ نتیجه اول</span><strong>{faNumber.format(summary.top10)}</strong><small>بر اساس آخرین بررسی</small></article>
      <article><span>آخرین بررسی</span><strong className="kpi-date">{lastCheck ? new Date(lastCheck).toLocaleDateString('fa-IR') : '—'}</strong><small>{lastCheck ? new Date(lastCheck).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : 'هنوز اجرا نشده'}</small></article>
    </section>
    <section className="rank-report-grid">
      <article className="rank-report-card average-card"><header><div><span>میانگین جایگاه مشاهده‌شده</span><strong>{summary.averageRank === null ? '—' : faDecimal.format(summary.averageRank)}</strong></div><small>عدد کمتر بهتر است</small></header><div className="report-chart"><Trend points={trend} large/></div></article>
      <article className="rank-report-card movement-card"><header><span>حرکت از بررسی قبل</span><small>دو ثبت واقعی اخیر</small></header><div className="movement-bars"><div><b>{faNumber.format(summary.improved)}</b><i style={{ height: `${28 + Math.min(summary.improved * 9, 72)}%` }}/><span>صعود</span></div><div><b>{faNumber.format(summary.declined)}</b><i className="down" style={{ height: `${28 + Math.min(summary.declined * 9, 72)}%` }}/><span>سقوط</span></div><div><b>{faNumber.format(Math.max(0, summary.checked - summary.improved - summary.declined))}</b><i className="still"/><span>بدون تغییر</span></div></div></article>
      <article className="rank-report-card distribution-card"><header><span>توزیع رتبه‌ها</span><small>آخرین نتیجه ثبت‌شده</small></header><div className="distribution-bars">{buckets.map((bucket) => <div key={bucket.label}><span>{bucket.label}</span><i><b style={{ width: `${(bucket.count / maxBucket) * 100}%` }}/></i><strong>{faNumber.format(bucket.count)}</strong></div>)}</div></article>
    </section>
  </>;
}

export default function KeywordTracker({ projectId, initialKeywords, settings, capabilities, summary, rankDepth, exactRankNote, exactRankReady }: { projectId: string; initialKeywords: TrackedKeyword[]; settings: TrackingSettings; capabilities: { mobile: boolean }; summary: TrackingSummary; rankDepth: number; exactRankNote: string; exactRankReady: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(''); const [targetPage, setTargetPage] = useState(''); const [paste, setPaste] = useState('');
  const [search, setSearch] = useState(''); const [rankBand, setRankBand] = useState('all'); const [status, setStatus] = useState('all'); const [priority, setPriority] = useState('all');
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [importResult, setImportResult] = useState<KeywordImportResult | null>(null); const [sourceName, setSourceName] = useState('');
  const [tracking, setTracking] = useState(settings);
  const rows = useMemo(() => initialKeywords.filter((item) => {
    const rank = item.exact?.rank;
    const rankMatches = rankBand === 'all' || (rankBand === 'top3' && rank !== null && rank !== undefined && rank <= 3) || (rankBand === 'top10' && rank !== null && rank !== undefined && rank >= 4 && rank <= 10) || (rankBand === '11-20' && rank !== null && rank !== undefined && rank >= 11 && rank <= 20) || (rankBand === '20+' && rank !== null && rank !== undefined && rank > 20) || (rankBand === 'unranked' && (rank === null || rank === undefined));
    return item.query.toLocaleLowerCase('fa').includes(search.trim().toLocaleLowerCase('fa')) && rankMatches && (status === 'all' || visibleStatus(item) === status) && (priority === 'all' || item.action.priority === priority);
  }), [initialKeywords, priority, rankBand, search, status]);
  const hasPending = initialKeywords.some((item) => item.exactStatus === 'PENDING');

  async function post(payload: Record<string, unknown>) {
    const response = await fetch('/api/keywords', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, ...payload }) });
    const text = await response.text(); const data = text ? JSON.parse(text) as Record<string, unknown> : {};
    if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'درخواست انجام نشد.');
    return data;
  }
  async function run(key: string, payload: Record<string, unknown>, success?: string) {
    setBusy(key); setError(''); setNotice('');
    try { await post(payload); if (success) setNotice(success); router.refresh(); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'درخواست انجام نشد.'); return false; }
    finally { setBusy(''); }
  }

  function acceptImport(result: KeywordImportResult, name: string) { setImportResult(result); setSourceName(name); setError(''); setNotice(''); }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; setImportResult(null); setSourceName(''); setError('');
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) { setError('فایل باید XLSX یا CSV باشد.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم فایل باید کمتر از ۵ مگابایت باشد.'); return; }
    setBusy('parse-file');
    try { const rows = /\.xlsx$/i.test(file.name) ? await readSheet(file) as unknown[][] : parseDelimitedText(await file.text()); acceptImport(parseKeywordRows(rows), file.name); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'فایل خوانده نشد.'); }
    finally { setBusy(''); event.target.value = ''; }
  }
  function preparePaste() {
    try { acceptImport(parseKeywordRows(parseDelimitedText(paste)), 'ورودی دستی'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'متن خوانده نشد.'); }
  }
  async function importKeywords() {
    if (!importResult?.items.length) return;
    setBusy('bulk-import'); setError(''); setNotice('');
    try {
      const result = await post({ action: 'bulk-import', keywords: importResult.items });
      const imported = Number(result.imported ?? 0); const updated = Number(result.updated ?? 0);
      let message = `${faNumber.format(imported)} کلمه تازه ثبت و ${faNumber.format(updated)} مورد به‌روزرسانی شد.`;
      if (exactRankReady) {
        try { await post({ action: 'exact-refresh' }); message += ' بررسی جایگاه آغاز شد.'; }
        catch (rankError) { message += ` شروع بررسی رتبه انجام نشد: ${rankError instanceof Error ? rankError.message : 'خطای سرویس'}`; }
      }
      setNotice(message); setImportResult(null); setSourceName(''); setPaste(''); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'ورود کلمات انجام نشد.'); }
    finally { setBusy(''); }
  }
  async function submitOne(event: FormEvent) {
    event.preventDefault(); if (!query.trim()) return;
    setBusy('add-one'); setError(''); setNotice('');
    try {
      await post({ action: 'add', query: query.trim(), targetPage: targetPage.trim() });
      let message = 'کلمه برای رهگیری ثبت شد.';
      if (exactRankReady) { try { await post({ action: 'exact-refresh' }); message += ' بررسی جایگاه آغاز شد.'; } catch { message += ' بررسی خودکار جایگاه آغاز نشد؛ می‌توانید آن را از جدول اجرا کنید.'; } }
      setQuery(''); setTargetPage(''); setNotice(message); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'ثبت کلمه انجام نشد.'); }
    finally { setBusy(''); }
  }
  function saveSettings(event: FormEvent) { event.preventDefault(); void run('settings', { action: 'update-settings', ...tracking }, 'تنظیمات ذخیره شد؛ بررسی بعدی با این موقعیت انجام می‌شود.'); }
  function exportCsv() {
    const header = ['keyword', 'rank', 'change', 'status', 'priority', 'recommended_action', 'target_url', 'ranking_url', 'checked_at'];
    const lines = rows.map((item) => [item.query, item.exact?.rank ?? '', item.exact?.change ?? '', visibleStatus(item), priorityLabels[item.action.priority], item.action.title, item.targetPage ?? '', item.exact?.resultUrl ?? '', item.exact?.checkedAt ?? ''].map(csvValue).join(','));
    const blob = new Blob([`\uFEFF${header.map(csvValue).join(',')}\r\n${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `keyword-ranks-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <>
    <section className="tracking-control-bar">
      <div><span className="live-dot"/>تنظیمات جست‌وجوی واقعی</div>
      <form onSubmit={saveSettings}>
        <label><span>کد کشور</span><input value={tracking.countryCode} onChange={(event) => setTracking({ ...tracking, countryCode: event.target.value.slice(0, 2) })} maxLength={2} pattern="[A-Za-z]{2}" dir="ltr" title="کد دوحرفی مانند ir" required/></label>
        <label><span>کد زبان</span><input value={tracking.languageCode} onChange={(event) => setTracking({ ...tracking, languageCode: event.target.value.slice(0, 2) })} maxLength={2} pattern="[A-Za-z]{2}" dir="ltr" title="کد دوحرفی مانند fa" required/></label>
        <label className="location-field"><span>شهر یا موقعیت</span><input value={tracking.locationName} onChange={(event) => setTracking({ ...tracking, locationName: event.target.value })} maxLength={120} placeholder="Tehran, Tehran Province, Iran" required/></label>
        <label><span>دستگاه</span><select value={tracking.device} onChange={(event) => setTracking({ ...tracking, device: event.target.value as 'desktop' | 'mobile' })}><option value="desktop">دسکتاپ</option><option value="mobile" disabled={!capabilities.mobile}>موبایل{!capabilities.mobile ? ' · DataForSEO' : ''}</option></select></label>
        <button disabled={Boolean(busy) || JSON.stringify(tracking) === JSON.stringify(settings)}>{busy === 'settings' ? 'در حال ذخیره…' : 'ذخیره'}</button>
      </form>
    </section>
    <Summary keywords={initialKeywords} summary={summary}/>
    <section className="keyword-intake-grid">
      <div className="keyword-import-card">
        <div><p className="app-overline">ورود گروهی</p><h2>فهرست کلمات را وارد کنید</h2><p>فایل XLSX یا CSV با ستون <b>keyword</b> و ستون اختیاری <b>target_url</b> انتخاب کنید؛ یا فهرست را مستقیماً بچسبانید.</p></div>
        <div className="import-methods">
          <label className={`excel-dropzone ${sourceName ? 'ready' : ''}`}><input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectFile(event)} disabled={Boolean(busy)}/><span className="excel-mark">XLS<br/>CSV</span><strong>{busy === 'parse-file' ? 'در حال خواندن…' : sourceName || 'انتخاب فایل Excel یا CSV'}</strong><small>حداکثر ۱۰۰ کلمه و ۵ مگابایت</small></label>
          <div className="paste-import"><label htmlFor="keyword-paste">چسباندن دستی</label><textarea id="keyword-paste" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={'یک کلمه در هر خط\nیا: keyword,target_url'}/><button type="button" onClick={preparePaste} disabled={!paste.trim() || Boolean(busy)}>بررسی متن</button></div>
        </div>
        {importResult && <div className="import-review"><div className="import-stats"><span><b>{faNumber.format(importResult.stats.valid)}</b> معتبر</span><span><b>{faNumber.format(importResult.stats.duplicates)}</b> تکراری</span><span className={importResult.stats.errors ? 'has-errors' : ''}><b>{faNumber.format(importResult.stats.errors)}</b> خطادار</span></div>{importResult.errors.length > 0 && <details><summary>دیدن خطاهای ورودی</summary><ul>{importResult.errors.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></details>}<div className="import-preview">{importResult.items.slice(0, 5).map((item) => <span key={item.query}>{item.query}</span>)}</div><button className="import-confirm" type="button" onClick={() => void importKeywords()} disabled={Boolean(busy)}>{busy === 'bulk-import' ? 'در حال ثبت…' : exactRankReady ? 'ثبت و شروع بررسی واقعی' : 'ثبت کلمات'}</button></div>}
      </div>
      <section className="keyword-add-card compact"><div><p className="app-overline">افزودن سریع</p><h2>یک عبارت تازه</h2><p>یک کلمه را همراه با صفحه‌ای که باید برای آن رتبه بگیرد ثبت کنید.</p></div><form onSubmit={submitOne}><label htmlFor="keyword-query">کلمه کلیدی</label><input id="keyword-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={250} placeholder="مثلاً: تحلیل سئو سایت" required/><label htmlFor="target-page">صفحه هدف <span>اختیاری</span></label><input id="target-page" value={targetPage} onChange={(event) => setTargetPage(event.target.value)} maxLength={2000} placeholder="https://example.com/page" inputMode="url"/><button className="app-submit" disabled={Boolean(busy)}>افزودن <span>←</span></button></form></section>
    </section>
    {error && <p className="formal-callback-message error" role="alert">{error}</p>}{notice && <p className="formal-callback-message success" role="status">{notice}</p>}
    {!exactRankReady && <aside className="rank-config-note"><b>بررسی واقعی پیکربندی نشده است.</b><span>کلید Serper یا اطلاعات ورود DataForSEO را در محیط API تنظیم کنید.</span></aside>}
    <section className="keyword-table-card">
      <div className="keyword-table-head"><div><p className="app-overline">گزارش و اقدام</p><h2>کلمات زیر نظر</h2><small>{exactRankNote}</small></div><div className="report-actions"><button type="button" className="export-button" onClick={exportCsv} disabled={!rows.length}>دریافت CSV</button><button className="exact-rank-button" type="button" disabled={Boolean(busy) || !initialKeywords.length || !exactRankReady} onClick={() => void run('rank', { action: hasPending ? 'exact-collect' : 'exact-refresh' }, 'درخواست بررسی جایگاه ثبت شد.')}>{busy === 'rank' ? 'در حال بررسی…' : hasPending ? 'دریافت نتیجه ثبت‌شده' : 'بررسی جایگاه امروز'}</button></div></div>
      <div className="keyword-filters"><label><span>جست‌وجو</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام کلمه…"/></label><label><span>بازه رتبه</span><select value={rankBand} onChange={(event) => setRankBand(event.target.value)}><option value="all">همه رتبه‌ها</option><option value="top3">۱ تا ۳</option><option value="top10">۴ تا ۱۰</option><option value="11-20">۱۱ تا ۲۰</option><option value="20+">بالاتر از ۲۰</option><option value="unranked">بدون رتبه</option></select></label><label><span>وضعیت</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">همه وضعیت‌ها</option><option value="improved">صعود</option><option value="declined">سقوط</option><option value="stable">ثابت</option><option value="pending">در صف</option><option value="failed">خطا</option><option value="unranked">یافت نشد</option></select></label><label><span>اولویت اقدام</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">همه اولویت‌ها</option><option value="urgent">فوری</option><option value="high">زیاد</option><option value="medium">متوسط</option><option value="low">پایش</option></select></label><strong>{faNumber.format(rows.length)} نتیجه</strong></div>
      {rows.length ? <div className="keyword-table-scroll"><table className="keyword-table strategy-table"><thead><tr><th>کلمه کلیدی</th><th>رتبه واقعی</th><th>تغییر</th><th>تاریخچه</th><th>صفحه رتبه‌گرفته</th><th>صفحه هدف</th><th>اقدام پیشنهادی</th><th><span className="sr-only">عملیات</span></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><b>{item.query}</b><small>Google · {settings.device === 'mobile' ? 'موبایل' : 'دسکتاپ'} · {item.exact?.provider ?? 'در انتظار'}</small></td><td><div className="exact-rank" title={item.exactError ?? ''}>{item.exact ? item.exact.rank === null ? <><span className="rank-not-found">یافت نشد</span><small>در {faNumber.format(rankDepth)} نتیجه</small></> : <><strong>{faNumber.format(item.exact.rank)}</strong><small>{new Date(item.exact.checkedAt).toLocaleDateString('fa-IR')}</small></> : item.exactStatus === 'PENDING' ? <span className="exact-pending">در صف</span> : item.exactStatus === 'FAILED' ? <span className="exact-failed">خطا</span> : <span className="trend-empty">بررسی نشده</span>}</div></td><td>{item.exact?.change === null || item.exact?.change === undefined ? <span className="rank-change neutral">—</span> : <span className={`rank-change ${item.exact.change < 0 ? 'up' : item.exact.change > 0 ? 'down' : 'neutral'}`}>{item.exact.change < 0 ? '↑' : item.exact.change > 0 ? '↓' : '—'} {item.exact.change ? faNumber.format(Math.abs(item.exact.change)) : ''}</span>}</td><td><Trend points={item.exactHistory}/></td><td className="tracked-url">{item.exact?.resultUrl ? <a href={item.exact.resultUrl} target="_blank" rel="noreferrer" title={item.exact.resultUrl}>{urlPath(item.exact.resultUrl)}</a> : '—'}</td><td className="tracked-url">{item.targetPage ? <a href={item.targetPage} target="_blank" rel="noreferrer" title={item.targetPage}>{urlPath(item.targetPage)}</a> : 'تعیین نشده'}</td><td><div className="strategy-action"><span className={`priority ${item.action.priority}`}>{priorityLabels[item.action.priority]}</span><div><b>{item.action.title}</b><small>{item.action.detail}</small></div></div></td><td><button className="remove-keyword" type="button" disabled={Boolean(busy)} onClick={() => void run(item.id, { action: 'remove', id: item.id }, 'کلمه از فهرست حذف شد.')}>{busy === item.id ? '…' : 'حذف'}</button></td></tr>)}</tbody></table></div> : <div className="keyword-empty"><span>⌁</span><h3>{initialKeywords.length ? 'نتیجه‌ای با این فیلتر پیدا نشد.' : 'هنوز کلمه‌ای زیر نظر نیست.'}</h3><p>{initialKeywords.length ? 'فیلترها را تغییر دهید.' : 'فایل Excel یا CSV وارد کنید یا اولین کلمه را دستی اضافه کنید.'}</p></div>}
    </section>
  </>;
}

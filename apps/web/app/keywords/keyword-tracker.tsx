'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type ExactRank = { provider: string; rank: number | null; groupRank: number | null; change: number | null; resultUrl: string | null; checkedAt: string; device: string; locationCode: number };
export type TrackedKeyword = { id: string; query: string; targetPage: string | null; position: number | null; change: number | null; clicks: number; impressions: number; daily: Array<{ date: string; position: number | null }>; exact: ExactRank | null; exactStatus: string | null; exactError: string | null };
export type KeywordSuggestion = { query: string; clicks: number; impressions: number; position: number | null };

const faNumber = new Intl.NumberFormat('fa-IR');
const faDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

function Trend({ points }: { points: TrackedKeyword['daily'] }) {
  const valid = points.filter((point): point is { date: string; position: number } => point.position !== null && point.position > 0);
  if (valid.length < 2) return <span className="trend-empty">داده کافی نیست</span>;
  const min = Math.min(...valid.map((point) => point.position));
  const max = Math.max(...valid.map((point) => point.position));
  const range = Math.max(max - min, 1);
  const path = valid.map((point, index) => `${index ? 'L' : 'M'} ${index * (94 / (valid.length - 1)) + 3} ${5 + ((point.position - min) / range) * 28}`).join(' ');
  return <svg className="rank-trend" viewBox="0 0 100 38" role="img" aria-label="روند رتبه در ۲۸ روز"><path d={path}/><circle cx={97} cy={5 + ((valid[valid.length - 1].position - min) / range) * 28} r="2.5"/></svg>;
}

export default function KeywordTracker({ projectId, initialKeywords, suggestions, exactRankNote }: { projectId: string; initialKeywords: TrackedKeyword[]; suggestions: KeywordSuggestion[]; exactRankNote: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [targetPage, setTargetPage] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const rows = useMemo(() => initialKeywords.filter((item) => item.query.toLocaleLowerCase('fa').includes(filter.trim().toLocaleLowerCase('fa'))), [filter, initialKeywords]);
  const hasPendingExact = initialKeywords.some((item) => item.exactStatus === 'PENDING');

  async function mutate(payload: Record<string, string>) {
    setBusy(payload.id ?? payload.query ?? payload.action); setError('');
    try {
      const response = await fetch('/api/keywords', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, ...payload }) });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { message?: string } : {};
      if (!response.ok) throw new Error(data.message ?? 'درخواست انجام نشد.');
      setQuery(''); setTargetPage(''); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'درخواست انجام نشد.'); }
    finally { setBusy(''); }
  }

  function submit(event: FormEvent) { event.preventDefault(); if (query.trim()) void mutate({ action: 'add', query: query.trim(), targetPage: targetPage.trim() }); }

  return <>
    <section className="keyword-add-card">
      <div><p className="app-overline">افزودن به رصد</p><h2>کدام عبارت برای شما حیاتی است؟</h2><p>کلمه را انتخاب کنید؛ رتبه آن در دریافت‌های بعدی Search Console دنبال می‌شود.</p></div>
      <form onSubmit={submit}><label htmlFor="keyword-query">کلمه کلیدی</label><input id="keyword-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={250} placeholder="مثلاً: تحلیل سئو سایت" required/><label htmlFor="target-page">صفحه هدف <span>اختیاری</span></label><input id="target-page" value={targetPage} onChange={(event) => setTargetPage(event.target.value)} maxLength={2000} placeholder="https://example.com/page" inputMode="url"/><button className="app-submit" disabled={Boolean(busy)}>افزودن به رهگیر <span>←</span></button></form>
    </section>
    {error && <p className="formal-callback-message error" role="alert">{error}</p>}
    {suggestions.length > 0 && <section className="keyword-suggestions"><div><b>پیشنهاد از داده‌های شما</b><span>عبارت‌های پربازدید که هنوز دنبال نمی‌کنید</span></div><div>{suggestions.map((item) => <button key={item.query} type="button" disabled={Boolean(busy)} onClick={() => void mutate({ action: 'add', query: item.query })}><span>{item.query}</span><small>{faNumber.format(item.impressions)} نمایش · رتبه {item.position === null ? '—' : faDecimal.format(item.position)}</small><b>{busy === item.query ? '…' : '+'}</b></button>)}</div></section>}
    <section className="keyword-table-card">
      <div className="keyword-table-head"><div><p className="app-overline">Search Console + DataForSEO</p><h2>کلمات زیر نظر</h2><small>{exactRankNote}</small></div><div className="keyword-table-tools"><label><span>جست‌وجو در فهرست</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="نام کلمه…"/></label><button className="exact-rank-button" type="button" disabled={Boolean(busy) || !initialKeywords.length} onClick={() => void mutate({ action: hasPendingExact ? 'exact-collect' : 'exact-refresh' })}>{busy === (hasPendingExact ? 'exact-collect' : 'exact-refresh') ? 'در حال بررسی…' : hasPendingExact ? 'دریافت نتیجه دقیق' : 'بررسی رتبه دقیق امروز'}</button></div></div>
      {rows.length ? <div className="keyword-table-scroll"><table className="keyword-table"><thead><tr><th>کلمه کلیدی</th><th>میانگین GSC</th><th>تغییر هفتگی</th><th>رتبه دقیق</th><th>روند GSC</th><th>کلیک</th><th>نمایش</th><th>صفحه هدف</th><th><span className="sr-only">عملیات</span></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><b>{item.query}</b><small>Google / همه دستگاه‌ها</small></td><td><strong>{item.position === null ? '—' : faDecimal.format(item.position)}</strong></td><td>{item.change === null ? <span className="rank-change neutral">—</span> : <span className={`rank-change ${item.change < 0 ? 'up' : item.change > 0 ? 'down' : 'neutral'}`}>{item.change < 0 ? '↑' : item.change > 0 ? '↓' : '—'} {item.change ? faDecimal.format(Math.abs(item.change)) : ''}</span>}</td><td><div className="exact-rank" title={item.exactError ?? ''}>{item.exact ? <><strong>{item.exact.rank === null ? 'یافت نشد' : faNumber.format(item.exact.rank)}</strong>{item.exact.change !== null && <span className={item.exact.change < 0 ? 'up' : item.exact.change > 0 ? 'down' : 'neutral'}>{item.exact.change < 0 ? '↑' : item.exact.change > 0 ? '↓' : '—'} {item.exact.change ? faNumber.format(Math.abs(item.exact.change)) : ''}</span>}<small>{item.exact.provider === 'serper' ? 'Serper' : 'DataForSEO'} · {new Date(item.exact.checkedAt).toLocaleDateString('fa-IR')}</small></> : item.exactStatus === 'PENDING' ? <span className="exact-pending">در صف</span> : item.exactStatus === 'FAILED' ? <span className="exact-failed">خطا</span> : <span className="trend-empty">هنوز بررسی نشده</span>}</div></td><td><Trend points={item.daily}/></td><td>{faNumber.format(item.clicks)}</td><td>{faNumber.format(item.impressions)}</td><td className="target-page" title={item.targetPage ?? ''}>{item.targetPage || 'تعیین نشده'}</td><td><button className="remove-keyword" type="button" disabled={Boolean(busy)} onClick={() => void mutate({ action: 'remove', id: item.id })}>{busy === item.id ? '…' : 'حذف'}</button></td></tr>)}</tbody></table></div> : <div className="keyword-empty"><span>⌁</span><h3>هنوز کلمه‌ای زیر نظر نیست.</h3><p>از پیشنهادهای بالا انتخاب کنید یا اولین کلمه را اضافه کنید.</p></div>}
    </section>
  </>;
}

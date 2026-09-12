export type ImportedKeyword = { query: string; targetPage?: string };
export type KeywordImportResult = { items: ImportedKeyword[]; stats: { total: number; valid: number; duplicates: number; errors: number }; errors: string[] };

const keywordHeaders = new Set(['keyword', 'query', 'کلمه کلیدی', 'کلمه', 'عبارت کلیدی']);
const pageHeaders = new Set(['target_url', 'target url', 'url', 'page', 'target page', 'صفحه هدف', 'لینک هدف']);
function cell(value: unknown) { return String(value ?? '').replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' '); }

function delimiterOf(text: string) {
  const sample = text.replace(/^\uFEFF/, '').split(/\r?\n/).find((line) => line.trim()) ?? '';
  let best = ','; let max = 0;
  for (const candidate of [',', ';', '\t']) {
    let count = 0; let quoted = false;
    for (let index = 0; index < sample.length; index++) {
      if (sample[index] === '"') quoted = !quoted;
      else if (!quoted && sample[index] === candidate) count++;
    }
    if (count > max) { max = count; best = candidate; }
  }
  return best;
}

export function parseDelimitedText(text: string) {
  const delimiter = delimiterOf(text);
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index++; } else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(value); value = '';
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value);
  if (row.some((entry) => entry.trim())) rows.push(row);
  if (quoted) throw new Error('یک مقدار نقل‌قول‌شده در CSV بسته نشده است.');
  return rows;
}

export function parseKeywordRows(rows: unknown[][]): KeywordImportResult {
  if (!rows.length) throw new Error('فایل یا متن ورودی خالی است.');
  const first = rows[0].map((value) => cell(value).toLocaleLowerCase('fa'));
  const keywordIndex = first.findIndex((value) => keywordHeaders.has(value));
  const pageIndex = first.findIndex((value) => pageHeaders.has(value));
  const hasHeader = keywordIndex >= 0; const queryIndex = hasHeader ? keywordIndex : 0;
  const dataRows = rows.slice(hasHeader ? 1 : 0).filter((row) => row.some((value) => cell(value)));
  const unique = new Map<string, ImportedKeyword>(); const errors: string[] = []; let duplicates = 0;
  dataRows.forEach((row, index) => {
    const query = cell(row[queryIndex]); const targetPage = pageIndex >= 0 ? cell(row[pageIndex]) : '';
    const rowNumber = index + (hasHeader ? 2 : 1);
    if (!query) { errors.push(`ردیف ${rowNumber}: کلمه کلیدی خالی است.`); return; }
    if (query.length > 250) { errors.push(`ردیف ${rowNumber}: کلمه کلیدی بیشتر از ۲۵۰ نویسه است.`); return; }
    if (targetPage.length > 2000) { errors.push(`ردیف ${rowNumber}: صفحه هدف بیش از حد طولانی است.`); return; }
    if (targetPage) {
      try { const url = new URL(targetPage); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol'); }
      catch { errors.push(`ردیف ${rowNumber}: صفحه هدف باید نشانی کامل HTTP یا HTTPS باشد.`); return; }
    }
    const key = query.toLocaleLowerCase('fa'); if (unique.has(key)) duplicates++;
    unique.set(key, { query, ...(targetPage ? { targetPage } : {}) });
  });
  const items = [...unique.values()];
  if (!items.length) throw new Error(errors[0] ?? 'هیچ کلمه معتبری پیدا نشد.');
  if (items.length > 100) throw new Error('هر ورودی می‌تواند حداکثر ۱۰۰ کلمه یکتا داشته باشد.');
  return { items, stats: { total: dataRows.length, valid: items.length, duplicates, errors: errors.length }, errors };
}

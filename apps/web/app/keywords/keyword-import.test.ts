import { parseDelimitedText, parseKeywordRows } from './keyword-import';

describe('keyword file import', () => {
  it('reads UTF-8 CSV with quoted commas and English headers', () => {
    const rows = parseDelimitedText('\uFEFFkeyword,target_url\r\n"seo, tools",https://example.com/tools');
    expect(parseKeywordRows(rows).items).toEqual([{ query: 'seo, tools', targetPage: 'https://example.com/tools' }]);
  });
  it('detects semicolon and tab delimiters with Persian headers', () => {
    expect(parseKeywordRows(parseDelimitedText('کلمه کلیدی;صفحه هدف\nسئو;https://example.com/seo')).items).toHaveLength(1);
    expect(parseKeywordRows(parseDelimitedText('keyword\ttarget_url\nseo\thttps://example.com')).items).toHaveLength(1);
  });
  it('reports duplicates and invalid target pages without discarding valid rows', () => {
    const result = parseKeywordRows(parseDelimitedText('keyword,target_url\nseo,https://example.com\nSEO,https://example.com/new\nbad,javascript:alert(1)'));
    expect(result.items).toEqual([{ query: 'SEO', targetPage: 'https://example.com/new' }]);
    expect(result.stats).toEqual({ total: 3, valid: 1, duplicates: 1, errors: 1 });
  });
  it('accepts a headerless list and rejects more than 100 unique keywords', () => {
    expect(parseKeywordRows(parseDelimitedText('one\ntwo')).items.map((item) => item.query)).toEqual(['one', 'two']);
    expect(() => parseKeywordRows(Array.from({ length: 101 }, (_, index) => [`keyword-${index}`]))).toThrow('۱۰۰');
  });
});

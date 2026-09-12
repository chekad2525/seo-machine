import { buildKeywordAction } from './keyword-strategy';

describe('keyword strategy actions', () => {
  const base = { change: 0, targetPage: 'https://example.com/page', resultUrl: 'https://www.example.com/page/' };
  it.each([
    [1, 'protect', 'low'], [7, 'quick-win', 'medium'], [15, 'strengthen', 'medium'], [35, 'rebuild', 'high'],
  ])('maps rank %s to %s', (rank, code, priority) => expect(buildKeywordAction({ ...base, rank })).toMatchObject({ code, priority }));
  it('prioritizes a large decline', () => expect(buildKeywordAction({ ...base, rank: 4, change: 3 })).toMatchObject({ code: 'rank-drop', priority: 'urgent' }));
  it('detects a different ranking page', () => expect(buildKeywordAction({ ...base, rank: 5, resultUrl: 'https://example.com/other' })).toMatchObject({ code: 'target-mismatch' }));
  it('marks an absent domain as not ranked', () => expect(buildKeywordAction({ ...base, rank: null, resultUrl: null })).toMatchObject({ code: 'not-ranked' }));
  it('does not label a pending provider task as not ranked', () => expect(buildKeywordAction({ ...base, rank: null, resultUrl: null, status: 'PENDING' })).toMatchObject({ code: 'pending', priority: 'low' }));
});

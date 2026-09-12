import { BadRequestException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { KeywordTrackingService } from '../keyword-tracking/keyword-tracking.service';

jest.mock('@seo-machine/db', () => ({
  prisma: {
    project: { findFirst: jest.fn() },
    trackedKeyword: { findMany: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('keyword spreadsheet import', () => {
  const service = new KeywordTrackingService();

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'project' });
    (prisma.trackedKeyword.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.trackedKeyword.upsert as jest.Mock).mockImplementation((query) => Promise.resolve(query));
    (prisma.$transaction as jest.Mock).mockImplementation((queries) => Promise.all(queries));
  });

  it('deduplicates normalized keywords and stores an optional target page', async () => {
    const result = await service.bulkAdd('user', 'project', [
      { query: '  آموزش   سئو  ' },
      { query: 'آموزش سئو', targetPage: 'https://example.com/seo' },
    ]);

    expect(result).toEqual({ imported: 1, updated: 0, total: 1 });
    expect(prisma.trackedKeyword.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.trackedKeyword.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ query: 'آموزش سئو', targetPage: 'https://example.com/seo' }),
    }));
  });

  it('rejects non-http target pages', async () => {
    await expect(service.bulkAdd('user', 'project', [
      { query: 'seo', targetPage: 'javascript:alert(1)' },
    ])).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects imports that exceed the project limit', async () => {
    (prisma.trackedKeyword.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 100 }, (_, index) => ({ query: `existing-${index}` })));
    await expect(service.bulkAdd('user', 'project', [{ query: 'new keyword' }])).rejects.toThrow('100-keyword');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

import { prisma } from '@seo-machine/db';
import { DataForSeoRankService } from '../search-console/dataforseo-rank.service';
import { SerperRankService } from '../search-console/serper-rank.service';

jest.mock('@seo-machine/db', () => ({ prisma: {
  project: { findFirst: jest.fn() }, trackedKeyword: { findMany: jest.fn() },
  keywordRankSnapshot: { findMany: jest.fn(), upsert: jest.fn() },
  keywordSerpTask: { findMany: jest.fn(), create: jest.fn() },
} }));

describe('project settings in rank providers', () => {
  const originalFetch = global.fetch;
  const env = { ...process.env };
  beforeEach(() => { jest.resetAllMocks(); process.env = { ...env }; });
  afterAll(() => { global.fetch = originalFetch; process.env = env; });

  it('sends country, language and location to Serper and stores desktop history', async () => {
    process.env.SERPER_API_KEY = 'secret';
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ domain: 'example.com', keywordTrackingSetting: { countryCode: 'ae', languageCode: 'ar', locationName: 'Dubai', device: 'mobile' } });
    (prisma.keywordRankSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.trackedKeyword.findMany as jest.Mock).mockResolvedValue([{ id: 'keyword', query: 'seo' }]);
    (prisma.keywordRankSnapshot.upsert as jest.Mock).mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ organic: [{ link: 'https://example.com', position: 2 }] }), { status: 200 }));
    await new SerperRankService().check('user', 'project');
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({ gl: 'ae', hl: 'ar', location: 'Dubai' });
    expect(prisma.keywordRankSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ device: 'desktop' }) }));
  });

  it('sends project location and mobile device to DataForSEO', async () => {
    process.env.DATAFORSEO_LOGIN = 'login'; process.env.DATAFORSEO_PASSWORD = 'password';
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ domain: 'example.com', keywordTrackingSetting: { countryCode: 'ae', languageCode: 'ar', locationName: 'Dubai,United Arab Emirates', device: 'mobile' } });
    (prisma.keywordSerpTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.trackedKeyword.findMany as jest.Mock).mockResolvedValue([{ id: 'keyword', query: 'seo' }]);
    (prisma.keywordSerpTask.create as jest.Mock).mockResolvedValue({});
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ location_code: 1000010, location_name: 'Dubai,Dubai,United Arab Emirates', country_iso_code: 'AE', location_type: 'City' }] }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: 'task', status_code: 20100 }] }), { status: 200 }));
    await new DataForSeoRankService().enqueue('user', 'project');
    const request = (global.fetch as jest.Mock).mock.calls.find((call) => String(call[0]).includes('task_post'));
    expect(JSON.parse(request[1].body)[0]).toMatchObject({ location_code: 1000010, language_code: 'ar', device: 'mobile' });
    expect(JSON.parse(request[1].body)[0]).not.toHaveProperty('location_name');
  });

  it('surfaces a DataForSEO account or task rejection instead of silently skipping every keyword', async () => {
    process.env.DATAFORSEO_LOGIN = 'login'; process.env.DATAFORSEO_PASSWORD = 'password';
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ domain: 'example.com', keywordTrackingSetting: null });
    (prisma.keywordSerpTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.trackedKeyword.findMany as jest.Mock).mockResolvedValue([{ id: 'keyword', query: 'seo' }]);
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ location_code: 2036, location_name: 'Iran', country_iso_code: 'IR', location_type: 'Country' }] }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 40201, status_message: 'Account verification required' }] }), { status: 200 }));
    await expect(new DataForSeoRankService().enqueue('user', 'project')).rejects.toThrow('Account verification required');
  });
});

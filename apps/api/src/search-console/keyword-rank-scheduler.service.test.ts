import { KeywordRankSchedulerService } from './keyword-rank-scheduler.service';
import { ExactRankService } from './exact-rank.service';

jest.mock('@seo-machine/db', () => ({ prisma: {} }));

describe('keyword rank scheduler', () => {
  it('does not start unless explicitly enabled', () => {
    const previous = process.env.SERP_SYNC_ENABLED;
    delete process.env.SERP_SYNC_ENABLED;
    const timer = jest.spyOn(global, 'setInterval');
    const scheduler = new KeywordRankSchedulerService({} as ExactRankService);
    scheduler.onModuleInit();
    expect(timer).not.toHaveBeenCalled();
    scheduler.onModuleDestroy();
    if (previous !== undefined) process.env.SERP_SYNC_ENABLED = previous;
    timer.mockRestore();
  });
});

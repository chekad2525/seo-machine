import { UnauthorizedException } from '@nestjs/common';
import { ExactRankService } from '../search-console/exact-rank.service';
import { KeywordRankSchedulerService } from '../search-console/keyword-rank-scheduler.service';
import { KeywordTrackingController } from './keyword-tracking.controller';
import { KeywordTrackingService } from './keyword-tracking.service';

describe('keyword tracking cron endpoint', () => {
  const previous = process.env.CRON_SECRET;

  afterAll(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it('requires the Vercel cron bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const tick = jest.fn().mockResolvedValue(undefined);
    const controller = new KeywordTrackingController({} as KeywordTrackingService, {} as ExactRankService, { tick } as unknown as KeywordRankSchedulerService);
    await expect(controller.cron('Bearer wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.cron('Bearer test-cron-secret')).resolves.toEqual({ success: true });
    expect(tick).toHaveBeenCalledTimes(1);
  });
});

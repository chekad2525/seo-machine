import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataForSeoRankService } from './dataforseo-rank.service';
import { SerperRankService } from './serper-rank.service';

export type ExactRankProvider = 'serper' | 'dataforseo';

@Injectable()
export class ExactRankService {
  constructor(
    private readonly serper: SerperRankService,
    private readonly dataForSeo: DataForSeoRankService,
  ) {}

  provider(): ExactRankProvider {
    const value = (process.env.SERP_PROVIDER?.trim().toLowerCase() || 'serper') as ExactRankProvider;
    if (!['serper', 'dataforseo'].includes(value)) throw new ServiceUnavailableException('SERP_PROVIDER must be serper or dataforseo.');
    return value;
  }

  enqueue(userId: string, projectId: string) {
    return this.provider() === 'serper'
      ? this.serper.check(userId, projectId)
      : this.dataForSeo.enqueue(userId, projectId);
  }

  collect(userId: string, projectId: string) {
    return this.provider() === 'serper'
      ? this.serper.check(userId, projectId)
      : this.dataForSeo.collect(userId, projectId);
  }
}

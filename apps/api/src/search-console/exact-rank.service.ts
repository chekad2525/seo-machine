import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataForSeoRankService } from './dataforseo-rank.service';
import { SerperRankService } from './serper-rank.service';

export type ExactRankProvider = 'serper' | 'dataforseo';

export function exactRankConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const value = (env.SERP_PROVIDER?.trim().toLowerCase() || 'serper') as ExactRankProvider;
  const valid = value === 'serper' || value === 'dataforseo';
  const configured = valid && (value === 'serper'
    ? Boolean(env.SERPER_API_KEY?.trim())
    : Boolean(env.DATAFORSEO_LOGIN?.trim() && env.DATAFORSEO_PASSWORD?.trim()));
  return { provider: value, valid, configured };
}

@Injectable()
export class ExactRankService {
  constructor(
    private readonly serper: SerperRankService,
    private readonly dataForSeo: DataForSeoRankService,
  ) {}

  provider(): ExactRankProvider {
    const config = exactRankConfiguration();
    if (!config.valid) throw new ServiceUnavailableException('SERP_PROVIDER must be serper or dataforseo.');
    return config.provider;
  }

  enqueue(userId: string, projectId: string, force = false) {
    return this.provider() === 'serper'
      ? this.serper.check(userId, projectId, force)
      : this.dataForSeo.enqueue(userId, projectId, force);
  }

  collect(userId: string, projectId: string) {
    return this.provider() === 'serper'
      ? this.serper.check(userId, projectId)
      : this.dataForSeo.collect(userId, projectId);
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AllProvidersUnavailableException,
  CepNotFoundException,
} from 'src/common/exeptions/exeptions';
import type { CepResult } from './interfaces/cep-result.interface';
import type { ICepProvider } from './interfaces/Icep.provider';
import { CEP_PROVIDERS } from './intergrations/cep-providers.tokens';
import { RESOLUTION_STRATEGY } from './strategies/resolution-strategy.tokens';
import type { ICepResolutionStrategy } from './strategies/interfaces/cep-resolution.strategy.interface';
import { PROVIDER_ORDER_STRATEGY } from './strategies/provider-order.tokens';
import type { IProviderOrderStrategy } from './strategies/interfaces/provider-order.strategy.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);

  constructor(
    private readonly redisService: RedisService,
    @Inject(CEP_PROVIDERS) private readonly providers: ICepProvider[],
    @Inject(RESOLUTION_STRATEGY)
    private readonly resolutionStrategy: ICepResolutionStrategy,
    @Inject(PROVIDER_ORDER_STRATEGY)
    private readonly providerOrderStrategy: IProviderOrderStrategy,
  ) {}

  async findByCep(cep: string): Promise<CepResult> {
    const cacheKey = `cep:${cep}`;

    const cached = await this.redisService.get<CepResult>(cacheKey);
    if (cached) {
      this.logger.log(`CEP ${cep} resolvido via cache`);
      return cached;
    }

    const result = await this.resolveWithFallback(cep);
    await this.redisService.set(cacheKey, result, 60 * 60 * 24 * 30 * 1000);

    return result;
  }

  private async resolveWithFallback(cep: string): Promise<CepResult> {
    const order = this.providerOrderStrategy.getOrder(this.providers);
    const errors: { provider: string; reason: string }[] = [];
    let allProvidersNotFound = order.length > 0;

    for (const provider of order) {
      try {
        return await this.resolutionStrategy.resolve(cep, provider);
      } catch (err) {
        const reason = this.getErrorMessage(err);
        errors.push({ provider: provider.name, reason });

        allProvidersNotFound =
          allProvidersNotFound && err instanceof CepNotFoundException;
        continue;
      }
    }

    if (allProvidersNotFound) {
      throw new CepNotFoundException(cep, 'all');
    }

    throw new AllProvidersUnavailableException(cep, errors);
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}

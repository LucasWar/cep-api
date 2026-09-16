import { Module } from '@nestjs/common';
import { CepService } from './cep.service';
import { CepController } from './cep.controller';
import { HttpClientService } from 'src/common/http/http-client.service';
import { BrasilApiProvider } from './intergrations/brasilapi/brasilapi.provider';
import { ViaCepProvider } from './intergrations/viacep/viacep.provider';
import { CEP_PROVIDERS } from './intergrations/cep-providers.tokens';
import { HttpModule } from '@nestjs/axios';
import { TimeoutResolutionStrategy } from './strategies/timeout-resolution.strategy';
import { RESOLUTION_STRATEGY } from './strategies/resolution-strategy.tokens';
import { RoundRobinProviderOrderStrategy } from './strategies/round-robin-provider-order.strategy';
import { PROVIDER_ORDER_STRATEGY } from './strategies/provider-order.tokens';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [HttpModule, RedisModule],
  controllers: [CepController],
  providers: [
    ViaCepProvider,
    BrasilApiProvider,
    HttpClientService,
    {
      provide: CEP_PROVIDERS,
      useFactory: (viaCep: ViaCepProvider, brasilApi: BrasilApiProvider) => [
        viaCep,
        brasilApi,
      ],
      inject: [ViaCepProvider, BrasilApiProvider],
    },
    TimeoutResolutionStrategy,
    { provide: RESOLUTION_STRATEGY, useExisting: TimeoutResolutionStrategy },
    RoundRobinProviderOrderStrategy,
    {
      provide: PROVIDER_ORDER_STRATEGY,
      useExisting: RoundRobinProviderOrderStrategy,
    },
    CepService,
  ],
})
export class CepModule {}

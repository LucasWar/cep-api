import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CepModule } from './modules/cep/cep.module';
import { AppExceptionFilter } from './common/filters/app-exeption.filter';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [CepModule, ConfigModule.forRoot({ isGlobal: true }), RedisModule],
  providers: [{ provide: APP_FILTER, useClass: AppExceptionFilter }],
})
export class AppModule {}

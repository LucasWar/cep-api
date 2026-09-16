import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: 'localhost',
      port: 6379,

      maxRetriesPerRequest: 1,

      retryStrategy(times) {
        if (times > 3) {
          return null;
        }

        return Math.min(times * 100, 1000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Conectando ao Redis...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis conectado e pronto para uso!');
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis indisponível: ${err.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn('Conexão com Redis fechada.');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Erro ao buscar cache: ${error}`);

      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.set(key, serializedValue, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.warn(`Erro ao salvar cache: ${error}`);
    }
  }
}

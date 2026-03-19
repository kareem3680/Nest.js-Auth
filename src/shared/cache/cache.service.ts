import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 60 * 60; // 1 hour
  private readonly DEFAULT_NAMESPACE = '';
  private readonly ENV_PREFIX: string;

  constructor(private configService: ConfigService) {
    this.ENV_PREFIX =
      this.configService.get('NODE_ENV') === 'production' ? 'prod' : 'dev';
  }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const connectTimeout =
      this.configService.get<number>('REDIS_CONNECT_TIMEOUT') || 5000;

    if (!redisUrl) {
      this.logger.warn('Skipping Redis connection (REDIS_URL not provided)');
      return;
    }

    this.client = createClient({
      url: redisUrl,
      socket: { connectTimeout },
    });

    this.client.on('ready', () => {
      const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'dev';
      const env = nodeEnv.toUpperCase();
      this.logger.log(`Redis Connected (${env} environment)`);
    });

    this.client.on('error', (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Redis Error: ${error.message}`);
    });

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Redis connection failed: ${error.message}`);
      this.logger.warn('Continuing without Redis cache...');
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private buildKey(
    key: string,
    namespace: string = this.DEFAULT_NAMESPACE,
  ): string {
    const nsPart = namespace ? `${namespace}:` : '';
    return `${this.ENV_PREFIX}:${nsPart}${key}`;
  }

  private safeStringify(value: any): string | null {
    try {
      return JSON.stringify(value);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`JSON stringify error: ${error.message}`);
      return null;
    }
  }

  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const finalKey = this.buildKey(key, namespace);

    try {
      if (!this.client?.isOpen) {
        return null;
      }

      const cached = await this.client.get(finalKey);
      if (cached) {
        this.logger.debug(`Cache HIT: ${finalKey}`);
        try {
          return JSON.parse(cached) as T;
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error(
            `Cache parse error - deleting corrupt key: ${finalKey}: ${error.message}`,
          );
          await this.client.del(finalKey);
          return null;
        }
      }

      this.logger.debug(`Cache MISS: ${finalKey}`);
      return null;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttl: number = this.DEFAULT_TTL,
    namespace?: string,
  ): Promise<boolean> {
    const finalKey = this.buildKey(key, namespace);

    try {
      if (!this.client?.isOpen) {
        return false;
      }

      const str = this.safeStringify(value);
      if (str === null) return false;

      await this.client.setEx(finalKey, ttl, str);
      this.logger.debug(`Cache SET: ${finalKey} (TTL: ${ttl}s)`);
      return true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Cache set error: ${error.message}`);
      return false;
    }
  }

  async wrap<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    namespace?: string,
  ): Promise<T> {
    const finalKey = this.buildKey(key, namespace);

    try {
      // Try to get from cache
      const cached = await this.get<T>(key, namespace);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, execute the function
      this.logger.debug(`Cache WRAP - executing function for: ${finalKey}`);
      const result = await fetchFn();

      // Store in cache if result is not undefined
      if (result !== undefined && result !== null) {
        await this.set(key, result, ttl, namespace);
      }

      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Cache wrap error: ${error.message}`);
      // If cache fails, execute the function anyway
      return fetchFn();
    }
  }

  async del(pattern: string, namespace?: string): Promise<number> {
    const finalPattern = this.buildKey(pattern, namespace);

    try {
      if (!this.client?.isOpen) {
        return 0;
      }

      // Direct delete if no wildcard
      if (!finalPattern.includes('*')) {
        const res = await this.client.del(finalPattern);
        this.logger.debug(`Cache DELETED: ${finalPattern}`);
        return res;
      }

      // Wildcard delete using SCAN + pipeline
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const reply = await this.client.scan(cursor, {
          MATCH: finalPattern,
          COUNT: 1000,
        });
        cursor = String(reply.cursor);
        const keys = reply.keys || [];

        if (keys.length) {
          const pipeline = this.client.multi();
          keys.forEach((k) => pipeline.del(k));
          const results = await pipeline.exec();

          const deletedCount = results.reduce((sum, val) => {
            return sum + (typeof val === 'number' ? val : 0);
          }, 0);

          totalDeleted += deletedCount;
        }
      } while (cursor !== '0');

      this.logger.debug(
        `Cache DELETED (pattern): ${finalPattern} (${totalDeleted} keys)`,
      );
      return totalDeleted;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Cache delete error: ${error.message}`);
      return 0;
    }
  }

  async flush(): Promise<boolean> {
    try {
      if (!this.client?.isOpen) {
        return false;
      }

      await this.client.flushAll();
      this.logger.log('Cache FLUSHED');
      return true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Cache flush error: ${error.message}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.quit();
        this.logger.log('Redis disconnected gracefully');
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Error during Redis disconnect: ${error.message}`);
      try {
        this.client.destroy();
        this.logger.warn('Redis force-disconnected');
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error(`Force disconnect failed: ${error.message}`);
      }
    }
  }

  isConnected(): boolean {
    return this.client?.isOpen || false;
  }
}

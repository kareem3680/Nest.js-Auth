import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, APP_GUARD } from '@nestjs/core';

// Config
import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import emailConfig from './config/email.config';

// Modules
import { DatabaseModule } from './shared/database/database.module';
import { CacheModule } from './shared/cache/cache.module';
import { EmailModule } from './shared/email/email.module';
import { TenantModule } from './shared/tenant/tenant.module';
import { IdentityModule } from './modules/identity/identity.module';

// Common
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GlobalTransformInterceptor } from './common/interceptors/transform.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CronJobUtil } from './common/utils/cron-job.util';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        configuration,
        databaseConfig,
        redisConfig,
        jwtConfig,
        emailConfig,
      ],
      envFilePath: '.env',
    }),

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // Shared modules
    DatabaseModule,
    CacheModule,
    EmailModule,
    TenantModule,

    // Feature modules
    IdentityModule,
  ],
  providers: [
    CronJobUtil,
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalTransformInterceptor,
    },
    // Global pipes
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}

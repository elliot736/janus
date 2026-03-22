import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from './db/db.module';
import { JanusAuthModule } from './auth/auth.module';
import { SitesModule } from './sites/sites.module';
import { ChallengeModule } from './challenge/challenge.module';
import { VerificationModule } from './verification/verification.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { HealthModule } from './health/health.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { MetricsModule } from './metrics/metrics.module';
import { GeoIpModule } from './geoip/geoip.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    DbModule,
    JanusAuthModule,
    SitesModule,
    ChallengeModule,
    VerificationModule,
    RateLimitModule,
    AnalyticsModule,
    ApiKeysModule,
    HealthModule,
    CleanupModule,
    MetricsModule,
    GeoIpModule,
    WebhooksModule,
  ],
})
export class AppModule {}

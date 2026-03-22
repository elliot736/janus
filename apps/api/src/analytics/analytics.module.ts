import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { VerificationLogsController } from './verification-logs.controller';
import { AnalyticsGateway } from './analytics.gateway';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, VerificationLogsController, AnalyticsGateway],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

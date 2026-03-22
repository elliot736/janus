import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { VerificationLogsController } from './verification-logs.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, VerificationLogsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

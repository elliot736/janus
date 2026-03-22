import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { VerificationLogsController } from './verification-logs.controller';
import { AnalyticsGateway } from './analytics.gateway';
import { AnalyticsService } from './analytics.service';
import { ChallengeModule } from '../challenge/challenge.module';
import { SitesModule } from '../sites/sites.module';

@Module({
  imports: [ChallengeModule, SitesModule],
  controllers: [AnalyticsController, VerificationLogsController, AnalyticsGateway],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

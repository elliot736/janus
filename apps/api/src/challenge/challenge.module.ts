import { Module } from '@nestjs/common';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { PowService } from './pow.service';
import { SitesModule } from '../sites/sites.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [SitesModule, RateLimitModule],
  controllers: [ChallengeController],
  providers: [ChallengeService, PowService],
  exports: [ChallengeService, PowService],
})
export class ChallengeModule {}

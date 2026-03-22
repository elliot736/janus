import { Module } from '@nestjs/common';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { PowService } from './pow.service';
import { AdaptiveDifficultyService } from './adaptive-difficulty.service';
import { SitesModule } from '../sites/sites.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [SitesModule, RateLimitModule],
  controllers: [ChallengeController],
  providers: [ChallengeService, PowService, AdaptiveDifficultyService],
  exports: [ChallengeService, PowService, AdaptiveDifficultyService],
})
export class ChallengeModule {}

import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { RiskScoringService } from './risk-scoring.service';
import { FingerprintService } from './fingerprint.service';
import { TokenService } from './token.service';
import { ChallengeModule } from '../challenge/challenge.module';
import { SitesModule } from '../sites/sites.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

@Module({
  imports: [ChallengeModule, SitesModule, RateLimitModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    RiskScoringService,
    FingerprintService,
    TokenService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}

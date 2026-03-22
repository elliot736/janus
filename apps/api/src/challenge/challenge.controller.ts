import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Request } from 'express';
import { ChallengeService } from './challenge.service';
import { SiteKey } from '../common/decorators/site-key.decorator';
import { extractClientIp } from '../common/utils/ip';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

@AllowAnonymous()
@UseGuards(RateLimitGuard)
@Controller('api/v1/challenge')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createChallenge(
    @SiteKey() siteKey: string,
    @Req() request: Request,
    @Body() body: { ja3Hash?: string },
  ) {
    if (!siteKey) {
      throw new BadRequestException('X-Site-Key header is required');
    }

    const ipAddress = extractClientIp(request);
    const origin = request.headers['origin'] as string | undefined;

    return this.challengeService.issueChallenge({
      siteKey,
      ipAddress,
      ja3Hash: body?.ja3Hash,
      origin,
    });
  }
}

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
import { VerificationService } from './verification.service';
import { SiteKey } from '../common/decorators/site-key.decorator';
import { extractClientIp } from '../common/utils/ip';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';

interface VerifyBody {
  challengeId: string;
  nonce: string;
  solveTimeMs?: number;
  fingerprint?: Record<string, unknown>;
  behaviorData?: Record<string, unknown>;
}

interface SiteVerifyBody {
  secret: string;
  token: string;
  remoteip?: string;
}

@AllowAnonymous()
@UseGuards(RateLimitGuard)
@Controller('api/v1')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * POST /api/v1/verify
   * Called by the client-side widget after solving the PoW challenge.
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @SiteKey() siteKey: string,
    @Req() request: Request,
    @Body() body: VerifyBody,
  ) {
    if (!siteKey) {
      throw new BadRequestException('X-Site-Key header is required');
    }

    if (!body.challengeId || !body.nonce) {
      throw new BadRequestException(
        'challengeId and nonce are required',
      );
    }

    const ipAddress = extractClientIp(request);
    const origin = request.headers['origin'] as string | undefined;

    return this.verificationService.verify({
      siteKey,
      challengeId: body.challengeId,
      nonce: body.nonce,
      solveTimeMs: body.solveTimeMs,
      fingerprint: body.fingerprint,
      behaviorData: body.behaviorData,
      ipAddress,
      origin,
    });
  }

  /**
   * POST /api/v1/siteverify
   * Called server-side by the site owner to validate a token.
   * Similar to reCAPTCHA/Turnstile siteverify endpoint.
   */
  @Post('siteverify')
  @HttpCode(HttpStatus.OK)
  async siteVerify(@Body() body: SiteVerifyBody) {
    if (!body.secret || !body.token) {
      throw new BadRequestException('secret and token are required');
    }

    return this.verificationService.siteVerify({
      secret: body.secret,
      token: body.token,
      remoteIp: body.remoteip,
    });
  }
}

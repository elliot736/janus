import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { AnalyticsService } from './analytics.service';
import { AdaptiveDifficultyService } from '../challenge/adaptive-difficulty.service';
import { SitesService } from '../sites/sites.service';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly adaptiveDifficulty: AdaptiveDifficultyService,
    private readonly sitesService: SitesService,
  ) {}

  @Get(':siteId/summary')
  async getSummary(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('days') days?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const numDays = Math.max(1, Math.min(365, days ? parseInt(days, 10) || 7 : 7));
    return this.analyticsService.getSummary(
      siteId,
      session.user.id,
      numDays,
    );
  }

  @Get(':siteId/requests-per-day')
  async getRequestsPerDay(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('days') days?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const numDays = Math.max(1, Math.min(365, days ? parseInt(days, 10) || 30 : 30));
    return this.analyticsService.getRequestsPerDay(
      siteId,
      session.user.id,
      numDays,
    );
  }

  @Get(':siteId/pass-fail-ratio')
  async getPassFailRatio(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('days') days?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const numDays = Math.max(1, Math.min(365, days ? parseInt(days, 10) || 7 : 7));
    return this.analyticsService.getPassFailRatio(
      siteId,
      session.user.id,
      numDays,
    );
  }

  @Get(':siteId/risk-distribution')
  async getRiskDistribution(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('days') days?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const numDays = Math.max(1, Math.min(365, days ? parseInt(days, 10) || 7 : 7));
    return this.analyticsService.getRiskDistribution(
      siteId,
      session.user.id,
      numDays,
    );
  }

  @Get(':siteId/top-ips')
  async getTopIps(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const numDays = Math.max(1, Math.min(365, days ? parseInt(days, 10) || 7 : 7));
    const numLimit = Math.max(1, Math.min(100, limit ? parseInt(limit, 10) || 10 : 10));
    return this.analyticsService.getTopIps(
      siteId,
      session.user.id,
      numDays,
      numLimit,
    );
  }

  @Get(':siteId/adaptive-difficulty')
  async getAdaptiveDifficulty(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Validate ownership
    const site = await this.sitesService.findOneByOwner(siteId, session.user.id);
    const settings = site.settings as Record<string, unknown> | null;
    const baseDifficulty = (settings?.powDifficulty as number) ?? 4;
    const bonus = await this.adaptiveDifficulty.getDifficultyBonus(siteId);
    const effective = Math.min(baseDifficulty + bonus, 8);

    return {
      baseDifficulty,
      bonus,
      effectiveDifficulty: effective,
      isElevated: bonus > 0,
    };
  }
}

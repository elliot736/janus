import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { AnalyticsService } from './analytics.service';

@Controller('api/v1/sites')
export class VerificationLogsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':siteId/verifications')
  async getVerifications(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const numPage = Math.max(1, page ? parseInt(page, 10) || 1 : 1);
    const numPageSize = Math.max(1, Math.min(100, pageSize ? parseInt(pageSize, 10) || 50 : 50));
    return this.analyticsService.getVerificationLogs(
      siteId,
      session.user.id,
      numPage,
      numPageSize,
    );
  }

  @Delete(':siteId/data')
  async deleteData(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Query('ip') ip?: string,
    @Query('fingerprint') fingerprint?: string,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!ip && !fingerprint) {
      throw new BadRequestException(
        'At least one of "ip" or "fingerprint" query parameter is required',
      );
    }

    return this.analyticsService.deleteData(
      siteId,
      session.user.id,
      ip,
      fingerprint,
    );
  }
}

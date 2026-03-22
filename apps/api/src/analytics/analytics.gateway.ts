import { Controller, Get, Param, Res, UnauthorizedException } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';

/**
 * Server-Sent Events endpoint for real-time analytics.
 * Pushes updated summary stats every 5 seconds.
 * The connection is authenticated and site-scoped.
 */
@Controller('api/v1/analytics')
export class AnalyticsGateway {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':siteId/stream')
  async stream(
    @Session() session: { user: { id: string } },
    @Param('siteId') siteId: string,
    @Res() res: Response,
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering for SSE
    res.flushHeaders();

    // Send initial data immediately
    await this.sendUpdate(res, siteId, session.user.id);

    // Push updates every 5 seconds
    const interval = setInterval(async () => {
      try {
        await this.sendUpdate(res, siteId, session.user.id);
      } catch {
        clearInterval(interval);
        res.end();
      }
    }, 5000);

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  }

  private async sendUpdate(res: Response, siteId: string, userId: string) {
    const summary = await this.analyticsService.getSummary(siteId, userId, 1);
    res.write(`data: ${JSON.stringify(summary)}\n\n`);
  }
}

import { Controller, Get, Header, ForbiddenException } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@AllowAnonymous()
@Controller()
export class MetricsController {
  private readonly metricsToken?: string;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {
    this.metricsToken = this.configService.get<string>('METRICS_TOKEN');
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(@Req() request: Request): string {
    if (this.metricsToken) {
      const provided = request.headers['authorization']?.replace('Bearer ', '');
      if (provided !== this.metricsToken) {
        throw new ForbiddenException('Invalid metrics token');
      }
    }
    return this.metricsService.serialize();
  }
}

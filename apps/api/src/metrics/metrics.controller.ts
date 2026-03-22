import { Controller, Get, Header } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { MetricsService } from './metrics.service';

@AllowAnonymous()
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    return this.metricsService.serialize();
  }
}

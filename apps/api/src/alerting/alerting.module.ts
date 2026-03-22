import { Global, Module } from '@nestjs/common';
import { AlertingService } from './alerting.service';

@Global()
@Module({
  providers: [AlertingService],
  exports: [AlertingService],
})
export class AlertingModule {}

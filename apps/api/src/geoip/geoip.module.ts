import { Global, Module } from '@nestjs/common';
import { GeoIpService } from './geoip.service';

@Global()
@Module({
  providers: [GeoIpService],
  exports: [GeoIpService],
})
export class GeoIpModule {}

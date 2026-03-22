import { Global, Module, OnModuleInit } from '@nestjs/common';
import { PluginRegistryService } from './plugin-registry.service';
import { rateAbusePlugin, timeOfDayPlugin } from './builtin';

@Global()
@Module({
  providers: [PluginRegistryService],
  exports: [PluginRegistryService],
})
export class PluginsModule implements OnModuleInit {
  constructor(private readonly registry: PluginRegistryService) {}

  onModuleInit() {
    // Register built-in plugins
    this.registry.registerGlobal(rateAbusePlugin);
    this.registry.registerGlobal(timeOfDayPlugin);
  }
}

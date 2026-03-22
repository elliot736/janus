import { Global, Module } from '@nestjs/common';
import { dbProvider } from './db.provider';

@Global()
@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DbModule {}

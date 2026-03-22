import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth';

@Module({
  imports: [
    BetterAuthModule.forRoot({
      auth,
      isGlobal: true,
      disableTrustedOriginsCors: true,
      bodyParser: {
        rawBody: true,
      },
    }),
  ],
  exports: [BetterAuthModule],
})
export class JanusAuthModule {}

import 'reflect-metadata';
import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret) throw new Error('COOKIE_SECRET environment variable is required');
  app.use(cookieParser(cookieSecret));

  const corsOrigin = process.env.CORS_ORIGIN?.split(',');
  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }
  app.enableCors({
    origin: corsOrigin || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Site-Key', 'X-Real-IP'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  // Swagger / OpenAPI docs (non-production only)
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Janus API')
      .setDescription('Self-hosted bot detection platform API')
      .setVersion('0.1.0')
      .addApiKey({ type: 'apiKey', name: 'X-Site-Key', in: 'header' }, 'site-key')
      .addCookieAuth('better-auth.session_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Janus API is running on http://0.0.0.0:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API docs available at http://0.0.0.0:${port}/docs`);
  }
}

bootstrap();

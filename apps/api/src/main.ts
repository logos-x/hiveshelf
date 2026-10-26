import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const origins = (config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();
  await app.listen(config.get('PORT') ?? 3001);
}
void bootstrap();

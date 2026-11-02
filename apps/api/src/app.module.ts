import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { AppConfigModule } from './config/app-config.module.js';
import { LoggerModule } from 'nestjs-pino';
import { Env } from './config/env.schema.js';
import { buildLoggerParams } from './logging/logger.config.js';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { PrismaModule } from './prisma/prisma.module.ts';
import { StorageModule } from './storage/storage.module.ts';

@Module({
  imports: [
    AppConfigModule,
    StorageModule,
    PrismaModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildLoggerParams({
          isProd: config.get('NODE_ENV', { infer: true }) === 'production',
          level: config.get('LOG_LEVEL', { infer: true }),
        }),
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}

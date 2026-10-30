import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { AppConfigModule } from './config/app-config.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AppConfigModule],
  controllers: [AppController, HealthController],
})
export class AppModule {}

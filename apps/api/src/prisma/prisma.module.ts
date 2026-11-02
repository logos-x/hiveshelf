import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.ts';
import { PrismaService } from './prisma.service.ts';

@Module({
  imports: [AppConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

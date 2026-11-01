import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env', '../../.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
  ],
})
export class AppConfigModule {}

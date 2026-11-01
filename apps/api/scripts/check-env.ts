import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/config/env.schema';

async function main(): Promise<void> {
  try {
    await ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env', '../../.env'],
      validate: validateEnv,
    });

    console.log('API environment configuration is valid.');
  } catch (error: unknown) {
    console.error(
      error instanceof Error
        ? error.message
        : 'Failed to validate API enviroment configuration.',
    );

    process.exitCode = 1;
  }
}

void main();

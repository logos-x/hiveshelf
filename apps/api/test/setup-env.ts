import { inject } from 'vitest';

declare module 'vitest' {
  interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

const databaseUrl = inject('testDatabaseUrl');

if (!databaseUrl) {
  throw new Error('Validated test database URL is missing.');
}

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.PORT = '3001';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_TEST = databaseUrl;
process.env.STORAGE_DRIVER = 'memory';
process.env.EMAIL_DRIVER = 'memory';

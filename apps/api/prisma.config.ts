import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

const apiDir = dirname(fileURLToPath(import.meta.url));

config({
  path: [
    resolve(apiDir, '.env.local'),
    resolve(apiDir, '.env'),
    resolve(apiDir, '../../.env'),
  ],
  override: false,
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});

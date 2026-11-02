import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

export const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

config({
  path: [
    resolve(apiDir, '.env.local'),
    resolve(apiDir, '.env'),
    resolve(apiDir, '../../.env'),
  ],
  override: false,
  quiet: true,
});

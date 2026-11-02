import { createRequire } from 'node:module';
import type { TestProject } from 'vitest/node';
import { assertTestDatabase } from './database.guard.ts';
import { spawnSync } from 'node:child_process';
import { apiDir } from '../scripts/load-env.ts';

const require = createRequire(import.meta.url);

export default function setup(project: TestProject): void {
  const databaseUrl = assertTestDatabase(
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_TEST,
  );

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    DATABASE_URL_TEST: databaseUrl,
  };

  const prismaCli = require.resolve('prisma/build/index.js');

  for (const args of [
    ['migrate', 'deploy'],
    ['db', 'seed'],
    ['db', 'seed'],
  ]) {
    const result = spawnSync(process.execPath, [prismaCli, ...args], {
      cwd: apiDir,
      env,
      stdio: 'inherit',
      shell: false,
      timeout: 60000,
    });

    if (result.error || result.status !== 0) {
      throw new Error('Test database preparation failed.');
    }
  }

  project.provide('testDatabaseUrl', databaseUrl);
}

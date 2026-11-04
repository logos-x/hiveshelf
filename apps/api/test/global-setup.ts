import { createRequire } from 'node:module';
import type { TestProject } from 'vitest/node';
import { assertTestDatabase } from './database.guard.ts';
import { spawnSync } from 'node:child_process';
import { apiDir } from '../scripts/load-env.ts';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const require = createRequire(import.meta.url);

export default async function setup(project: TestProject) {
  const baseUrl = assertTestDatabase(
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_TEST,
  );

  const databaseName = `hiveshelf_test_${randomUUID().replaceAll('-', '')}`;

  const testUrl = new URL(baseUrl);
  testUrl.pathname = `/${databaseName}`;
  testUrl.search = '';

  const adminUrl = new URL(baseUrl);
  adminUrl.search = '';

  const admin = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });

  let databaseCreated = false;

  async function cleanup(): Promise<void> {
    try {
      if (databaseCreated) {
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);

        databaseCreated = false;
        console.log(`[e2e] Dropped database: ${databaseName}`);
      }
    } finally {
      await admin.end();
    }
  }

  try {
    await admin.connect();

    await admin.query(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);

    databaseCreated = true;
    console.log(`[e2e] Created database: ${databaseName}`);

    const databaseUrl = testUrl.toString();

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

    return cleanup;
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Test database setup and cleanup failed.',
      );
    }

    throw error;
  }
}

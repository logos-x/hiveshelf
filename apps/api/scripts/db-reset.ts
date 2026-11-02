import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { apiDir } from './load-env.js';
import { assertSafeReset } from './db-reset.guard.js';

const require = createRequire(import.meta.url);

function main(): void {
  if (process.argv.length > 2) {
    throw new Error('db:reset does not accept additional arguments.');
  }

  const url = assertSafeReset(process.env.DATABASE_URL, process.env.NODE_ENV);

  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
  };

  const prismaCli = require.resolve('prisma/build/index.js');

  console.log(
    `Reset target: ${url.hostname}:${url.port || '5432'}${url.pathname}`,
  );
  console.log('All data in the target schema will be deleted.');

  for (const args of [
    ['migrate', 'reset'],
    ['db', 'seed'],
  ]) {
    const result = spawnSync(process.execPath, [prismaCli, ...args], {
      cwd: apiDir,
      env,
      stdio: 'inherit',
      shell: false,
    });

    if (result.error || result.status === null) {
      throw new Error('Could not complete the Prisma command.');
    }

    if (result.status !== 0) {
      process.exitCode = result.status;
      return;
    }
  }

  console.log('Database reset and seed completed.');
}

try {
  main();
} catch (error: unknown) {
  console.error(
    error instanceof Error ? error.message : 'Database reset failed.',
  );

  process.exitCode = 1;
}

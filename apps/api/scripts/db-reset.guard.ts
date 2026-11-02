const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const RESETTABLE_DATABASES = new Set(['hiveshelf', 'hiveshelf_test']);

export function assertSafeReset(
  rawUrl: string | undefined,
  nodeEnv: string | undefined,
): URL {
  if (
    nodeEnv !== undefined &&
    nodeEnv !== 'development' &&
    nodeEnv !== 'test'
  ) {
    throw new Error('Reset is only allowed in development or test.');
  }

  if (!rawUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Reset requires a PostgreSQL URL.');
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error('Reset is only allowed on a local database host.');
  }

  const database = url.pathname.slice(1);

  if (!RESETTABLE_DATABASES.has(database)) {
    throw new Error('Database is not in the reset allowlist.');
  }

  for (const key of url.searchParams.keys()) {
    if (key !== 'schema') {
      throw new Error('Reset URL only permits the schema parameter.');
    }
  }

  const schemas = url.searchParams.getAll('schema');

  if (schemas.length > 1 || (schemas.length === 1 && schemas[0] !== 'public')) {
    throw new Error('Reset is only allowed on the public schema.');
  }

  return url;
}

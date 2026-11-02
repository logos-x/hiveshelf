function parseDatabaseUrl(value: string | undefined, name: string): URL {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} is invalid.`);
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${name} must use PostgreSQL.`);
  }

  return url;
}

function normalizedHost(host: string): string {
  return ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'loopback' : host;
}

export function assertTestDatabase(
  developmentUrl: string | undefined,
  testUrl: string | undefined,
): string {
  const development = parseDatabaseUrl(developmentUrl, 'DATABASE_URL');
  const test = parseDatabaseUrl(testUrl, 'DATABASE_URL_TEST');

  const sameDatabase =
    normalizedHost(development.hostname) === normalizedHost(test.hostname) &&
    (development.port || '5432') === (test.port || '5432') &&
    development.pathname === test.pathname;

  if (sameDatabase) {
    throw new Error('Test database must differ from development database.');
  }

  if (normalizedHost(test.hostname) !== 'loopback') {
    throw new Error('Tests currently require a local PostgreSQL host.');
  }

  if (test.pathname !== '/hiveshelf_test') {
    throw new Error('Test database must be hiveshelf_test.');
  }

  for (const key of test.searchParams.keys()) {
    if (key !== 'schema') {
      throw new Error('Test URL only permits the schema parameter.');
    }
  }

  const schemas = test.searchParams.getAll('schema');

  if (schemas.length > 1 || (schemas.length === 1 && schemas[0] !== 'public')) {
    throw new Error('Tests currently require the public schema.');
  }

  return test.toString();
}

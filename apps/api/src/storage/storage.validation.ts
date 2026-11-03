export function assertValidKey(key: string): void {
  if (
    key.trim().length === 0 ||
    key.startsWith('/') ||
    key.includes('..') ||
    Array.from(key).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

export function assertValidTtl(ttlSeconds: number): void {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 604800) {
    throw new Error(
      'Storage URL TTL must be an integer from 1 to 604800 seconds',
    );
  }
}

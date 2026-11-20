import { Bcp47 } from '@fgv/ts-bcp47';
/**
 * Validates against the package's bundled IANA registry
 * and normalizes letter casing.
 */
export function normalizeLanguageTag(input: unknown): string {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new RangeError('Invalid language tag');
  }

  const result = Bcp47.tag(input.trim(), {
    validity: 'valid',
    normalization: 'canonical',
  });

  if (result.isFailure()) {
    throw new RangeError('Invalid language tag');
  }

  return result.value.tag;
}

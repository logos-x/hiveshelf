import { describe, expect, it } from 'vitest';
import { normalizeLanguageTag } from './language-tag.ts';

describe('normalizeLanguageTag', () => {
  it.each([
    ['vi', 'vi'],
    ['EN', 'en'],
    ['en-us', 'en-US'],
    ['zh-hant', 'zh-Hant'],
    [' vi ', 'vi'],
    ['x-private', 'x-private'],
    ['i-klingon', 'i-klingon'],
    ['i-default', 'i-default'],
    ['en-x-custom', 'en-x-custom'],
    ['en-u-ca-gregory', 'en-u-ca-gregory'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeLanguageTag(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'vi_VN',
    'en--US',
    null,
    undefined,
    123,
    'qzz',
    'en-AB',
    'en-Abcd',
    'en-unknown',
    'sl-rozaj-rozaj',
    'en-u-ca-gregory-u-nu-latn',
  ])('rejects invalid input %j', (input) => {
    expect(() => normalizeLanguageTag(input)).toThrow(RangeError);
  });
});

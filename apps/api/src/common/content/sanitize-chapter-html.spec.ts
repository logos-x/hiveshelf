import { describe, expect, it } from 'vitest';
import { sanitizeChapterHtml } from './sanitize-chapter-html.ts';

describe('sanitizeChapterHtml', () => {
  it('removes executable content while preserving safe text', () => {
    const input =
      '<p onclick="alert(1)">Hello <strong>you</strong></p>' +
      '<script>alert(1)</script>' +
      '<img src="https://example.com/image.png" alt="image">';

    expect(sanitizeChapterHtml(input)).toBe(
      '<p id="p-1">Hello <strong>you</strong></p>',
    );
  });

  it('preserves supported formatting and list numbering', () => {
    const input =
      '<h2>Title</h2>' +
      '<blockquote><p>Type of <em>explanation</em></p></blockquote>' +
      '<ol start="3"><li value="5"><b>Item</b> first</li></ol>';

    expect(sanitizeChapterHtml(input)).toBe(
      '<h2>Title</h2>' +
        '<blockquote><p id="p-1">Type of <em>explanation</em></p></blockquote>' +
        '<ol start="3"><li value="5"><b>Item</b> first</li></ol>',
    );
  });

  it('replaces caller-supplied link attributes', () => {
    const result = sanitizeChapterHtml(
      '<a href="https://example.com/book" rel="opener" ' +
        'target="_blank" onclick="alert(1)">More...</a>',
    );

    expect(result).toBe(
      '<a href="https://example.com/book" ' +
        'rel="noopener noreferrer nofollow">More...</a>',
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'vbscript:msgbox(1)',
    'file://etc/passwd',
    '//example.com/book',
    '/books/example',
    '#p-1',
  ])(`removes a forbidden href: %s`, (href) => {
    expect(sanitizeChapterHtml(`<a href="${href}">Content</a>`)).toBe(
      '<a>Content</a>',
    );
  });

  it('generates sequential anchors instead of trusting input IDs', () => {
    expect(
      sanitizeChapterHtml('<p id="attacker">First</p><p id="p-99">Second</p>'),
    ).toBe('<p id="p-1">First</p><p id="p-2">Second</p>');
  });

  it('restarts paragraph numbering for each call', () => {
    sanitizeChapterHtml('<p>First</p><p>Second</p>');

    expect(sanitizeChapterHtml('<p>Other Chapter</p>')).toBe(
      '<p id="p-1">Other Chapter</p>',
    );
  });

  it('is idempotent', () => {
    const input =
      '<h3>Chapter One</h3>' +
      '<p id="custom">Vietnamese &amp; <i>format</i></p>' +
      '<a href="https://example.com">Link</a>';

    const result = sanitizeChapterHtml(input);

    expect(sanitizeChapterHtml(result)).toBe(result);
  });

  it('supports empty content', () => {
    expect(sanitizeChapterHtml('')).toBe('');
  });
});

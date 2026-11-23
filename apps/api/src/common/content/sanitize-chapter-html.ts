import sanitizeHtml from 'sanitize-html';

const LINK_REL = 'noopener noreferrer nofollow';

const ALLOWED_TAGS = [
  'p',
  'br',
  'h2',
  'h3',
  'h4',
  'strong',
  'b',
  'em',
  'i',
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
];

function sanitizeHref(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  try {
    const url = new URL(value.trim());

    if (!['http:', 'https:', 'mailto:'].includes(url.protocol))
      return undefined;

    return url.href;
  } catch {
    return undefined;
  }
}

function sanitizeIntegerAttribute(
  value: string | undefined,
): string | undefined {
  if (value === undefined || !/^-?\d+$/.test(value)) return undefined;

  const number = Number(value);

  if (!Number.isInteger(number) || number < -2147483648 || number > 2147483647)
    return undefined;

  return String(number);
}

const CHAPTER_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,

  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    ol: ['start'],
    li: ['value'],
  },

  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,

  disallowedTagsMode: 'discard',

  nonTextTags: [
    'script',
    'style',
    'textarea',
    'option',
    'xmp',
    'noscript',
    'iframe',
    'object',
    'embed',
    'svg',
    'math',
    'form',
    'template',
  ],

  parseStyleAttributes: false,

  transformTags: {
    a: (_tagName, attributes) => {
      const href = sanitizeHref(attributes.href);
      const attribs: Record<string, string> = {};

      if (attributes.title !== undefined) attribs.title = attributes.title;

      if (href !== undefined) {
        attribs.href = href;
        attribs.rel = LINK_REL;
      }

      return { tagName: 'a', attribs };
    },

    ol: (_tagName, attributes) => {
      const start = sanitizeIntegerAttribute(attributes.start);
      const attribs: Record<string, string> = {};

      if (start !== undefined) {
        attribs.start = start;
      }

      return {
        tagName: 'ol',
        attribs,
      };
    },

    li: (_tagName, attributes) => {
      const value = sanitizeIntegerAttribute(attributes.value);
      const attribs: Record<string, string> = {};

      if (value !== undefined) {
        attribs.value = value;
      }

      return {
        tagName: 'li',
        attribs,
      };
    },
  },
};

export function sanitizeChapterHtml(html: string): string {
  const cleanHtml = sanitizeHtml(html, CHAPTER_HTML_OPTIONS);

  let paragraphIndex = 0;

  return sanitizeHtml(cleanHtml, {
    ...CHAPTER_HTML_OPTIONS,
    allowedAttributes: {
      ...CHAPTER_HTML_OPTIONS.allowedAttributes,
      p: ['id'],
    },
    transformTags: {
      ...CHAPTER_HTML_OPTIONS.transformTags,
      p: () => ({
        tagName: 'p',
        attribs: {
          id: `p-${++paragraphIndex}`,
        },
      }),
    },
  });
}

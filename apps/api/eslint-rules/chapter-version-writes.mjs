const WRITE_METHODS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'upsert',
  'update',
  'updateMany',
  'updateManyAndReturn',
]);

function propertyName(member) {
  if (!member.computed && member.property.type === 'Identifier') {
    return member.property.name;
  }

  if (
    member.computed &&
    member.property.type === 'Literal' &&
    typeof member.property.value === 'string'
  ) {
    return member.property.value;
  }

  return undefined;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require ChapterVersion writes to pass through the chapter writer',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowCreate: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbidden:
        'ChapterVersion.{{method}} is restricted. Create content through createChapterVersion; keep snapshots immutable.',
      dynamic:
        'Dynamic access to ChapterVersion methods is restricted. Use an explicit method name.',
    },
  },

  create(context) {
    const allowCreate = context.options[0]?.allowCreate === true;

    return {
      MemberExpression(node) {
        const delegate = node.object;

        if (
          delegate.type !== 'MemberExpression' ||
          propertyName(delegate) !== 'chapterVersion'
        ) {
          return;
        }

        const method = propertyName(node);

        if (method === undefined) {
          context.report({
            node,
            messageId: 'dynamic',
          });
          return;
        }

        if (!WRITE_METHODS.has(method)) {
          return;
        }

        if (allowCreate && method === 'create') {
          return;
        }

        context.report({
          node,
          messageId: 'forbidden',
          data: { method },
        });
      },
    };
  },
};

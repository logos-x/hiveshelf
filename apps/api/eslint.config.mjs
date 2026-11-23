import nestConfig from '@hiveshelf/config/eslint/nest';
import chapterVersionWrites from './eslint-rules/chapter-version-writes.mjs';

export default [
  ...nestConfig,
  {
    ignores: ['src/generated/prisma/**'],
  },

  {
    files: ['src/**/*.ts', 'prisma/**/*.ts', 'scripts/**/*.ts', 'test/**/*.ts'],

    plugins: {
      hiveshelf: {
        rules: {
          'chapter-version-writes': chapterVersionWrites,
        },
      },
    },

    rules: {
      'hiveshelf/chapter-version-writes': 'error',
    },

    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },

  {
    files: ['src/common/content/chapter-version.writer.ts'],

    rules: {
      'hiveshelf/chapter-version-writes': ['error', { allowCreate: true }],
    },
  },
];

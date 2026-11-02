import nestConfig from '@hiveshelf/config/eslint/nest';
export default [
  ...nestConfig,
  {
    ignores: ['src/generated/prisma/**'],
  },
];

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.int.spec.ts'],
    setupFiles: ['./scripts/load-env.ts'],
    fileParallelism: false,
    hookTimeout: 15000,
    testTimeout: 20000,
  },
});

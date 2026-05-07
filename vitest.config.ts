import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**'],
    },
  },
});

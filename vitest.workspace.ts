import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      globals: false,
      environment: 'node',
      include: [
        'packages/core/src/**/*.test.ts',
        'packages/cli/src/**/*.test.ts',
        'packages/action/src/**/*.test.ts',
        'packages/vscode/src/**/*.test.ts',
        'packages/mcp/src/**/*.test.ts',
        'packages/claude-code-skill/src/**/*.test.ts',
        'packages/web/src/**/*.test.ts',
      ],
      exclude: ['**/dist/**', '**/node_modules/**'],
    },
  },
  './packages/react',
]);

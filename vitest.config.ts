import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['frontend/test/setup.ts'],
    include: [
      'backend/src/**/*.unit.test.ts',
      'frontend/src/**/*.test.ts',
      'frontend/src/**/*.test.tsx'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'backend/src/**/*.ts',
        'frontend/src/**/*.ts',
        'frontend/src/**/*.tsx'
      ],
      exclude: [
        'backend/src/**/*.test.ts',
        'backend/src/**/*.unit.test.ts',
        'frontend/src/**/*.test.ts',
        'frontend/src/**/*.test.tsx',
        'backend/src/server.ts',
        'frontend/src/main.tsx',
        'frontend/src/vite-env.d.ts',
        'frontend/src/types/puter.d.ts'
      ]
    }
  }
});

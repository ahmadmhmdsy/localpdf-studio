import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/tests/**/*',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        'src/lib/**': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'pdfjs-dist/build/pdf.worker.min.mjs?url': path.resolve(__dirname, 'src/tests/mocks/pdfWorkerMock.ts'),
    },
  },
});

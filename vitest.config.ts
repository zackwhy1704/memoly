import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Don't pick up stale copies living in git worktrees under .claude/.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});

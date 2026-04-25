import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest config — separate from vite.config.ts so test runs don't
 * inherit the production base path or the Tailwind plugin (which
 * isn't needed for store/unit tests). React plugin stays so JSX in
 * future component tests works without extra setup. Audit: D2.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});

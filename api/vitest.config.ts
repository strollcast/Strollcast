import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      'cloudflare:workers': new URL('./test/mocks/cloudflare-workers.ts', import.meta.url).pathname,
    },
  },
});

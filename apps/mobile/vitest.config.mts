import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    server: { deps: { inline: [/packages[\\/](api-client|validation|types)/] } },
  },
});

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts', 'app/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/lib/**/*.ts'],
      exclude: ['app/lib/sleep.ts'], // shim only
    },
  },
})

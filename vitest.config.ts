import { defineConfig } from 'vitest/config'

// Unit tests run in plain Node — the modules under test (the reducer + the
// RuntimeSession driven by a fake transport) touch no DOM. This config is kept
// separate from vite.config.ts so the app's build plugins don't load here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

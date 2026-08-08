import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The content layer reads from disk relative to cwd, so tests must run from
    // the repository root — which is also how `next build` runs it.
    root: process.cwd(),
  },
  resolve: {
    alias: { '@': path.join(process.cwd(), 'src') },
  },
})

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Emits a self-contained server bundle in `.next/standalone`, including only
   * the `node_modules` actually reachable from the build. This is what keeps the
   * runtime image small: the runner stage copies that folder instead of
   * installing dependencies, so `sharp` and the whole MDX toolchain never reach
   * production.
   */
  output: 'standalone',

  reactStrictMode: true,

  images: {
    // AVIF first, WebP as the fallback. Both are produced at build time by
    // `sharp` for the sizes actually requested, so the runtime does no encoding.
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig

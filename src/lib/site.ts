/**
 * Canonical origin of the deployment.
 *
 * Read through a function rather than exported as a constant so that a missing
 * variable fails where it is used, with a message naming the variable, instead
 * of producing `undefined/articles/x` in a sitemap that nobody looks at until
 * search engines have already crawled it.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  // Trailing slashes make every concatenated path double-slashed.
  return raw.replace(/\/+$/, '')
}

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}/${path.replace(/^\/+/, '')}`
}

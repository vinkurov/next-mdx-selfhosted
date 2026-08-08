/**
 * The single place a media path becomes a URL.
 *
 * Three lines, and they exist in v1 not because anything needs them yet but
 * because of what they cost later. Media lives in `public/media` today. When it
 * outgrows the repository — and it will, because git is a poor home for video —
 * the move to object storage becomes an edit to this function and a change to
 * one environment variable.
 *
 * The alternative is that every `<Figure>` and `<Video>` across every article
 * holds a hardcoded `/media/...` path, and the migration becomes a search and
 * replace over content, done by hand, with the mistakes only visible as broken
 * images in production.
 *
 * This is the concrete form of "lay the groundwork, don't build the thing".
 */
const BASE = process.env.MEDIA_BASE_URL ?? '/media'

export function mediaUrl(path: string): string {
  return `${BASE.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

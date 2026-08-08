import { ImageResponse } from 'next/og'

export const alt = 'next-mdx-selfhosted — референс архитектуры контентного сайта'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The site-wide Open Graph image, rendered at build time.
 *
 * Drawn rather than loaded from a file so it cannot fall out of sync with the
 * title, and so there is no 1200×630 PNG in the repository to keep updating.
 *
 * Deliberately typographic: no custom font is loaded. A webfont here means
 * reading a `.ttf` from disk on every render and shipping it in the image
 * pipeline, for a picture most people see as a 400px-wide thumbnail in a chat
 * window. System fonts are enough for that, and this stays a file with no
 * assets behind it.
 */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: '#101216',
        color: '#e8eaee',
      }}
    >
      <div style={{ display: 'flex', fontSize: 30, color: '#6fa2ff' }}>
        next-mdx-selfhosted
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: 68,
          lineHeight: 1.15,
          letterSpacing: -1.5,
          maxWidth: 900,
        }}
      >
        Контентный сайт на Next.js без CMS
      </div>

      <div style={{ display: 'flex', fontSize: 28, color: '#99a1b0' }}>
        MDX в git · валидация на сборке · standalone-образ
      </div>
    </div>,
    size,
  )
}

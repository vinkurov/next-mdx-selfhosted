import Image from 'next/image'
import { mediaUrl } from '@/content/media'

export interface FigureProps {
  /** Path inside the media root, e.g. `articles/my-post/diagram.png`. */
  src: string
  /** Required. A figure with no alt text is a figure screen readers cannot read. */
  alt: string
  caption?: string
  width: number
  height: number
  priority?: boolean
}

/**
 * An image with a caption.
 *
 * `width` and `height` are required rather than optional. Next needs them to
 * reserve space before the image loads, and without them the article reflows as
 * each image arrives — the layout shift that dominates a content site's Core Web
 * Vitals score. Making them required means the build refuses a `<Figure>` that
 * would cause it, instead of shipping one that silently does.
 */
export function Figure({
  src,
  alt,
  caption,
  width,
  height,
  priority = false,
}: FigureProps) {
  return (
    <figure className="my-8">
      <Image
        src={mediaUrl(src)}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 768px"
        className="border-rule h-auto w-full rounded-lg border"
      />
      {caption !== undefined && (
        <figcaption className="text-ink-muted mt-2 text-sm">{caption}</figcaption>
      )}
    </figure>
  )
}

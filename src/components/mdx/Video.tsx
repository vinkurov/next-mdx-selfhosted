import { mediaUrl } from '@/content/media'

export interface VideoProps {
  /** Path inside the media root, e.g. `articles/my-post/demo.mp4`. */
  src: string
  /** Poster frame. Required: without one the player is a black rectangle. */
  poster: string
  caption?: string
  width: number
  height: number
}

/**
 * A plain `<video>` element.
 *
 * No HLS, no adaptive bitrate, no player library. A short MP4 served with range
 * requests is what a progress-enhanced browser already handles well, and every
 * player library is JavaScript shipped to readers who mostly will not press play.
 *
 * `preload="metadata"` fetches enough for duration and dimensions without pulling
 * the whole file, and there is no autoplay: a video that starts on its own is a
 * decision made for the reader rather than by them.
 *
 * When long videos appear, an HLS source goes here and this component's props do
 * not change — which is the reason the `src`/`poster` split exists now.
 */
export function Video({ src, poster, caption, width, height }: VideoProps) {
  return (
    <figure className="my-8">
      <video
        controls
        preload="metadata"
        playsInline
        poster={mediaUrl(poster)}
        width={width}
        height={height}
        className="border-rule h-auto w-full rounded-lg border"
      >
        <source src={mediaUrl(src)} type="video/mp4" />
        {/*
          Browsers that cannot play the source fall back to this text. A direct
          link is more useful than "your browser does not support video".
        */}
        <a href={mediaUrl(src)}>Скачать видео</a>
      </video>
      {caption !== undefined && (
        <figcaption className="text-ink-muted mt-2 text-sm">{caption}</figcaption>
      )}
    </figure>
  )
}

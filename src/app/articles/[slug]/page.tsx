import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getAllSlugs, getArticleBySlug } from '@/content'
import { mediaUrl } from '@/content/media'
import { renderMdx } from '@/content/mdx'

/**
 * `params` is a Promise in Next 16 and must be awaited. This is not stylistic:
 * destructuring it synchronously typechecks against an older signature and fails
 * at runtime, which is the single most common way an App Router route written
 * from memory breaks on this major version.
 */
type RouteParams = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }))
}

/**
 * Refuses to render a slug that was not returned by `generateStaticParams`.
 *
 * Without this, an unknown slug is rendered on demand at request time, which
 * quietly turns a fully static site into a partly dynamic one — and the first
 * sign of it is a server doing work in production that nobody expected it to do.
 */
export const dynamicParams = false

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (article === null) return {}

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url: `/articles/${slug}`,
      publishedTime: article.date,
      ...(article.cover !== undefined && { images: [{ url: mediaUrl(article.cover) }] }),
    },
  }
}

export default async function ArticlePage({ params }: RouteParams) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (article === null) notFound()

  const content = await renderMdx(article.body)

  return (
    <article>
      <header className="border-rule border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{article.title}</h1>
        <p className="text-ink-muted mt-3 max-w-prose">{article.description}</p>
        <p className="text-ink-muted mt-4 font-mono text-xs">
          <time dateTime={article.date}>{article.date}</time>
          {' · '}
          {article.readingTimeMin} мин
          {article.status === 'draft' && ' · черновик'}
        </p>
      </header>

      {article.cover !== undefined && article.coverAlt !== undefined && (
        <Image
          src={mediaUrl(article.cover)}
          alt={article.coverAlt}
          width={1200}
          height={630}
          // The cover is above the fold, so it is the one image worth loading
          // eagerly; everything below stays lazy by default.
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="border-rule mt-8 h-auto w-full rounded-lg border"
        />
      )}

      <div className="prose-article mt-8">{content}</div>
    </article>
  )
}

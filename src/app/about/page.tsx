import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPage } from '@/content'
import { renderMdx } from '@/content/mdx'

const SLUG = 'about'

/**
 * A dedicated route rather than a catch-all.
 *
 * With one standalone page, `[...slug]` would add a routing indirection to save
 * nothing. When a second page appears, this becomes a catch-all in one commit —
 * `getPage` already takes a slug precisely so that change touches routing only.
 */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG)
  if (page === null) return {}

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${SLUG}` },
  }
}

export default async function AboutPage() {
  const page = await getPage(SLUG)
  if (page === null) notFound()

  const content = await renderMdx(page.body)

  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div className="prose-article mt-8">{content}</div>
    </article>
  )
}

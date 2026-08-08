import type { MetadataRoute } from 'next'
import { getAllArticles } from '@/content'
import { absoluteUrl } from '@/lib/site'

/**
 * Built from the content layer, not from a hand-kept list.
 *
 * A sitemap maintained by hand is wrong within two articles, and wrong quietly:
 * search engines simply do not see the pages that were forgotten. Deriving it
 * from `getAllArticles` means the sitemap cannot disagree with what was actually
 * generated — including drafts, which are absent from both for the same reason.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticles()

  return [
    {
      url: absoluteUrl('/'),
      lastModified: articles[0]?.date ?? new Date().toISOString().slice(0, 10),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/about'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    ...articles.map((article) => ({
      url: absoluteUrl(`/articles/${article.slug}`),
      // The publication date, not the file's mtime: a checkout rewrites mtimes,
      // so using them would tell crawlers every article changed on deploy day.
      lastModified: article.date,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    })),
  ]
}

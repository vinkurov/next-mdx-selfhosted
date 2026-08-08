import Link from 'next/link'
import { getAllArticles } from '@/content'

export default async function HomePage() {
  const articles = await getAllArticles()

  return (
    <section>
      <h1 className="text-2xl font-semibold">Материалы</h1>
      <p className="text-ink-muted mt-2 max-w-prose text-sm">
        Референс архитектуры контентного сайта на Next.js: материалы живут в git как MDX,
        схема проверяется на сборке, CMS нет.
      </p>

      <ul className="mt-8 space-y-8">
        {articles.map((article) => (
          <li key={article.slug}>
            <article>
              <h2 className="text-lg font-medium">
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="text-ink-muted mt-1 max-w-prose text-sm">
                {article.description}
              </p>
              <p className="text-ink-muted mt-2 font-mono text-xs">
                <time dateTime={article.date}>{article.date}</time>
                {' · '}
                {article.readingTimeMin} мин
                {article.status === 'draft' && ' · черновик'}
                {article.tags.length > 0 && ` · ${article.tags.join(', ')}`}
              </p>
            </article>
          </li>
        ))}
      </ul>

      {articles.length === 0 && (
        <p className="text-ink-muted mt-8 text-sm">Пока ни одного материала.</p>
      )}
    </section>
  )
}

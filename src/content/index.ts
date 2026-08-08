import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import {
  type Article,
  ArticleFrontmatter,
  describeIssues,
  type Page,
  PageFrontmatter,
} from './schema'

/**
 * The only way the rest of the application reads content.
 *
 * Nothing below this line leaks upward: no paths, no `fs`, no notion that
 * documents are files at all. Pages receive `Article` and `Page` objects and
 * nothing else. That is the point of the module — replacing this implementation
 * with a generated index, an ISR-backed fetch or an external source is a change
 * to this file only, and not a single page or component has to be touched.
 *
 * Server-side only. `fs` is imported at the top level, so importing this from a
 * client component fails the build — which is the intended outcome rather than
 * an inconvenience: content resolution belongs to the build, not the browser.
 */

const CONTENT_ROOT = path.join(process.cwd(), 'content')

/**
 * Locales present on disk.
 *
 * A tuple rather than a directory scan so that adding a language is a visible,
 * reviewable change instead of a side effect of creating a folder.
 */
const LOCALES = ['ru'] as const

/** Words per minute used for the reading estimate. */
const READING_SPEED_WPM = 180

/**
 * Raised when a document exists but cannot be trusted.
 *
 * Deliberately fatal. The alternative — skipping the file and carrying on — is
 * the mechanism behind every "the article just didn't show up on the site" bug
 * report, and those are expensive precisely because nothing anywhere says
 * anything went wrong.
 */
export class ContentError extends Error {
  override readonly name = 'ContentError'

  constructor(
    readonly file: string,
    readonly problems: string[],
  ) {
    super(`${file}\n${problems.map((line) => `  ${line}`).join('\n')}`)
  }
}

interface Cache {
  articles: Article[]
  pages: Map<string, Page>
}

let cache: Cache | null = null

/**
 * Content is read once per process in production and never cached in
 * development.
 *
 * In production the filesystem cannot change under a running build, so re-reading
 * for every one of a few hundred pages is pure waste. In development the whole
 * point is that editing a document and refreshing shows the edit, so a cache
 * there would be a bug rather than an optimisation.
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

async function load(): Promise<Cache> {
  if (cache !== null && isProduction()) return cache

  const articles: Article[] = []
  const pages = new Map<string, Page>()

  for (const locale of LOCALES) {
    for (const file of await listMdx(path.join(CONTENT_ROOT, locale, 'articles'))) {
      articles.push(await parseArticle(locale, file))
    }
    for (const file of await listMdx(path.join(CONTENT_ROOT, locale, 'pages'))) {
      const page = await parsePage(file)
      pages.set(page.slug, page)
    }
  }

  // Newest first, then by slug so that two documents sharing a date keep a
  // stable order between builds. Without the tiebreak, page output can differ
  // build to build purely from directory iteration order.
  articles.sort((a, b) =>
    a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date),
  )

  const loaded: Cache = { articles, pages }
  cache = loaded
  return loaded
}

async function listMdx(directory: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    // A missing `pages/` directory is a legitimate state for a site that has no
    // standalone pages yet. Anything else is a real filesystem problem and must
    // not be swallowed.
    if (isNotFound(error)) return []
    throw error
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .map((entry) => path.join(directory, entry.name))
    .sort()
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ENOENT'
  )
}

/**
 * Either a parsed document or the reasons it could not be parsed.
 *
 * Both the build and `scripts/validate-content.ts` go through the functions
 * below, which is the whole reason this result type exists instead of the parse
 * simply throwing. The build wants to stop at the first bad document; the
 * validation script wants to list every problem in one run so an author fixes
 * them all at once. Giving the script its own walk would eventually let the two
 * disagree about what "valid" means — and the disagreement would show up as CI
 * passing while the build fails.
 */
type ParseResult<T> = { ok: true; value: T } | { ok: false; problems: string[] }

async function tryParseArticle(
  locale: string,
  file: string,
): Promise<ParseResult<Article>> {
  const { data, content } = matter(await readFile(file, 'utf8'))
  const parsed = ArticleFrontmatter.safeParse(data)

  if (!parsed.success) {
    return { ok: false, problems: describeIssues(parsed.error, data) }
  }

  if (parsed.data.locale !== locale) {
    return {
      ok: false,
      problems: [
        `locale: файл лежит в content/${locale}/, но объявлена локаль "${parsed.data.locale}"`,
      ],
    }
  }

  return {
    ok: true,
    value: {
      ...parsed.data,
      slug: path.basename(file, '.mdx'),
      readingTimeMin: estimateReadingTime(content),
      body: content,
    },
  }
}

async function tryParsePage(file: string): Promise<ParseResult<Page>> {
  const { data, content } = matter(await readFile(file, 'utf8'))
  const parsed = PageFrontmatter.safeParse(data)

  if (!parsed.success) {
    return { ok: false, problems: describeIssues(parsed.error, data) }
  }

  return {
    ok: true,
    value: { ...parsed.data, slug: path.basename(file, '.mdx'), body: content },
  }
}

async function parseArticle(locale: string, file: string): Promise<Article> {
  const result = await tryParseArticle(locale, file)
  if (!result.ok) throw new ContentError(relative(file), result.problems)
  return result.value
}

async function parsePage(file: string): Promise<Page> {
  const result = await tryParsePage(file)
  if (!result.ok) throw new ContentError(relative(file), result.problems)
  return result.value
}

function relative(file: string): string {
  return path.relative(process.cwd(), file)
}

/**
 * Minutes of reading, rounded up, never below one.
 *
 * Code blocks and JSX are stripped before counting. Leaving them in makes the
 * estimate scale with markup rather than prose — a code-heavy article would claim
 * twice its real reading time — and readers skim code rather than reading it at
 * prose speed anyway.
 */
export function estimateReadingTime(body: string): number {
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[[^\]]*]\([^)]*\)/g, ' ')

  const words = prose.split(/\s+/).filter((word) => /\p{L}|\p{N}/u.test(word)).length
  return Math.max(1, Math.ceil(words / READING_SPEED_WPM))
}

/**
 * Whether a document should be visible in the current environment.
 *
 * Drafts are readable in development — that is how an author previews one — and
 * absent from a production build. A draft that reached production because
 * somebody forgot a flag is the failure this guards against, so the check is
 * applied on every read path rather than only on the listing.
 */
function isVisible(status: 'draft' | 'published', includeDrafts: boolean): boolean {
  return status === 'published' || includeDrafts || !isProduction()
}

// ---- Public contract --------------------------------------------------------

export async function getAllArticles(opts?: {
  includeDrafts?: boolean
}): Promise<Article[]> {
  const includeDrafts = opts?.includeDrafts ?? false
  const { articles } = await load()
  return articles.filter((article) => isVisible(article.status, includeDrafts))
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { articles } = await load()
  const found = articles.find((article) => article.slug === slug)
  if (found === undefined) return null
  return isVisible(found.status, false) ? found : null
}

export async function getAllSlugs(): Promise<string[]> {
  return (await getAllArticles()).map((article) => article.slug)
}

export async function getPage(slug: string): Promise<Page | null> {
  const { pages } = await load()
  const found = pages.get(slug)
  if (found === undefined) return null
  return isVisible(found.status, false) ? found : null
}

/**
 * Every document regardless of status, for tooling only.
 *
 * `scripts/validate-content.ts` and `scripts/check-media.ts` must see drafts:
 * a draft with a broken date or a missing image should fail CI before it is
 * published, not after.
 */
export async function getAllArticlesForTooling(): Promise<Article[]> {
  return (await load()).articles
}

export async function getAllPagesForTooling(): Promise<Page[]> {
  return [...(await load()).pages.values()]
}

export interface ContentProblem {
  /** Repository-relative path, so the output can be pasted into an editor. */
  file: string
  problems: string[]
}

/**
 * Validates every document and returns all problems instead of throwing.
 *
 * Continues past the first bad file on purpose: an author who added three
 * articles wants all three sets of mistakes from one CI run, not one per push.
 */
export async function collectContentProblems(): Promise<ContentProblem[]> {
  const found: ContentProblem[] = []

  for (const locale of LOCALES) {
    for (const file of await listMdx(path.join(CONTENT_ROOT, locale, 'articles'))) {
      const result = await tryParseArticle(locale, file)
      if (!result.ok) found.push({ file: relative(file), problems: result.problems })
    }
    for (const file of await listMdx(path.join(CONTENT_ROOT, locale, 'pages'))) {
      const result = await tryParsePage(file)
      if (!result.ok) found.push({ file: relative(file), problems: result.problems })
    }
  }

  return found
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectContentProblems, estimateReadingTime } from '@/content'
import { ArticleFrontmatter, describeIssues } from '@/content/schema'

/**
 * Four tests, covering the content layer only.
 *
 * Deliberately not a broad suite. Rendering is Next's job and typing is the
 * compiler's; what is worth testing here is the part where a human writes YAML by
 * hand and something has to interpret it — plus the one invariant that keeps a
 * broken document from being committed.
 */

const MINIMAL = { title: 'Заголовок', description: 'Описание', date: '2026-02-18' }

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('frontmatter', () => {
  it('applies defaults and accepts the Date that YAML produces', () => {
    // The case that actually broke the first build: js-yaml types an unquoted
    // 2026-02-18 as a timestamp, so the schema receives a Date, not a string.
    const fromYaml = ArticleFrontmatter.safeParse({
      ...MINIMAL,
      date: new Date('2026-02-18T00:00:00.000Z'),
    })

    expect(fromYaml.success).toBe(true)
    if (fromYaml.success) {
      expect(fromYaml.data.date).toBe('2026-02-18')
      // Defaults exist so that a document may omit them, and are non-optional in
      // the inferred type so consumers never branch on undefined.
      expect(fromYaml.data.status).toBe('draft')
      expect(fromYaml.data.locale).toBe('ru')
      expect(fromYaml.data.tags).toEqual([])
    }

    // A quoted date must behave identically — authors write both.
    expect(ArticleFrontmatter.safeParse(MINIMAL).success).toBe(true)
  })

  it.each([
    [
      'дату с временем и смещением',
      { ...MINIMAL, date: new Date('2026-02-19T01:00:00+03:00') },
      /date: ожидается формат YYYY-MM-DD/,
    ],
    [
      'несуществующую календарную дату',
      { ...MINIMAL, date: '2026-02-31' },
      /date: такой календарной даты не существует — получено "2026-02-31"/,
    ],
    [
      'дату в другом формате',
      { ...MINIMAL, date: '12.03.2026' },
      /date: ожидается формат YYYY-MM-DD — получено "12\.03\.2026"/,
    ],
    [
      'отсутствующее описание',
      { title: 'Т', date: '2026-02-18' },
      /description: обязательное поле отсутствует/,
    ],
    [
      'обложку без описания',
      { ...MINIMAL, cover: 'a/b.jpg' },
      /coverAlt: указан cover, но нет coverAlt/,
    ],
  ])('отвергает %s с понятным сообщением', (_label, input, expected) => {
    const parsed = ArticleFrontmatter.safeParse(input)

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(describeIssues(parsed.error, input).join('\n')).toMatch(expected)
    }
  })
})

describe('estimateReadingTime', () => {
  it('counts prose and ignores code, JSX and links', () => {
    const prose = Array.from({ length: 180 }, (_, i) => `слово${i}`).join(' ')

    // 180 words at 180 wpm is exactly one minute.
    expect(estimateReadingTime(prose)).toBe(1)

    // The same prose plus a large code block must not read as longer: markup is
    // not read at prose speed, and counting it would make code-heavy articles
    // claim roughly twice their real length.
    const withCode = `${prose}\n\n\`\`\`ts\n${'const x = 1\n'.repeat(200)}\`\`\`\n\n<Figure src="a.png" alt="b" width={1} height={1} />`
    expect(estimateReadingTime(withCode)).toBe(1)

    // Never zero: an empty document still costs a click.
    expect(estimateReadingTime('')).toBe(1)
  })
})

describe('committed content', () => {
  it('is valid, and drafts stay out of a production build', async () => {
    // Guards the repository rather than the code: if someone commits a document
    // with broken frontmatter, this fails even if they skipped the script.
    expect(await collectContentProblems()).toEqual([])

    // Modules are re-imported after stubbing because the loader reads NODE_ENV
    // at call time and caches only in production — a stale module would keep the
    // test-environment behaviour and quietly assert nothing.
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const production = await import('@/content')

    const slugs = (await production.getAllArticles()).map((article) => article.slug)
    expect(slugs).not.toContain('draft-example')
    expect(slugs).toContain('content-as-data')

    // Reachable by direct URL either — not merely absent from the listing.
    expect(await production.getArticleBySlug('draft-example')).toBeNull()

    // Tooling must still see it: a draft with a broken date should fail CI
    // before it is published, not after.
    const forTooling = await production.getAllArticlesForTooling()
    expect(forTooling.map((article) => article.slug)).toContain('draft-example')
  })
})

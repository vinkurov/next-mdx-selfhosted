import { z } from 'zod'

/**
 * Content schemas.
 *
 * Every field a document may carry is declared here once, and the TypeScript
 * types are derived with `z.infer` rather than written twice. Hand-written types
 * alongside a validator drift the first time someone edits only one of them, and
 * the drift is silent: the compiler is happy while the runtime rejects real
 * documents.
 *
 * `status` and `locale` are present in v1 even though the site is
 * single-language and publishes everything immediately. They cost one line each
 * now. Adding them later is a migration of every document in the repository.
 */

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

/**
 * A calendar date, not merely a string that looks like one.
 *
 * The regex alone accepts `2026-02-31` and `2026-13-01`, which then flow into
 * sorting and into sitemap `lastModified` as an `Invalid Date`. Checking that
 * the parsed date round-trips back to the same digits is what rejects them.
 */
/**
 * Normalises what YAML hands us for a date field.
 *
 * This exists because of a detail that costs an afternoon to find. YAML types
 * scalars, and an unquoted `2026-02-18` is a *timestamp*, so `gray-matter` (via
 * js-yaml) delivers a JavaScript `Date` rather than the string the schema
 * expects. Requiring authors to write `date: '2026-02-18'` would work and would
 * be forgotten roughly every other article.
 *
 * A bare `YYYY-MM-DD` becomes midnight UTC exactly, so it round-trips back to
 * the same digits. Anything that carried a time or an offset does not, and is
 * deliberately left as a full ISO string so that the format check rejects it and
 * the author sees what they actually wrote. That case is rejected rather than
 * truncated because `2026-02-19T01:00:00+03:00` is 2026-02-18 in UTC — the
 * calendar day depends on the reader's timezone, and a publication date that
 * shifts is worse than one that fails the build.
 */
function normaliseYamlDate(value: unknown): unknown {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value

  const iso = value.toISOString()
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
}

const isoDate = z.preprocess(
  normaliseYamlDate,
  z
    .string('ожидается дата в формате YYYY-MM-DD')
    .regex(DATE_FORMAT, 'ожидается формат YYYY-MM-DD')
    .refine(
      // Guarded by the format test so a malformed date reports one problem
      // rather than two: without the guard, "12.03.2026" fails the regex *and*
      // the calendar check, and the reader has to work out that these are the
      // same mistake described twice.
      (value) => !DATE_FORMAT.test(value) || isRealCalendarDate(value),
      'такой календарной даты не существует',
    ),
)

function isRealCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

export const ArticleFrontmatter = z
  .object({
    title: z.string('ожидается строка').min(1, 'не может быть пустым'),
    description: z
      .string('ожидается строка')
      .min(1, 'не может быть пустым')
      .max(300, 'не длиннее 300 символов'),
    date: isoDate,
    status: z
      .enum(['draft', 'published'], 'допустимые значения: draft, published')
      .default('draft'),
    locale: z.enum(['ru'], 'поддерживается только локаль ru').default('ru'),
    tags: z.array(z.string('каждый тег — строка'), 'ожидается список строк').default([]),
    /** Path inside the media root, without a leading slash and without `/public`. */
    cover: z.string('ожидается строка').optional(),
    coverAlt: z.string('ожидается строка').optional(),
  })
  /**
   * A cover without alt text is enforced rather than allowed.
   *
   * This is stricter than it strictly has to be, and deliberately so: a missing
   * alt attribute is invisible in review and permanent once the article ships.
   * Catching it at build time costs one refinement; catching it later costs an
   * audit of every published document.
   */
  .refine((value) => value.cover === undefined || value.coverAlt !== undefined, {
    message: 'указан cover, но нет coverAlt — обложке нужно описание для screen readers',
    path: ['coverAlt'],
  })

export const PageFrontmatter = z.object({
  title: z.string('ожидается строка').min(1, 'не может быть пустым'),
  description: z
    .string('ожидается строка')
    .min(1, 'не может быть пустым')
    .max(300, 'не длиннее 300 символов'),
  status: z
    .enum(['draft', 'published'], 'допустимые значения: draft, published')
    .default('published'),
  locale: z.enum(['ru'], 'поддерживается только локаль ru').default('ru'),
})

export type ArticleMeta = z.infer<typeof ArticleFrontmatter>
export type PageMeta = z.infer<typeof PageFrontmatter>

export type Article = ArticleMeta & {
  slug: string
  readingTimeMin: number
  /** Raw MDX source. Compilation is a separate concern — see `src/content/mdx.ts`. */
  body: string
}

export type Page = PageMeta & {
  slug: string
  body: string
}

/**
 * Renders validation issues the way a person reading CI output needs them.
 *
 * Zod's default message for an absent field is "Invalid input: expected string,
 * received undefined", which describes the type system rather than the mistake.
 * Someone who forgot a `description:` line needs to be told exactly that, and
 * the field name has to come first because that is what they scan for.
 *
 * The original document is passed in and the offending value is resolved from it
 * by path. That is deliberate rather than reading it off the issue: Zod's issue
 * objects are versioned internals, and an earlier version of this function
 * inferred "field is missing" from `issue.input === undefined` — which is also
 * what a field with a wrong *type* looks like when that property is absent, so
 * a numeric `title` was reported as a missing one.
 */
export function describeIssues(error: z.ZodError, document: unknown): string[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join('.') : '(корень)'
    const actual = resolvePath(document, issue.path)

    // Hand-written refinements always speak for themselves. A cross-field rule
    // such as "cover needs coverAlt" points its path at the *absent* field, so
    // the generic missing-field wording below would replace the one message that
    // actually explains the problem.
    if (issue.code === 'custom') {
      return actual === undefined
        ? `${field}: ${issue.message}`
        : `${field}: ${issue.message} — получено ${JSON.stringify(actual)}`
    }

    if (actual === undefined) {
      return `${field}: обязательное поле отсутствует`
    }

    return `${field}: ${issue.message} — получено ${JSON.stringify(actual)}`
  })
}

/** Walks a Zod issue path into the document it came from. */
function resolvePath(document: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let current: unknown = document

  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<PropertyKey, unknown>)[key]
  }

  return current
}

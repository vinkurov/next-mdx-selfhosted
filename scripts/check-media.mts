/**
 * Verifies that every media file a document references actually exists.
 *
 * A missing image is not a build error in Next — `next/image` happily emits a
 * tag pointing at a 404 — so without this step a typo in a path ships, and the
 * first report comes from a reader. This catches it before deploy.
 *
 * Paths are read by parsing the MDX to a syntax tree and walking the JSX nodes,
 * rather than by running a regular expression over the source. A regex would
 * miss an attribute split across lines by the formatter, and silently: the check
 * would pass because it found nothing to check.
 */
import { access } from 'node:fs/promises'
import path from 'node:path'
import { createProcessor } from '@mdx-js/mdx'
import { getAllArticlesForTooling, getAllPagesForTooling } from '../src/content'

/** Where `mediaUrl('x')` resolves to on disk when media is served locally. */
const MEDIA_ROOT = path.join(process.cwd(), 'public', 'media')

/** Component and attribute pairs that hold a media path. */
const MEDIA_ATTRIBUTES: Record<string, string[]> = {
  Figure: ['src'],
  Video: ['src', 'poster'],
}

interface Reference {
  document: string
  field: string
  mediaPath: string
}

/** Minimal shape of the MDX JSX nodes we care about. */
interface MdxJsxNode {
  type: string
  name?: string | null
  attributes?: Array<{
    type: string
    name?: string
    value?: unknown
  }>
  children?: unknown[]
}

const processor = createProcessor({})

function collectFromBody(document: string, body: string): Reference[] {
  const found: Reference[] = []

  walk(processor.parse(body) as unknown as MdxJsxNode, (node) => {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return

    const attributes = MEDIA_ATTRIBUTES[node.name ?? '']
    if (attributes === undefined) return

    for (const attribute of node.attributes ?? []) {
      if (attribute.type !== 'mdxJsxAttribute') continue
      if (!attributes.includes(attribute.name ?? '')) continue

      // A non-string value means an expression such as src={variable}. Those
      // cannot be resolved statically; reported rather than ignored, because
      // "unchecked" and "fine" are not the same thing.
      if (typeof attribute.value !== 'string') {
        found.push({
          document,
          field: `<${node.name} ${attribute.name}>`,
          mediaPath: '(выражение, статически не проверяется)',
        })
        continue
      }

      found.push({
        document,
        field: `<${node.name} ${attribute.name}>`,
        mediaPath: attribute.value,
      })
    }
  })

  return found
}

function walk(node: MdxJsxNode, visit: (node: MdxJsxNode) => void): void {
  visit(node)
  for (const child of node.children ?? []) {
    walk(child as MdxJsxNode, visit)
  }
}

async function exists(mediaPath: string): Promise<boolean> {
  try {
    await access(path.join(MEDIA_ROOT, mediaPath))
    return true
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  const references: Reference[] = []

  for (const article of await getAllArticlesForTooling()) {
    const document = `content/ru/articles/${article.slug}.mdx`
    if (article.cover !== undefined) {
      references.push({ document, field: 'cover', mediaPath: article.cover })
    }
    references.push(...collectFromBody(document, article.body))
  }

  for (const page of await getAllPagesForTooling()) {
    references.push(...collectFromBody(`content/ru/pages/${page.slug}.mdx`, page.body))
  }

  const missing: Reference[] = []
  const unchecked: Reference[] = []

  for (const reference of references) {
    if (reference.mediaPath.startsWith('(')) {
      unchecked.push(reference)
      continue
    }
    if (!(await exists(reference.mediaPath))) missing.push(reference)
  }

  for (const reference of unchecked) {
    console.warn(`${reference.document}\n  ${reference.field}: ${reference.mediaPath}`)
  }

  if (missing.length === 0) {
    console.log(
      `media: проверено ссылок — ${references.length - unchecked.length}, все файлы на месте`,
    )
    return
  }

  for (const reference of missing) {
    console.error(`${reference.document}`)
    console.error(
      `  ${reference.field}: файл не найден — public/media/${reference.mediaPath}`,
    )
  }

  console.error(`\nmedia: отсутствует файлов — ${missing.length}`)
  process.exitCode = 1
}

await main()

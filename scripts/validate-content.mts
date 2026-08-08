/**
 * Validates every content document and exits non-zero if any is broken.
 *
 * Runs in CI before `next build`, so a malformed document fails in seconds with
 * a readable message rather than several minutes later inside a bundler stack
 * trace. It calls the same parsing code the build uses, so the two cannot come
 * to different conclusions about what is valid.
 */
import { collectContentProblems } from '../src/content'

async function main(): Promise<void> {
  const problems = await collectContentProblems()

  if (problems.length === 0) {
    console.log('content: все документы валидны')
    return
  }

  for (const { file, problems: lines } of problems) {
    console.error(file)
    for (const line of lines) console.error(`  ${line}`)
  }

  const count = problems.length
  console.error(
    `\ncontent: ${count} ${plural(count, 'документ', 'документа', 'документов')} не проходит проверку`,
  )
  process.exitCode = 1
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

await main()

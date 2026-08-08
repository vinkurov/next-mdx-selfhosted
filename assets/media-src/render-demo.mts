/**
 * Renders the demo video and cover image used by the long article.
 *
 * Kept in the repository so the media is reproducible rather than a binary
 * somebody once produced and nobody can regenerate. Run with:
 *
 *   npx tsx assets/media-src/render-demo.mts
 *
 * The terminal frames reproduce the *actual* output of `npm run content:check` —
 * the text below was copied from a real run against a deliberately broken
 * document, not written to look plausible.
 *
 * Requires ffmpeg on PATH. Not part of CI: the outputs are committed, and CI has
 * no reason to re-encode a video on every push.
 */
import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'

const run = promisify(execFile)

const OUT = path.join(process.cwd(), 'public/media/articles/selfhosted-nextjs-mdx')
const WORK = path.join(process.cwd(), 'assets/media-src/.frames')
const WIDTH = 1280
const HEIGHT = 720

interface Screen {
  lines: Array<{ text: string; tone?: 'prompt' | 'error' | 'ok' | 'dim' }>
  seconds: number
}

const PROMPT = '~/site $ '

/** Frames of the real validation run, in the order they appear. */
const SCREENS: Screen[] = [
  {
    seconds: 1.4,
    lines: [{ text: `${PROMPT}`, tone: 'prompt' }],
  },
  {
    seconds: 1.6,
    lines: [{ text: `${PROMPT}npm run content:check`, tone: 'prompt' }],
  },
  {
    seconds: 2.6,
    lines: [
      { text: `${PROMPT}npm run content:check`, tone: 'prompt' },
      { text: '' },
      { text: 'content: все документы валидны', tone: 'ok' },
    ],
  },
  {
    seconds: 2.2,
    lines: [
      { text: `${PROMPT}npm run content:check`, tone: 'prompt' },
      { text: '' },
      { text: 'content: все документы валидны', tone: 'ok' },
      { text: '' },
      { text: '# ломаем дату и удаляем описание', tone: 'dim' },
      { text: `${PROMPT}vim content/ru/articles/content-as-data.mdx`, tone: 'prompt' },
    ],
  },
  {
    seconds: 1.4,
    lines: [
      { text: '- date: 2026-02-18', tone: 'error' },
      {
        text: '- description: Почему структура контента и структура URL...',
        tone: 'error',
      },
      { text: '+ date: 12.03.2026', tone: 'ok' },
      { text: '' },
      { text: `${PROMPT}npm run content:check`, tone: 'prompt' },
    ],
  },
  {
    seconds: 4.2,
    lines: [
      { text: `${PROMPT}npm run content:check`, tone: 'prompt' },
      { text: '' },
      { text: 'content/ru/articles/content-as-data.mdx', tone: 'error' },
      { text: '  description: обязательное поле отсутствует', tone: 'error' },
      {
        text: '  date: ожидается формат YYYY-MM-DD — получено "12.03.2026"',
        tone: 'error',
      },
      { text: '' },
      { text: 'content: 1 документ не проходит проверку', tone: 'error' },
      { text: '' },
      { text: `${PROMPT}echo $?`, tone: 'prompt' },
      { text: '1', tone: 'error' },
    ],
  },
  {
    seconds: 3.4,
    lines: [
      { text: '# сборка до этого шага даже не начнётся', tone: 'dim' },
      { text: '' },
      { text: `${PROMPT}git revert --no-edit HEAD`, tone: 'prompt' },
      { text: `${PROMPT}npm run content:check && npm run build`, tone: 'prompt' },
      { text: '' },
      { text: 'content: все документы валидны', tone: 'ok' },
      { text: '✓ Compiled successfully', tone: 'ok' },
      { text: '✓ Generating static pages (8/8)', tone: 'ok' },
    ],
  },
]

function colourFor(tone: Screen['lines'][number]['tone']): string {
  if (tone === 'error') return '#ff8f8f'
  if (tone === 'ok') return '#8fe3a6'
  if (tone === 'dim') return '#7c8492'
  return '#e8eaee'
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function frameSvg(screen: Screen): string {
  const lines = screen.lines
    .map((line, index) => {
      const y = 132 + index * 34
      return `<text x="56" y="${y}" font-size="21" fill="${colourFor(line.tone)}" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" xml:space="preserve">${escapeXml(line.text)}</text>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0d0f13"/>
  <rect x="0" y="0" width="${WIDTH}" height="64" fill="#171a20"/>
  <circle cx="34" cy="32" r="7" fill="#ff5f57"/>
  <circle cx="58" cy="32" r="7" fill="#febc2e"/>
  <circle cx="82" cy="32" r="7" fill="#28c840"/>
  <text x="640" y="39" font-size="17" fill="#99a1b0" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif">content:check</text>
  ${lines}
</svg>`
}

async function main(): Promise<void> {
  await rm(WORK, { recursive: true, force: true })
  await mkdir(WORK, { recursive: true })
  await mkdir(OUT, { recursive: true })

  const concat: string[] = []

  for (const [index, screen] of SCREENS.entries()) {
    const file = path.join(WORK, `frame-${String(index).padStart(2, '0')}.png`)
    await sharp(Buffer.from(frameSvg(screen)))
      .png()
      .toFile(file)
    // The concat demuxer holds a still for `duration`, so seven images become a
    // seventeen-second video without encoding hundreds of identical frames.
    concat.push(`file '${file}'`, `duration ${screen.seconds}`)
  }

  // The demuxer ignores the final duration unless the last file is repeated.
  const last = SCREENS.length - 1
  concat.push(`file '${path.join(WORK, `frame-${String(last).padStart(2, '0')}.png`)}'`)

  const listFile = path.join(WORK, 'concat.txt')
  await writeFile(listFile, `${concat.join('\n')}\n`)

  await run('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listFile,
    '-vf',
    'fps=12,format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '26',
    // Puts the moov atom first so the browser can start playing before the whole
    // file has arrived.
    '-movflags',
    '+faststart',
    path.join(OUT, 'demo.mp4'),
  ])

  // Poster: the frame showing the failure, which is what the video is about.
  const posterScreen = SCREENS.at(5) ?? SCREENS.at(0)
  if (posterScreen === undefined) throw new Error('no screens to render')

  await sharp(Buffer.from(frameSvg(posterScreen)))
    .jpeg({ quality: 82, progressive: true })
    .toFile(path.join(OUT, 'demo-poster.jpg'))

  await rm(WORK, { recursive: true, force: true })
  console.log('media: demo.mp4 и demo-poster.jpg готовы')
}

await main()

import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { siteUrl } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  /**
   * Setting `metadataBase` once here is what lets every page below declare
   * relative URLs for canonicals and Open Graph images. Without it Next warns at
   * build time and emits relative OG URLs, which most social scrapers ignore.
   */
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'next-mdx-selfhosted',
    template: '%s — next-mdx-selfhosted',
  },
  description:
    'Reference architecture for a self-hosted Next.js content site with git-based MDX content and build-time validation.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="mx-auto flex min-h-screen max-w-3xl flex-col px-5">
        <header className="border-rule flex items-baseline justify-between border-b py-6">
          <Link href="/" className="font-mono text-sm font-medium no-underline">
            next-mdx-selfhosted
          </Link>
          <nav className="text-ink-muted flex gap-4 text-sm">
            <Link href="/about">О проекте</Link>
            <a href="https://github.com/vinkurov/next-mdx-selfhosted" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </header>

        <main className="flex-1 py-10">{children}</main>

        <footer className="border-rule text-ink-muted border-t py-6 text-sm">
          MIT · контент в git, без CMS
        </footer>
      </body>
    </html>
  )
}

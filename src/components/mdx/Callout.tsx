import type { ReactNode } from 'react'

const TONES = {
  note: { label: 'Заметка', className: 'border-l-(--color-accent)' },
  warning: { label: 'Внимание', className: 'border-l-amber-500' },
} as const

export interface CalloutProps {
  tone?: keyof typeof TONES
  children: ReactNode
}

/**
 * A block of set-aside prose.
 *
 * The tone is a closed set rather than a free string. An open one invites
 * `tone="warn"` and `tone="Warning"` across a dozen articles, all silently
 * rendering as the default, and nobody notices because the page still looks
 * fine — whereas a typo here fails typecheck.
 */
export function Callout({ tone = 'note', children }: CalloutProps) {
  const { label, className } = TONES[tone]

  return (
    <aside
      className={`bg-paper-sunken my-6 rounded-r-lg border-l-4 px-4 py-3 ${className}`}
    >
      <p className="text-ink-muted mb-1 text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <div className="[&>p:last-child]:mb-0 [&>p]:mb-2">{children}</div>
    </aside>
  )
}

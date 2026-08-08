import { Callout } from '@/components/mdx/Callout'
import { Figure } from '@/components/mdx/Figure'
import { Video } from '@/components/mdx/Video'

/**
 * Components a document is allowed to use.
 *
 * An explicit object, never a spread of everything exported from somewhere. If a
 * component is not listed here, it does not exist inside MDX.
 *
 * The reason is reviewability rather than security — the content is in the
 * repository and goes through pull requests either way. But a document that can
 * only use three known components is a document a reviewer can read as text and
 * data. Once arbitrary imports are possible, reviewing content means reviewing
 * code, and the "content is just data" property that makes this architecture
 * pleasant to work in quietly disappears.
 *
 * Adding a component is one line here plus a line in the README. That friction
 * is the feature.
 */
export const mdxComponents = { Figure, Video, Callout }

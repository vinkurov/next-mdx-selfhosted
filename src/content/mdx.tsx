import { evaluate } from '@mdx-js/mdx'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode, { type Options as PrettyCodeOptions } from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import * as runtime from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import { mdxComponents } from './components'

/**
 * MDX compilation.
 *
 * `.tsx` rather than the `.ts` the specification sketches, because keeping the
 * component allowlist next to the compilation that uses it is worth one file
 * extension: a caller cannot forget to pass `components` if callers never pass
 * them.
 *
 * Runs on the server, at build time only. Every page that renders MDX is
 * statically generated, so `evaluate` never executes in response to a request.
 *
 * On `evaluate` specifically: its own documentation warns that it `eval`s
 * JavaScript and suggests `compile` plus a real module where possible. That
 * warning is about untrusted input. Here every document is a file in this
 * repository that arrived through a pull request, so it is exactly as trusted as
 * the rest of the source — and `evaluate` avoids an intermediate build step that
 * would need its own cache invalidation. If content ever becomes
 * user-submitted, this is the line that has to change first, and it is the
 * reason that boundary is stated in the README.
 */

const prettyCodeOptions: PrettyCodeOptions = {
  /**
   * Both themes are compiled into the markup and selected with CSS, so
   * highlighting costs zero JavaScript in the browser and needs no
   * flash-of-wrong-theme workaround.
   */
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
}

export async function renderMdx(source: string) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    /**
     * Forces the production JSX runtime, matching the `react/jsx-runtime` import
     * above. With `development: true` the compiled output calls `jsxDEV`, which
     * that import does not provide, and the failure is a runtime error rather
     * than a type error.
     */
    development: false,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      // Order matters: ids have to exist before anything can link to them.
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: 'heading-anchor', ariaHidden: true, tabIndex: -1 },
          content: { type: 'text', value: '#' },
        },
      ],
      [rehypePrettyCode, prettyCodeOptions],
    ],
  })

  return <Content components={mdxComponents} />
}

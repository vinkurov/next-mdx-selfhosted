# syntax=docker/dockerfile:1

# ---- deps -------------------------------------------------------------------
# Only the manifests are copied, so this layer is reused on every build where
# dependencies did not change — which is most of them. Copying sources here
# instead would invalidate the install on every edit and turn a 5-second build
# into a 60-second one.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Content validation runs inside the image build too. The image is the artefact
# that gets deployed, so it must not be possible to produce one from content that
# CI would have rejected.
RUN npm run content:check && npm run media:check && npm run build

# ---- runner -----------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `output: 'standalone'` traces the modules the server actually reaches and
# copies them into .next/standalone. That is why nothing is installed here: the
# entire MDX toolchain, TypeScript, ESLint and Tailwind stay in the builder and
# never enter the runtime image.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# next/image writes optimised derivatives here at runtime. Created and owned up
# front because the process does not run as root and cannot create it itself.
RUN mkdir -p .next/cache/images && chown -R node:node .next/cache

USER node
EXPOSE 3000

# Uses the busybox wget already in the image rather than adding curl. Checks the
# home page rather than a dedicated endpoint: a static site that cannot serve its
# own index is not healthy in any useful sense.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]

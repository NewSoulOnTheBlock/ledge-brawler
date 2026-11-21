# The game's server, built from the repository root by compose.yaml, one image per service:
#   web    Caddy, with the built game: it serves the game and passes /api to the site and the arena's name to the arena
#   site   the site's functions (apps/app/server) on Node; its database is the stock Postgres image
#   arena  the arena server (src/arena/main.vibe); also what `docker build -f apps/app/arena/Dockerfile .` makes
FROM node:26-slim AS build
WORKDIR /repo
# Node 26 ships without corepack: pnpm at the version packageManager names.
RUN npm install -g --no-audit --no-fund pnpm@10.24.0
COPY . .
# The install's own `prepare` builds the spec tools, which needs Dafny; the game and the arena need only the generated core.
RUN pnpm install --frozen-lockfile --ignore-scripts \
 && node vibestack/spec.ts gen \
 && pnpm -C apps/app exec vite build -c vite.arena.config.ts

# The game, told where the arena is and which Privy app signs players in; its theme is built from the design tokens
# first, as the install's `prepare` would.
FROM build AS game
ARG VITE_ARENA_URL
ARG VITE_PRIVY_APP_ID
RUN test -n "$VITE_ARENA_URL" && pnpm -C packages/design-system build && pnpm -C apps/app exec vite build

FROM caddy:2 AS web
COPY --from=game /repo/apps/app/dist /srv
COPY apps/app/arena/Caddyfile /etc/caddy/Caddyfile

# The site's functions, with the packages server/package-lock.json pins.
FROM node:26-slim AS site
WORKDIR /site
COPY apps/app/server/package.json apps/app/server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY apps/app/server/ ./
USER node
EXPOSE 3000
CMD ["node", "serve.js"]

# The arena: the built server and the packages it imports, at the versions the lockfile pins.
FROM node:26-slim AS arena
WORKDIR /arena
RUN npm init -y > /dev/null && npm pkg set type=module \
 && npm install --omit=dev --no-audit --no-fund ws@8.23.0 effect@4.1.1 @effect/platform-node@4.1.1 vibelang-runtime@0.0.13 matter-js@0.19.0
COPY --from=build /repo/apps/app/build/arena ./
USER node
ENV PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:8787/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# The game's code it shares keeps a player's settings in web storage, which a server has none of.
CMD ["node", "--no-experimental-webstorage", "main.js"]

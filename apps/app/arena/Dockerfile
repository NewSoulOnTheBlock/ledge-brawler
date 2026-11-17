# The arena server (src/arena/main.vibe), built from the repository root:
#   docker build -f apps/app/arena/Dockerfile -t five-blades-arena .
FROM node:26-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
# The install's own `prepare` builds the spec tools, which needs Dafny; the arena needs only the generated core.
RUN pnpm install --frozen-lockfile --ignore-scripts \
 && node vibestack/spec.ts gen \
 && pnpm -C apps/app exec vibelang -p tsconfig.arena.json

# What it runs on: the built server and the four packages it imports, at the versions the lockfile pins.
FROM node:26-slim
WORKDIR /arena
RUN npm init -y > /dev/null && npm pkg set type=module \
 && npm install --omit=dev --no-audit --no-fund ws@8.23.0 effect@4.1.1 @effect/platform-node@4.1.1 vibelang-runtime@0.0.13
COPY --from=build /repo/apps/app/build/arena ./
USER node
ENV PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:8787/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "src/arena/main.js"]

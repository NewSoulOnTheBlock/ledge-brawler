# The arena server

The multiplayer server of Five Blades (`src/arena/`): matchmaking for Versus and Play together
([spec/app/lobby.md](../../../spec/app/lobby.md)), and the referee of every duel, which keeps each fighter's health,
lives and knockouts and names the winner ([spec/app/bout.md](../../../spec/app/bout.md)). A pro match's result goes
from here to the site, which pays the pot (`server/api/pro-arena.js`). It replaces the Multiplayer Agent relay.

It is one Node process holding every table in memory, so it runs on a machine of its own, not on Vercel. One small
VPS (1 vCPU, 1 GB) seats thousands of players; pick a region near most of them.

## Setting it up

1. **A VPS** with Ubuntu 24.04 and a public IP. Install Docker:
   `curl -fsSL https://get.docker.com | sh`.
2. **A name for it.** At your DNS provider, add an `A` record such as `arena.example.com` pointing to the VPS's IP.
   Ports 80 and 443 must be open.
3. **A secret** shared by the arena and the site: `openssl rand -hex 32`.
4. **On the VPS**, clone the repository, then in `apps/app/arena/` write `.env`:

   ```sh
   ARENA_DOMAIN=arena.example.com
   ARENA_SECRET=<the secret>
   SITE=https://ledge-brawler.vercel.app
   ```

   and start it: `docker compose up -d --build`. Caddy gets the HTTPS certificate by itself.
   `https://arena.example.com/health` answers `{"ok":true,…}` once it is up.
5. **On Vercel**, in the site's project settings:
   - `ARENA_SECRET`: the same secret, so that `api/pro-arena.js` takes the arena's word on pro matches;
   - `VITE_ARENA_URL=wss://arena.example.com/play` wherever the game is built (`pnpm -C apps/app build`), so that
     the game finds the arena. Rebuild and redeploy the game after setting it.

Without `ARENA_SECRET` the arena refuses pro matches and plays everything else as usual.

## Running and updating

| | |
|---|---|
| Logs | `docker compose logs -f arena` |
| Update | `git pull && docker compose up -d --build` |
| On this machine | `pnpm -C apps/app exec vibelang -p tsconfig.arena.json && node apps/app/build/arena/src/arena/main.js` (port 8787; the dev game connects to `ws://localhost:8787/play`) |

A restart drops every table: players are put back in matchmaking by their games, and a pro match cut short is
held for the operator after an hour (`api/pro-admin.js`).

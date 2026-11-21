# The game's server

Five Blades runs on one VPS of its own, in four containers (`compose.yaml`):

- **caddy** serves the built game at `SITE_DOMAIN` (fiveblades.online; `www.` goes there too), passes `/api/*` to the
  site, and passes `ARENA_DOMAIN` (api.fiveblades.online) to the arena. It gets and renews every HTTPS certificate
  by itself.
- **site** answers `/api/*` with the functions in `apps/app/server/api` (`server/serve.js`): the leaderboards, saved
  progress, accounts, and pro mode's money (`server/api/_pro.js`, on Solana). It runs pro mode's daily work at
  04:00 UTC.
- **db** is the site's Postgres. The first time it starts with no data it lays out `server/schema.sql` and
  `server/pro.sql`; its data lives in the `db` volume.
- **arena** is the multiplayer server (`src/arena/`): matchmaking for Versus and Play together
  ([spec/app/lobby.md](../../../spec/app/lobby.md)); the referee of every duel
  ([spec/app/bout.md](../../../spec/app/bout.md)); and every paid Survival run, which it plays itself
  (`src/arena/run.ts`). A pro match's winner and a run's score go from here to the site, which pays the pots
  (`server/api/pro-arena.js`). It holds every table in memory, so there is only ever one.

## Setting it up

1. **A VPS** with Ubuntu 24.04, ports 80 and 443 open. Docker and git: `apt-get install -y docker.io docker-compose-v2 git`.
2. **DNS:** `A` records for `fiveblades.online`, `www.fiveblades.online` and `api.fiveblades.online`, pointing to the
   VPS's IP.
3. **The code:** `git clone https://github.com/NewSoulOnTheBlock/ledge-brawler /opt/five-blades`.
4. **`/opt/five-blades/apps/app/arena/.env`**, readable by root alone (`chmod 600`):

   ```sh
   SITE_DOMAIN=fiveblades.online
   ARENA_DOMAIN=api.fiveblades.online
   # Each of these five: openssl rand -hex 32. ARENA_SECRET is how the site knows the arena; PRO_ADMIN_TOKEN opens
   # api/pro-admin.js to the operator.
   ARENA_SECRET=
   CRON_SECRET=
   PRO_ADMIN_TOKEN=
   PRO_SIGNING_KEY=
   DB_PASSWORD=
   # The Privy app (its id is also built into the game).
   PRIVY_APP_ID=
   PRIVY_APP_SECRET=
   # Pro mode, closed while BLADES_MINT is empty (server/api/_pro.js): the $BLADES mint, the pot wallet's secret key,
   # an RPC endpoint such as Helius's (the public one is rate limited), and the fee in whole tokens.
   BLADES_MINT=
   POT_SECRET=
   SOLANA_RPC=
   PRO_FEE=50000
   ```

5. **Start it:** `cd /opt/five-blades/apps/app/arena && docker compose up -d --build`. Once DNS points here,
   `https://fiveblades.online` is the game and `https://api.fiveblades.online/health` answers `{"ok":true,…}`.

The pot wallet pays every entry's network fee and every payout's token account, a fraction of a cent each: keep a
little SOL in it.

## Running and updating

| | |
|---|---|
| Logs | `docker compose logs -f site` (or `arena`, `caddy`, `db`) |
| The database | `docker compose exec db psql -U blades` |
| A backup | `docker compose exec db pg_dump -U blades blades > backup.sql` |
| Update | `git pull && docker compose up -d --build` |
| A changed `.env` | `docker compose up -d` (and `--build` after changing `PRIVY_APP_ID`, `SITE_DOMAIN` or `ARENA_DOMAIN`, which the game is built with) |
| The arena on this machine | `pnpm -C apps/app exec vite build -c vite.arena.config.ts && node --no-experimental-webstorage apps/app/build/arena/main.js` (port 8787; the dev game connects to `ws://localhost:8787/play`) |

A restart of the arena drops every table: players are put back in matchmaking by their games, a pro match cut short
is held for the operator after an hour (`api/pro-admin.js`), and a paid run cut short has no result, so it is not
paid.

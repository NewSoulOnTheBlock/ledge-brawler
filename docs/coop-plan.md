# Co-op campaign — plan (agreed 2026-11-16)

Up to five players play one campaign chapter together. Solo campaign, Survival and Versus must keep working exactly as
they do now; co-op is a separate path, switched on only inside a co-op room.

## Decisions (the owner's)
- **Characters:** each player is a different one of the five protagonists, no duplicates. The chapter is the host's
  protagonist's; the others join it.
- **Progress:** everyone in the group gets credit. The chapter counts for each player's campaign of that protagonist,
  only if it is their next unplayed chapter there; skill points and relics for all.
- **Story choices:** the host decides, everyone sees the same scene (Reaper's talk, dilemmas, boss replies).
- **Lives:** a knocked-out player is revived by a teammate standing beside them for a few seconds. Each player can be
  revived **at most 3 times**; after that they are out and watch until the level ends. The level fails only when every
  player is down at once.

## Assumptions (mine — say if wrong)
- The Reaper's bargain (third death) does not happen in co-op: the revive limit replaces it.
- No friendly fire.
- Joining is in a lobby before the level starts; no dropping in mid-level (phase 5 may add it).
- Difficulty scales with the number of players (more foes per ambush, boss health ×(1 + 0.6 per extra player)); tune in phase 5.

## Architecture
- **Host-authoritative world.** The host's game runs enemies, boss, ambushes, keys, relics, boss door and exit.
- **Each client runs only its own fighter**, as Versus does (versus.ts: packed state, interpolation, reconnects).
- Guests' hits on enemies go to the host, which applies them (checked like Versus hits: reach, caps, dedupe).
- Host sends one packed enemy snapshot (~15/s; the relay drops >60 msgs/s per client) plus events:
  ambush begun, key/relic found, foe down, drop spawned, boss talk/answer, boss down, door open, level cleared.
- Every client builds the same level from its seed; the host sends the level id and its world-shaping (the host's
  saga decides `shaped()`), never the map.
- Enemies target the nearest living player instead of `S.hero`.
- Same Multiplayer Agent relay and key as Versus (free plan: 30 players at once across both modes).

## Not breaking anything
1. With co-op off (solo), every code path is today's. Phase 0 refactors with no behaviour change.
2. Spec: new rules are added; no existing rule changes. `pnpm check` green at every step.
3. Before and after each phase: `workbench/capture/campaign.mjs`, `versus.mjs`, `match.mjs`, `phone.mjs`, `monkey.mjs`.
4. Nothing is deployed until the owner says so.

## Phases
| # | Phase | Playable result |
|---|---|---|
| 0 | Refactor: enemy targeting over a list of players (`S.hero` → players list); solo identical | nothing new; all regressions pass |
| 1 | Co-op lobby/room, hero picks without duplicates, everyone loads the host's chapter, sees each other | 2–5 people exploring one level |
| 2 | Host-run enemies, guest hits, nearest-player targeting | ambushes fought together |
| 3 | Shared level state: keys, relics, boss door, boss talk/answer (host), boss fight, clear | a whole chapter together |
| 4 | Story + progress: credit for all, host's choices shown to all, revives (3 per player), group failure | chapters count for everyone |
| 5 | Hardening: host leaves (hand over to next player), reconnect, difficulty scaling, 5-browser + lag test (`netlab.mjs`) | ready to deploy |

## Status (2026-11-16) — built locally, not deployed
All phases 0–5 are in. Code: `apps/app/src/together.ts` (table, host election by seat time + 1 s heartbeat / 5 s silence,
`go`/`world`/`foe`/`lvl`/`talk`/`hb` messages), `src/Coop.tsx` (table, party list, wiped panel), `versus.ts`
(`RoomLink`: co-op rooms `ledge-coop-<code>`, level number in place of a duel's round), `game/sim.ts` (`sides`,
`allies`, stand-ins `remote`/`uid`/`shown`, `world`/`heardWorld`/`hitFoe`/`shared`, `stepDown`/`riseHere`, `crowd`,
seeded keys), `render.ts` (teammates, downed markers, minimap), App.tsx (`sit`, `embark(made, together)`,
`backToTable`, `?together=<code>`).
- Test (2026-11-16, over the relay): `node workbench/capture/coop.mjs [players 2-5] [address] [lag] [jitter]` — passed with 5 players at 120±60 ms:
  same level, 4 teammates each, enemy stand-ins in step, guest blows land, keys shared, revive, host leaves → next
  takes over every enemy, way out clears for all.
- Message budget per second: host ≈ 20 words + 15 world (shots/effects/warnings batched inside) + 1 beat; guest ≈ 20 words
  + ≤12.5 blow batches + ≤20 effects + 1 beat (relay drops past 60).
- Not done: joining mid-level (a late arrival waits at the table for the next level); the Reaper's bargain panel is
  replaced by teammate revives; story choices (boss replies, heeding) are the host's, guests watch them.

## Status (2026-11-17) — on the arena server
Tables are now the arena server's (`apps/app/src/arena/`, `spec/app/lobby.md`), not the Multiplayer Agent relay's:
"Find a group" seats a player at any open co-op table with a free seat, a private table is reached by its code, and a
table stops taking players from matchmaking while its group plays a level.

The level's world is the arena's too (`apps/app/src/arena/level.ts`): when the host sets out (`go`), the server hosts
the level in a headless `createGame` with no fighter of its own (`Game.haunt`), every fighter of the group a teammate
placed where its game says. It springs the ambushes, runs the enemies and the boss, lands the group's blows (`foe`,
judged as a duel's are), tells each game of the blows on its fighter, and holds still while the host's guide or boss
talks (`talk`); the boss's coming is told to the host's game (`parley`), which sends back how it was answered
(`answer`). Every game of the group is a guest; the host only leads the table and the talk, and no hand-over of the
world is needed when it leaves. What each fighter meets itself (keys, traps, the way out) stays its own game's, told to
all with `lvl`. A paid Survival run is played the same way (`run.ts`), its fighter a puppet of the player's game.

The workbench check (`workbench/capture/coop.mjs`) needs the arena running beside the dev server
(`apps/app/arena/README.md`, "On this machine").

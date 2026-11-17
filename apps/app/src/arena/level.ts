// spec/app/index.md, "Story: Play a level of a campaign"
// A co-op level as the arena server hosts it (arena.ts; docs/coop-plan.md): a game of sim.ts with no fighter of its
// own (`Game.haunt`), in which every fighter of the group is a teammate, placed where its player's game says. Its
// enemies, its ambushes and its boss are the server's, and no player's game decides what they do: each game draws
// them where this one says; a blow of a fighter's on one is told here and landed if it could land; a blow of theirs
// on a fighter is told to that fighter's game. What a fighter meets itself (a piece of the key, a trap, the way out)
// is its own game's, which tells the group, and this one, of what concerns everyone (`shared`).
import { type Event, type Match, enabled, initial, step } from "../../gen/app.ts";
import { levelById } from "../game/levels.ts";
import { type Hurt, type Peer, type Sfx, type Shared, type Ui, type World, createGame } from "../game/sim.ts";

const silent = new Proxy({}, { get: () => () => undefined }) as Sfx;

/** The level `id` for a group: `struck` tells a fighter's game of a blow on it, and `parley` that the boss has come
 *  face to face with the group, for whoever leads it to have it speak. Null for a level there is no such id of. */
export function createLevel(id: string, on: { struck(to: string, blow: Hurt): void; parley(): void }) {
  const made = levelById(id);
  if (!made) return null;
  let match: Match = initial, talking = false;
  const rules = { get: () => match, send: (event: Event) => (enabled(match, event) ? (match = step(match, event)) : undefined) };
  const ui: Ui = { sfx: silent, banner: () => undefined, callout: () => undefined, strike: (to, blow) => on.struck(to, blow), parley: () => on.parley() };
  const game = createGame(rules, ui);
  rules.send({ type: "enter" });
  rules.send({ type: "embark" });
  game.coop({ host: true });
  game.begin(made);
  game.haunt();
  return {
    /** `ms` of the level: its enemies' and its boss's, which wait while its guide or its boss talks. */
    play(ms: number) { game.frame(Math.min(100, Math.max(0, ms))); },
    /** The group's fighters, as their games last said. */
    peers(list: Peer[]) { game.peers(list); },
    /** A blow a fighter's game says it landed on enemy `uid`, already judged possible by the caller. */
    foe(uid: number, blow: Hurt) { game.hitFoe(uid, blow); },
    /** Where enemy `uid` is, if it stands. */
    foeAt(uid: number) { const E = game.scene.enemies.find((each) => each.uid === uid && each.alive); return E ? E.body.position : null; },
    /** Something a fighter's game says happened to the whole group: a piece of the key found, the level cleared. */
    shared(event: Shared, from: string) { game.shared(event, from); },
    /** The guide or the boss talks, or stops, as the game of whoever leads the group shows it. */
    talk(on: boolean) { if (on !== talking) { talking = on; game.talk(on); } },
    /** How the group answered the boss (parley.ts): it fights harder, or with half its health. */
    answer(how: "defied" | "reasoned") { game.answer(how); },
    world: (): World => game.world(),
  };
}
export type Level = NonNullable<ReturnType<typeof createLevel>>;

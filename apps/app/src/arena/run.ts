// spec/app/index.md, "Story: Fight the waves"; spec/app/index.md, "Story: Stay alive"
// A paid Survival run as the arena server plays it (arena.ts): the waves, the enemies and the fighter's health are a
// game of sim.ts here, kept by the match rules themselves (gen/app.ts), and nowhere else. The fighter stands where its
// player's game says (`Game.puppet`); the enemies go for it and strike it here, and that game is told of each blow.
// A blow of the player's on an enemy is that game's to find and this one's to land (`foe`). So the waves reached and
// the enemies knocked out, which decide the day's pot, are what the server saw.
import { type Event, type Match, enabled, full, initial, step } from "../../gen/app.ts";
import { type Hurt, type Sfx, type Ui, type World, createGame } from "../game/sim.ts";
import { type Word, peerOf } from "./word.ts";

/** How a run stands, as the server keeps it. */
export interface RunWord { hp: number; most: number; wave: number; kos: number; alive: boolean;
  /** The fighter has fallen for good: the run is over, and its wave and knockouts are its result. */
  over: boolean }

const silent = new Proxy({}, { get: () => () => undefined }) as Sfx;

/** A run of `fighter`, trained by `vigor` (at most what training gives, spec/app/index.md, "A fighter can be trained
 *  for up to 50 more health, on the select screen"): `landed` tells its player's game of a blow on its fighter, and
 *  `ended` of the run's end, once. */
export function createRun(fighter: number, vigor: number, on: { landed(blow: Hurt): void; ended(result: RunWord): void }) {
  let match: Match = initial, over = false;
  const rules = { get: () => match, send: (event: Event) => (enabled(match, event) ? (match = step(match, event)) : undefined) };
  const ui: Ui = {
    sfx: silent, banner: () => undefined, callout: () => undefined, landed: (blow) => on.landed(blow),
    // spec/app/index.md, "A fighter knocked out against the waves starts over from the first"
    // Its end is told once the step it came in is played out (`play`), so that what is told is how the run stands.
    lost: () => { over = true; },
  };
  const game = createGame(rules, ui);
  rules.send({ type: "enter" });
  rules.send({ type: "focus", pick: Math.max(0, Math.min(4, fighter)) });
  rules.send({ type: "train", vigor: Math.max(0, Math.min(50, vigor)), learned: 5 });
  rules.send({ type: "fight" });
  game.coop({ host: true });
  game.begin(null);
  const word = (): RunWord => ({ hp: match.hp, most: full(match), wave: match.wave, kos: match.kos, alive: match.alive, over });
  return {
    game,
    /** `ms` of the run, unless its player has paused it. */
    play(ms: number) {
      if (over) return;
      game.frame(Math.min(100, Math.max(0, ms)));
      if (over) on.ended(word());
    },
    /** Where the player's game says the fighter is; a special it may not be in is left out by the caller. */
    steer(id: string, w: Word) { game.puppet(peerOf(id, w)); },
    /** A blow the player's game says it landed on enemy `uid`, already judged possible by the caller. */
    foe(uid: number, blow: Hurt) { game.hitFoe(uid, blow); },
    /** Where enemy `uid` is, if it stands. */
    foeAt(uid: number) { const E = game.scene.enemies.find((each) => each.uid === uid && each.alive); return E ? E.body.position : null; },
    fell() { if (!over) game.plunge(); },
    world: (): World => game.world(),
    word,
    /** Ends the run where it stands, as its player has left it. */
    end() { if (!over) { over = true; on.ended(word()); } },
    get over() { return over; },
  };
}
export type Run = ReturnType<typeof createRun>;


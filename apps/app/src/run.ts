// spec/app/index.md, "Story: Fight the waves"; spec/app/index.md, "Story: Stay alive"
// A paid Survival run, played at the arena server (arena/run.ts), which plays its waves and keeps its fighter's
// health, its waves and its knockouts. This game is its guest, as a co-op guest is its host's (sim.ts): it moves its
// own fighter and says where it is; the enemies are the server's, drawn where it says; a blow of this fighter's on
// one is told to the server, which lands it; a blow on this fighter comes from the server, and so does its health.
import type { Game, Hurt, Rules, Shot, World } from "./game/sim.ts";
import { joinArena } from "./arena/link.ts";
import type { ProSeat } from "./arena/protocol.ts";
import type { RunWord } from "./arena/run.ts";
import { pack, wordOf } from "./arena/word.ts";

/** How often the fighter says where it is, and again when it has not moved; and how often its blows go, in milliseconds. */
const SAY_EVERY = 50, STILL_EVERY = 200, FOE_EVERY = 80;

export interface Paid {
  /** Once a frame, before the game's own: says where the fighter is, and sends its blows. */
  tick(): void;
  foeHit(uid: number, blow: Hurt): void;
  shot(orb: Shot): void;
  fell(): void;
  leave(): void;
}

/** Plays the run `rules` has just begun in `game` at the arena, for the paid entry `seat`; `onRun` hears how it stands. */
export async function joinRun(seat: ProSeat, name: string, game: Game, rules: Rules, onRun: (run: RunWord) => void): Promise<Paid> {
  const match = rules.get();
  const room = await joinArena({ kind: "run", name, fighter: match.fighter, vigor: match.vigor, pro: seat });
  game.coop({ host: false });
  room.me.set({ n: name, f: match.fighter });
  room.on("world", (data: { w: World }) => game.heardWorld(data.w, performance.now()));
  const within = (v: unknown, most: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-most, Math.min(most, v)) : 0);
  room.on("hit", (blow: Hurt) => game.struck("arena", { dmg: Math.max(0, within(blow.dmg, 200)), kx: within(blow.kx, 40), ky: within(blow.ky, 40), stun: blow.stun === undefined ? undefined : Math.max(0, within(blow.stun, 200)), heavy: !!blow.heavy, float: !!blow.float, from: within(blow.from, 1) }));
  room.onRun((run) => { onRun(run); game.heldTo(run.hp); });
  let said = 0, sent = 0, lastSaid = "", paused: boolean | null = null, gone = false;
  const hits: number[][] = [];
  return {
    tick() {
      if (gone) return;
      const now = performance.now(), m = rules.get();
      if (m.paused !== paused) { paused = m.paused; room.me.set({ P: paused ? 1 : 0 }); }
      if (game.scene.hero && now - said >= SAY_EVERY) {
        const same = pack(wordOf(game, m, 1, 0));
        if (same !== lastSaid || now - said >= STILL_EVERY) { said = now; lastSaid = same; room.me.set({ s: pack({ ...wordOf(game, m, 1, 0), sent: now }) }); }
      }
      if (hits.length && now - sent >= FOE_EVERY) { sent = now; room.send("foe", { h: hits.splice(0, 20) }); }
    },
    foeHit(uid, blow) { if (hits.length < 60) hits.push([uid, Math.round(blow.dmg * 10) / 10, blow.kx, blow.ky, blow.stun ?? -1, blow.heavy ? 1 : 0, blow.float ? 1 : 0, blow.from ?? 0]); },
    shot: (orb) => room.send("orb", orb),
    fell: () => room.fell(),
    leave() { if (!gone) { gone = true; void room.leave(); } },
  };
}

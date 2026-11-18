// spec/app/index.md, "Story: Fight other players"; spec/app/bout.md, "Story: Fight for the pot"
// What a player's game says of its fighter twenty times a second, packed as one field of its seat (protocol.ts): read
// by the other games at its table (versus.ts), and by the arena server, which judges a duel's blows by it (arena.ts)
// and stands a paid run's fighter where it says (run.ts).
import type { Match } from "../../gen/app.ts";
import { CHARS } from "../game/data.ts";
import { type Frame, frameOf } from "../game/figure.ts";
import type { Game, Peer } from "../game/sim.ts";
import type { Fields } from "./protocol.ts";

export interface Word { x: number; y: number; vx: number; vy: number; facing: number; hp: number; lives: number; alive: boolean; glow: boolean; guard: boolean; round: number; kos: number; at: Frame; over: boolean; special: Peer["special"];
  /** When it was said, by the sayer's own clock, in milliseconds; an older game does not say, and it is taken as heard. */
  sent?: number }

const say = (at: Frame) => ("move" in at ? `m:${at.move}:${Math.floor(at.frame)}` : `a:${at.anim}:${Math.floor(at.frame)}`);
function heard(text: string): Frame {
  const [kind, name, frame] = text.split(":");
  return kind === "m" ? { move: name, frame: Number(frame) } : { anim: name as never, frame: Number(frame) };
}

// Every field set is a message of its own, and a connection takes only so many a second. So a fighter's whole state
// goes as ONE field, a line of text, and its name and fighter, which do not change, as two more, once.
export const pack = (w: Word) => [Math.round(w.x), Math.round(w.y), Math.round(w.vx * 10) / 10, Math.round(w.vy * 10) / 10, w.facing, w.hp, w.lives, +w.alive, +w.glow, +w.guard, w.round, w.kos, say(w.at), +w.over,
  // A special: which, how far in, its aim in hundredths of a radian, and its centre.
  w.special ? [w.special.slot, Math.round(w.special.t), w.special.ang === undefined ? "" : Math.round(w.special.ang * 100), w.special.c ? Math.round(w.special.c.x) : "", w.special.c ? Math.round(w.special.c.y) : ""].join(":") : "",
  Math.round(w.sent ?? 0)].join(",");

/** What `game` shows of its fighter now, in round `round`, with `kos` knockouts. */
export function wordOf(game: Game, match: Match, round: number, kos: number): Word {
  const hero = game.scene.hero!, at = hero.body.position, v = hero.body.velocity;
  return { x: at.x, y: at.y, vx: v.x, vy: v.y, facing: hero.facing, hp: match.hp, lives: match.lives, alive: match.alive, glow: match.overdrive > 0 || hero.charging, guard: game.scene.guard > 0, round, kos, at: frameOf(hero, game.scene.time), over: match.overdrive > 0,
    special: hero.special ? { slot: CHARS.flatMap((c) => c.specials).indexOf(hero.special.def), t: hero.special.t, ang: hero.special.ang, c: hero.special.c } : null };
}

/** What a word says of a fighter, as sim.ts places another's: for the arena server's run (`Game.puppet`). */
export const peerOf = (id: string, w: Word): Peer => ({ id, name: "", fighter: 0, x: w.x, y: w.y, vx: w.vx, vy: w.vy, facing: w.facing, hp: w.hp, lives: w.lives, alive: w.alive, glow: w.glow, guard: w.guard, at: w.at, over: w.over, special: w.special });

/** A special as it was packed, or none: an older game says nothing of them. */
function special(text: string | undefined): Peer["special"] {
  if (!text) return null;
  const [slot, t, ang, cx, cy] = text.split(":");
  return { slot: Number(slot), t: Number(t), ang: ang === "" ? undefined : Number(ang) / 100, c: cx === "" ? undefined : { x: Number(cx), y: Number(cy) } };
}

/** What a player's fields say of its fighter, or null if they say nothing that can be read: whatever a game sends is untrusted. */
export function unpack(p: Fields): Word | null {
  if (typeof p.s !== "string") return null;
  const v = p.s.split(","), n = (i: number) => Number(v[i]);
  if (v.length < 13 || !Number.isFinite(n(0)) || !Number.isFinite(n(1))) return null;
  return { x: n(0), y: n(1), vx: n(2) || 0, vy: n(3) || 0, facing: n(4) < 0 ? -1 : 1, hp: n(5), lives: n(6), alive: v[7] === "1", glow: v[8] === "1", guard: v[9] === "1", round: n(10), kos: n(11), at: heard(v[12]), over: v[13] === "1", special: special(v[14]), sent: v[15] ? n(15) : undefined };
}

// spec/app/index.md, "Story: Play a level of a campaign"
// The traps of a hand-drawn level: when each is dangerous, worked out from the time alone, so that what sim.ts hurts
// with and what render.ts draws are always the same thing. Crumbling ledges and crushers wait for the fighter and keep
// their own state in sim.ts; spikes, blades and bolts run on a clock and need none.
import type { Vec } from "./data.ts";

/** What a level's traps are (rooms.ts lays them out from the characters of its map). */
export interface Traps {
  /** A ledge that gives way under a fighter and grows back: its centre, the top of it, and how wide. */
  crumbles: [cx: number, top: number, w: number][];
  /** Spikes that rise out of the floor and sink again: a box `w` wide standing on (x, y). */
  spikes: (Vec & { w: number; phase: number })[];
  /** A blade on a chain, swinging from (x, y), `len` long. */
  blades: (Vec & { len: number; phase: number })[];
  /** A slot in the rock at (x, y) that looses a bolt toward `dir`, which flies `reach` before it breaks. */
  bolts: (Vec & { dir: 1 | -1; reach: number; phase: number })[];
  /** A block of stone hung at (x, y), its top, on chains from the ceiling at `hang`; it falls `drop` when a fighter passes under it. */
  crushers: (Vec & { w: number; drop: number; hang: number })[];
  /** A grate in the floor that blasts a column of fire `h` tall: a box `w` wide standing on (x, y). */
  flames: (Vec & { w: number; h: number; phase: number })[];
  /** A bookcase in the wall at (x, y), the middle of its face, that rams `reach` toward `dir` and draws back. */
  rams: (Vec & { dir: 1 | -1; reach: number; phase: number })[];
  /** A wagon of the convoy, `w` wide, its top at `y`, running to and fro on its track between the centres `from` and `to`. */
  wagons: { from: number; to: number; y: number; w: number; phase: number }[];
  /** A seam in the ground that opens by itself and seals again: its centre, the top of it, how wide. */
  seams: { x: number; y: number; w: number; phase: number }[];
}

/** How tall risen spikes are, and a crusher's block. */
export const SPIKE_H = 34, CRUSH_H = 80, BLADE_R = 30;

// Spikes: down, then a warning (their tips show and rattle), then up.
const SPIKE_CYCLE = 2.6, SPIKE_WARN = 1.2, SPIKE_UP = 1.55;
/** How far risen a row of spikes is (0 down, 1 up), and whether it is about to rise. */
export function spikeAt(time: number, phase: number) {
  const c = (((time + phase) % SPIKE_CYCLE) + SPIKE_CYCLE) % SPIKE_CYCLE;
  if (c < SPIKE_WARN) return { up: 0, warn: false };
  if (c < SPIKE_UP) return { up: 0.18, warn: true };
  // Out fast, held, and drawn in over the last tenth of a second.
  const into = c - SPIKE_UP, left = SPIKE_CYCLE - c;
  return { up: Math.min(1, into / 0.06, left / 0.1), warn: false };
}

// Fire: out, then a warning (embers and a lick of flame), then a column too tall to jump.
const FLAME_CYCLE = 3.0, FLAME_WARN = 1.4, FLAME_UP = 1.9;
/** How high a vent's fire stands (0 out, 1 full), and whether it is about to blast. */
export function flameAt(time: number, phase: number) {
  const c = (((time + phase) % FLAME_CYCLE) + FLAME_CYCLE) % FLAME_CYCLE;
  if (c < FLAME_WARN) return { up: 0, warn: false };
  if (c < FLAME_UP) return { up: 0.12, warn: true };
  const into = c - FLAME_UP, left = FLAME_CYCLE - c;
  return { up: Math.min(1, into / 0.12, left / 0.15), warn: false };
}

// A ram: home, then rattling, then out at once, held, and drawn slowly back.
const RAM_CYCLE = 2.8, RAM_WARN = 1.2, RAM_OUT = 1.6, RAM_HELD = 2.2;
/** How far out a ram is (0 home, 1 its whole reach), and whether it is about to strike. */
export function ramAt(time: number, phase: number) {
  const c = (((time + phase) % RAM_CYCLE) + RAM_CYCLE) % RAM_CYCLE;
  if (c < RAM_WARN) return { out: 0, warn: false };
  if (c < RAM_OUT) return { out: 0, warn: true };
  if (c < RAM_HELD) return { out: Math.min(1, (c - RAM_OUT) / 0.1), warn: false };
  return { out: 1 - (c - RAM_HELD) / (RAM_CYCLE - RAM_HELD), warn: false };
}

// A seam: shut, then glowing along its crack, then open, then shut again.
const SEAM_CYCLE = 3.4, SEAM_WARN = 1.8, SEAM_OPEN = 2.3;
/** Whether a seam is open, and whether it is about to open. */
export function seamAt(time: number, phase: number) {
  const c = (((time + phase) % SEAM_CYCLE) + SEAM_CYCLE) % SEAM_CYCLE;
  return { open: c >= SEAM_OPEN, warn: c >= SEAM_WARN && c < SEAM_OPEN, glow: Math.min(1, c / SEAM_WARN) };
}

const WAGON_SPEED = 150;
/** Where the middle of a wagon is: easing to a stop at each end of its track, and away again. */
export function wagonAt(time: number, w: Traps["wagons"][number]) {
  const period = Math.max(2, (2 * (w.to - w.from)) / WAGON_SPEED + 1.2);
  return w.from + (w.to - w.from) * (0.5 - 0.5 * Math.cos((time / period) * Math.PI * 2 + w.phase));
}

const SWING = 1.0, SWING_SPEED = 2.1;
/** Where a blade is: the angle of its chain from straight down, the middle of its blade, and which way it moves. */
export function bladeAt(time: number, b: Traps["blades"][number]) {
  const a = SWING * Math.sin(time * SWING_SPEED + b.phase);
  return { a, tip: { x: b.x + b.len * Math.sin(a), y: b.y + b.len * Math.cos(a) }, dir: Math.sign(Math.cos(time * SWING_SPEED + b.phase)) || 1 };
}

const BOLT_CYCLE = 2.4, BOLT_WARN = 0.55, BOLT_SPEED = 820;
/** Which bolt of its slot is flying (a count that only rises), where its point is if one is, and whether the slot glows. */
export function boltAt(time: number, b: Traps["bolts"][number]) {
  const t = time + b.phase, shot = Math.floor(t / BOLT_CYCLE), since = t - shot * BOLT_CYCLE, gone = since * BOLT_SPEED;
  return { shot, at: gone < b.reach ? b.x + b.dir * gone : null, warn: since > BOLT_CYCLE - BOLT_WARN };
}

/** A crusher's state: 0 waits, 1 rattles, 2 falls, 3 lies on the floor, 4 is drawn back up. `y` is how far down it is. */
export interface Crusher { mode: 0 | 1 | 2 | 3 | 4; t: number; y: number; v: number }
/** A crumbling ledge's state: steps since it was stood on (-1 while whole and untouched), and steps until it grows back. */
export interface Crumble { t: number; gone: number }
export const CRUMBLE_HOLD = 30, CRUMBLE_BACK = 170;

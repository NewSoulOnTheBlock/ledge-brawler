// spec/app/index.md, "Story: Play a level of a campaign"
// The traps of a hand-drawn level: when each is dangerous, worked out from the time alone, so that what sim.ts hurts
// with and what render.ts draws are always the same thing. Crumbling ledges and crushers wait for the fighter and keep
// their own state in sim.ts; spikes, blades and bolts run on a clock and need none.
import type { Vec } from "./data.ts";

/** What a level's traps are (rooms.ts lays them out from the characters of its map). */
export interface Traps {
  /** A ledge that gives way under a fighter and grows back: its centre, the top of it, and how wide. */
  /** Ledges that crumble; `hidden` ones are false floors, drawn as rock until they have given way once. */
  crumbles: [cx: number, top: number, w: number, hidden?: boolean][];
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
  /** A nozzle in the wall at (x, y) that blasts its hero's element `reach` toward `dir` (fire, ink, lightning, water, thorns). */
  jets: (Vec & { dir: 1 | -1; reach: number; phase: number })[];
  /** A bell hung at (x, y) that tolls a ring out to `reach`, knocking away whoever the ring passes through. */
  bells: (Vec & { reach: number; phase: number })[];
  /** A vent in the rock at (x, y), the middle of the row it blows along, pushing whoever is in that row `reach` toward `dir`. */
  gusts: (Vec & { dir: 1 | -1; reach: number; phase: number })[];
  /** Ground glazed with ice, from x0 to x1 with its top at `top`: a fighter on it gathers speed and stops slowly. */
  ice: [x0: number, top: number, x1: number][];
  /** A soldier frozen in ice standing on (x, y), facing `dir`: it cracks free and slashes at whoever passes in front of it. */
  frozen: (Vec & { dir: 1 | -1 })[];
  /** Gates in pairs: stepping into one brings a fighter out of the other, still moving. `a` and `b` are where each stands. */
  gates: { a: Vec; b: Vec }[];
  /** Paths of the dead: ledges in two sets that take turns to be solid. Centre, top, width, and which set. */
  spirits: { x: number; y: number; w: number; set: 0 | 1 }[];
  /** The Witness's eyes, set in the rock: each opens in turn and sends a wisp after whoever it sees. */
  eyes: Vec[];
  /** Graves in the ground: whoever lingers on one is grabbed by the hands of the dead. Centre, ground level, width. */
  graves: { x: number; y: number; w: number }[];
  /** Tide pools in the streets: water that floods up to TIDE_H above the ground and drains again. Ends, ground level. */
  tides: { x0: number; x1: number; y: number }[];
  /** Grave-lanterns: whoever passes one wakes a shade of themselves that follows their own path, a little behind. */
  lanterns: Vec[];
  /** Blade-lifts: platforms of floating blades that rise from the ground and sink again. Centre, ground, width, how high, phase. */
  lifts: { x: number; y: number; w: number; rise: number; phase: number }[];
  /** Belts: floors driven by the engine, carrying whoever stands on them one way. Ends, top, and which way (1 right, -1 left). */
  belts: { x0: number; x1: number; y: number; dir: 1 | -1 }[];
  /** Mortars on the ground: each lobs a shell at where it last saw a fighter stand. Muzzle. */
  mortars: Vec[];
  /** Floorboards a fire runs along, end to end and again. Ends, top, which way it runs, phase. */
  planks: { x0: number; x1: number; y: number; dir: 1 | -1; phase: number }[];
  /** Binding threads: a thread pulled taut between two rune anchors in a row, now and then. Ends, height, phase. */
  threads: { x0: number; x1: number; y: number; phase: number }[];
  /** False walls: rock to look at, air to walk through (the top left of each cell). */
  veils: Vec[];
  /** Caches in hidden chambers, each a thing for the bag that lies there until it is taken. */
  caches: Vec[];
  /** Warning posts, at the start of a gauntlet. */
  signs: Vec[];
  /** The air of hidden chambers (the top left of each cell): drawn as rock until a fighter is inside; `on` when it
   *  lies on rock, whose lit top would show through unless the rock over the chamber reaches down into it. */
  hollows: (Vec & { on: boolean })[];
}

// A thread: slack, then flickering (the warning), then taut, which is when it cuts.
const THREAD_CYCLE = 3.2, THREAD_SLACK = 1.6, THREAD_WARN = 0.6;
/** Whether a thread is taut, and how near it is to it while it flickers (0 to 1). */
export function threadAt(time: number, phase: number) {
  const c = (((time + phase) % THREAD_CYCLE) + THREAD_CYCLE) % THREAD_CYCLE;
  return { taut: c >= THREAD_SLACK + THREAD_WARN, warn: c >= THREAD_SLACK && c < THREAD_SLACK + THREAD_WARN ? (c - THREAD_SLACK) / THREAD_WARN : 0 };
}

/** How fast a fire runs along the boards (px a step; a run is about 4) and how wide its front is. */
export const FIRE_SPEED = 2.4, FIRE_FRONT = 2 * 64;
/** The stretch of a run of boards burning now, or null between fires. */
export function fireAt(time: number, p: Traps["planks"][number]) {
  const len = p.x1 - p.x0, head = (((time * 60 * FIRE_SPEED + p.phase) % (len + 6 * 64)) + len + 6 * 64) % (len + 6 * 64);
  if (head > len + FIRE_FRONT) return null;
  const a = Math.max(0, head - FIRE_FRONT), b = Math.min(len, head);
  return p.dir > 0 ? { x0: p.x0 + a, x1: p.x0 + b, head } : { x0: p.x1 - b, x1: p.x1 - a, head };
}

/** A shell in flight: from, to, steps flown and steps it takes. */
export interface Shell { x0: number; y0: number; x1: number; y1: number; t: number; T: number }
/** How far a mortar fires, how long a shell flies (steps), how wide it bursts, how often a mortar fires (s). */
export const MORTAR_RANGE = 14 * 64, SHELL_FLIGHT = 80, SHELL_BURST = 80, MORTAR_EVERY = 3.6;
/** Where a shell is, flying a high arc. */
export function shellAt(s: Shell) {
  const u = s.t / s.T;
  return { x: s.x0 + (s.x1 - s.x0) * u, y: s.y0 + (s.y1 - s.y0) * u - 4 * 260 * u * (1 - u) };
}

/** How fast a belt carries a fighter (a run is about 4 a step, so a belt can always be walked against). */
export const BELT_SPEED = 2.2;

/** The most a blade-lift rises (it stops short of rock, two cells under it, so a rider is never crushed). */
export const LIFT_MAX = 10 * 64;

/** A shade woken by a lantern: the step it woke on. */
export interface Shade { born: number; from: number }
/** How far behind a shade follows (steps), how long it lasts once it is up, and how long a lantern sleeps after. */
export const SHADE_LAG = 100, SHADE_LIFE = 360, LANTERN_SLEEP = 720;

/** How high a tide floods, how long a fighter can be under it before it hurts, and how it slows them. */
export const TIDE_H = 3 * 64, TIDE_BREATH = 45, TIDE_DRAG = 0.9;

/** A grave: still (0), stirring once someone stands on it (1), grasping (2), sinking back (3); and steps left in that. */
export interface Grave { mode: 0 | 1 | 2 | 3; t: number }
/** Steps a grave stirs before the hands come up, how long they stay up, and how long it rests after. */
export const GRAVE_STIR = 40, GRAVE_GRASP = 40, GRAVE_REST = 80;

/** A wisp sent by an eye: where it is, how it moves, and how many steps it has left. */
export interface Wisp { x: number; y: number; vx: number; vy: number; life: number }
/** How far an eye sees; a wisp's top speed, how fast it turns, and how long it lasts. */
export const EYE_SIGHT = 10 * 64, WISP_SPEED = 2.6, WISP_TURN = 0.11, WISP_LIFE = 330;

/** A frozen soldier's state: 0 frozen, 1 cracking (the warning), 2 slashing, 3 settling back into the ice; steps left in it. */
export interface Thaw { mode: 0 | 1 | 2 | 3; t: number }
/** How far ahead a frozen soldier sees, and how far its slash reaches. */
export const FROZEN_SIGHT = 2.5 * 64, FROZEN_REACH = 2.2 * 64;

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

// A jet: quiet, then sputtering at its nozzle, then a beam the length of its reach.
const JET_CYCLE = 3.2, JET_WARN = 1.6, JET_ON = 2.1;
/** Whether a jet is blasting, and whether it is about to. */
export function jetAt(time: number, phase: number) {
  const c = (((time + phase) % JET_CYCLE) + JET_CYCLE) % JET_CYCLE;
  return { on: c >= JET_ON, warn: c >= JET_WARN && c < JET_ON };
}

// A bell: still, then swinging (the warning), then a toll whose ring spreads to its reach and is gone.
const BELL_CYCLE = 4.0, BELL_SWING = 2.6, BELL_TOLL = 3.2, RING_SPEED = 380;
/** How far a bell swings, and how far its ring has spread (null when there is none). */
export function bellAt(time: number, b: { reach: number; phase: number }) {
  const c = (((time + b.phase) % BELL_CYCLE) + BELL_CYCLE) % BELL_CYCLE, gone = (c - BELL_TOLL) * RING_SPEED;
  const swing = c >= BELL_SWING && c < BELL_TOLL ? Math.sin((c - BELL_SWING) * 30) * 0.35 * ((c - BELL_SWING) / (BELL_TOLL - BELL_SWING)) : 0;
  return { swing, ring: c >= BELL_TOLL && gone <= b.reach ? gone : null };
}

// A gust: calm, then stirring (the warning), then blowing, easing in and out.
const GUST_CYCLE = 3.6, GUST_STIR = 1.6, GUST_BLOW = 2.0;
/** How hard a gust blows (0 calm to 1), and whether it is stirring before it blows. */
export function gustAt(time: number, phase: number) {
  const c = (((time + phase) % GUST_CYCLE) + GUST_CYCLE) % GUST_CYCLE;
  if (c < GUST_STIR) return { blow: 0, stir: false };
  if (c < GUST_BLOW) return { blow: 0, stir: true };
  return { blow: Math.min(1, (c - GUST_BLOW) / 0.25, (GUST_CYCLE - c) / 0.25), stir: false };
}
/** How much of its grip on the ground a fighter keeps on ice. */
export const ICE_GRIP = 0.16;
/** How far a full gust carries a fighter in a step. */
export const GUST_PUSH = 3.6;

// Spirit paths: one set solid while the other is a shadow, then the other way round; each flickers before it goes.
const SPIRIT_CYCLE = 3.6, SPIRIT_FADE = 0.45;
/** Whether a set of spirit paths is solid, and how far it has faded towards going (0 to 1). */
export function spiritAt(time: number, set: 0 | 1) {
  const c = (((time + set * SPIRIT_CYCLE / 2) % SPIRIT_CYCLE) + SPIRIT_CYCLE) % SPIRIT_CYCLE, half = SPIRIT_CYCLE / 2;
  return { solid: c < half, fade: c < half ? Math.max(0, (c - (half - SPIRIT_FADE)) / SPIRIT_FADE) : 1 };
}

// An eye: shut, then opening (the warning), then open, sending its wisp as it opens wide, then shutting.
const EYE_CYCLE = 4.2, EYE_OPENING = 2.4, EYE_SEND = 3.0, EYE_SHUT = 3.7;
/** How open an eye is (0 to 1), and which of its sendings it is on (a count that only rises). */
export function eyeAt(time: number, i: number) {
  const t = time + i * 1.3, c = ((t % EYE_CYCLE) + EYE_CYCLE) % EYE_CYCLE;
  const open = c < EYE_OPENING ? 0 : c < EYE_SEND ? (c - EYE_OPENING) / (EYE_SEND - EYE_OPENING) : c < EYE_SHUT ? 1 : Math.max(0, 1 - (c - EYE_SHUT) / 0.3);
  return { open, sent: c >= EYE_SEND ? Math.floor(t / EYE_CYCLE) : Math.floor(t / EYE_CYCLE) - 1 };
}

// A tide: low, then rising, then high, then falling; each pool a little after the one to its west, so it rolls in.
const TIDE_CYCLE = 7, TIDE_LOW = 2.6, TIDE_RISE = 1.1, TIDE_HIGH = 1.8;
/** How full a tide pool is (0 to 1), and how close it is to rising while it is low (0 to 1). */
export function tideAt(time: number, x: number) {
  const c = (((time - x / 1200) % TIDE_CYCLE) + TIDE_CYCLE) % TIDE_CYCLE, up = TIDE_LOW + TIDE_RISE, down = up + TIDE_HIGH;
  const level = c < TIDE_LOW ? 0.06 : c < up ? 0.06 + 0.94 * ((c - TIDE_LOW) / TIDE_RISE) : c < down ? 1 : Math.max(0.06, 1 - (c - down) / (TIDE_CYCLE - down));
  return { level, stirring: c < TIDE_LOW ? Math.max(0, (c - (TIDE_LOW - 1)) / 1) : 0 };
}

// A blade-lift rests on the ground, rises, rests at the top, sinks; easing in and out of each move.
const LIFT_REST = 1.3, LIFT_MOVE = 1.8, LIFT_CYCLE = 2 * (LIFT_REST + LIFT_MOVE);
/** The top of a blade-lift now. */
export function liftAt(time: number, l: Traps["lifts"][number]) {
  const c = (((time + l.phase) % LIFT_CYCLE) + LIFT_CYCLE) % LIFT_CYCLE, ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
  const up = c < LIFT_REST ? 0 : c < LIFT_REST + LIFT_MOVE ? ease((c - LIFT_REST) / LIFT_MOVE) : c < 2 * LIFT_REST + LIFT_MOVE ? 1 : 1 - ease((c - 2 * LIFT_REST - LIFT_MOVE) / LIFT_MOVE);
  return l.y - l.rise * up;
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
export interface Crumble { t: number; gone: number; seen?: boolean }
export const CRUMBLE_HOLD = 30, CRUMBLE_BACK = 170;

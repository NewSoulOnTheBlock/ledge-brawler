// spec/app/index.md, "Story: Play a level of a campaign"; spec/app/index.md, "Story: Dash and climb"; spec/app/index.md, "Story: Stay alive"; spec/app/index.md, "Story: Charge and spend aura"; spec/app/index.md, "Story: Fight the waves"; spec/app/index.md, "Story: Learn the moves"
// The arena: bodies, poses, hits and timing. It owns where things are and reports what happened to the match
// through `Rules`; the fighter's health, aura, Overdrive, flight, the waves and the score are read back from it.
import Matter from "matter-js";
import { type Build, UNBUILT } from "../story/build.ts";
import { type Event, type Match, blastCostOf, enabled, fullAura, fullStamina, full, healthOf, lesson, specialCost } from "../../gen/app.ts";
import {
  AIR_CHAIN, AIR_FALL, ITEMS, type ItemId, AIR_RISE, BEAM_CHARGE, BEAM_FIRE, BOTH_UP, CASTER_SKIN, CHARGE, CHARS, CLIMB, CROSS_S, type Char, ENEMY_SKIN, FLY_HOVER, FLY_MOVE, FOUND, FX, type FxName,
  GROUND_CHAIN, JAB_S, type Joint, KICK_X, type Key, NOVA_GATHER, NOVA_RELEASE, type Pose, RAISE, SLAM_DOWN, SLAM_UP, SLOTS,
  STANCE, STUN, type Skeleton, type Skin, type Slot, type SpecialDef, TUCK, type Tone, VOLLEY_A, VOLLEY_B, type Vec, airify, sampleKeys, skeleton, smooth,
} from "./data.ts";
import { OUTFITS, RELICS, RELIC_KINDS, type RelicKind, collect, earned, isFound, outfitOf, skinOf } from "./relics.ts";
import type { Level } from "./levels.ts";
import { BLADE_R, CRUMBLE_BACK, CRUMBLE_HOLD, CRUSH_H, type Crumble, type Crusher, SPIKE_H, boltAt, bladeAt, flameAt, EYE_SIGHT, FROZEN_REACH, GRAVE_GRASP, GRAVE_REST, GRAVE_STIR, type Grave, TIDE_BREATH, TIDE_DRAG, TIDE_H, tideAt, liftAt, BELT_SPEED, fireAt, threadAt, MORTAR_EVERY, MORTAR_RANGE, SHELL_BURST, SHELL_FLIGHT, type Shell, LANTERN_SLEEP, SHADE_LAG, SHADE_LIFE, type Shade, FROZEN_SIGHT, WISP_LIFE, WISP_SPEED, WISP_TURN, type Wisp, eyeAt, spiritAt, GUST_PUSH, ICE_GRIP, type Thaw, bellAt, gustAt, jetAt, ramAt, seamAt, spikeAt, wagonAt } from "./traps.ts";
import { ARTS, artCount, artPower, type CastId, castFrame, FOES } from "./cast.ts";
import type { Frame } from "./figure.ts";
import { SKY_IDS, type SkyId } from "./sky.ts";

const { Engine, Bodies, Body, Composite, Constraint, Query } = Matter;
type B = Matter.Body & { size?: number; len?: number };

/** The match, and the one way to change it: undefined when the rules refuse the event. */
export interface Rules { get(): Match; send(event: Event): Match | undefined }

export interface Sfx {
  jump(): void; flip(): void; land(): void;
  /** A blow landing; the pitch climbs with the combo it belongs to. */
  hit(heavy: boolean, combo?: number): void; hurt(): void; ko(): void;
  boom(big: boolean): void; beam(): void; zap(): void; charge(): void; vanish(): void; power(): void;
  /** Something rare found (relics.ts): a rising chime, and a fuller one when it earns a reward. */
  chime(reward: boolean): void;
}
/** What the arena says to the player, outside the canvas. */
export interface Ui {
  /** Co-op guest: a blow this fighter landed on the host's enemy `uid`, for the host's game to take. */
  foeHit?(uid: number, blow: Hurt): void;
  /** Co-op: something that happened to the whole group, for the others to be told. */
  share?(event: Shared): void;
  /** Co-op: every fighter of the group is down at once: the level is lost. */
  wiped?(): void;
  /** Co-op: the group has cleared the level while this fighter, out of revives, could not stand to: it is cleared for it too. */
  teamClear?(): void;
  banner(text: string, tone?: "red" | "gold"): void; callout(text: string, sub?: string): void; sfx: Sfx;
  /** Shakes a controller or phone, from 0 to 1, for some milliseconds. */
  rumble?(strength: number, ms: number): void;
  /** Muffles the music while the fighter is down, and lets it swell back. */
  duck?(down: boolean): void;
  /** The fighter has found something that teaches it `fact` of the canon. */
  clue?(fact: string, text: string): void;
  /** In the black room, the fighter has used the special it came to try. */
  used?(): void;
  /** A level's boss has just fallen. */
  fallen?(): void;
  /** The fighter has come near another of the five, standing in its level (`Game.visit`). */
  meet?(): void;
  /** The fighter has come face to face with a level's boss: the page may have it speak (`Game.talk`) before the fight. */
  parley?(): void;
  /** How many pieces of a level's key have been found, of how many. */
  keys?(found: number, of: number): void;
  /** In a duel: the fighter's blow has landed on the player `to`, whose own game takes it from here. */
  /**
   * Against the waves, the fighter has been knocked out at `wave` with `kos` knockouts. The fight then waits to be
   * started over (`Game.again`). Without this, it starts over by itself.
   */
  lost?(wave: number, kos: number): void;
  /** A recorded sound (samples.ts): one of a duel's, the slash of a sword as the fighter swings, an energy blast being shot, or one landing on a fighter. */
  sample?(name: "go" | "respawn" | "shield" | "shieldHit" | "over" | "slash" | "blast" | "bolt"): void;
  strike?(to: string, blow: Hurt): void;
  /** In a duel: an effect has played here that the other players should see too. */
  fx?(sprite: Omit<Sprite, "age">): void;
  /** In a duel: the fighter has let a projectile go, for the other players to see. */
  shot?(orb: Shot): void;
  /** In a duel: the fighter has fallen off the islands, which the arena server takes from its health (versus.ts). */
  fell?(): void;
  /** The arena server (arena/run.ts): a blow has landed on the fighter a player's game plays (`puppet`), for that game to take. */
  landed?(blow: Hurt): void;
}
/** A blow: its damage, the push it gives, and how it stuns. */
export interface Hurt { dmg: number; kx: number; ky: number; stun?: number; heavy?: boolean; float?: boolean; from?: number }
/** A projectile as another player's game shows it: seen, and harmless there. */
export interface Shot { x: number; y: number; vx: number; vy: number; r: number; g: number; life: number; color: string; big: boolean; disc: boolean }
/** Another player's fighter as last heard of: where it is, how it stands, and the frame it shows. */
export interface Peer {
  id: string; name: string; fighter: number; x: number; y: number; vx: number; vy: number; facing: number;
  /** The outfit its player chose (relics.ts), if its game says. */
  outfit?: string;
  hp: number; lives: number; alive: boolean; glow: boolean; guard: boolean; at: Frame;
  /** In Overdrive; and the special it is in the middle of, if any: which of its three, how far in, and where it is aimed or centred. */
  over: boolean; special: { slot: number; t: number; ang?: number; c?: Vec } | null;
}

export const STEP = 1000 / 60;
export const GROUND_TOP = 680, FOG_Y = 900, VOID_Y = 1700;
const CAT = { world: 1, player: 2, prop: 4, enemy: 8, rag: 16, boss: 32 };
const SPAWN = { x: 560, y: 600 };
/** What a hidden chamber's cache holds, in turn: the better things for the bag. */
const CACHED: ItemId[] = ["ward", "draught", "scroll", "haste", "vial", "bomb"];

interface Overrides { vx?: number; vy?: number; dvx?: number; dvy?: number; hang?: boolean }
interface Attack { name: string; def: MoveDef; t: number; hit: Set<unknown>; hopped?: boolean; fired?: boolean; done?: boolean; ph?: number }
interface MoveDef {
  dur: number; active: [number, number]; eff?: [Joint, Joint]; dmg: number; knock: [number, number]; power: [number, number]; stop: number;
  heavy?: boolean; air?: boolean; float?: boolean; rising?: boolean; rehit?: number; stun?: number;
  keys?: Key[]; poseAt?(t: number): Pose; effAt?(t: number): [Joint, Joint];
  onStart?(F: Fighter): void; onStep?(F: Fighter, t: number, ov: Overrides, a: Attack): void; onLand?(F: Fighter): void; onHitT?(F: Fighter, T: Fighter): void;
}
interface Pick { name: string; slot?: Slot }
interface Intent { dir: number; run: boolean; jumpHeld: boolean; jumpPressed: boolean; down: boolean; up?: boolean; grab?: boolean; dash?: boolean; charge?: boolean; P: boolean; K: boolean; X: boolean; fly?: boolean; special: number }

export interface SpecialState { def: SpecialDef; kind: SpecialKind; p: Record<string, number | string>; t: number; dur: number; ang?: number; targets?: Fighter[]; c?: Vec }
interface SpecialKind {
  dur: number; ground?: boolean; rise?: number;
  pose(F: Fighter, s: SpecialState): Pose; start?(F: Fighter, s: SpecialState): boolean | void; step(F: Fighter, s: SpecialState): void;
}

export interface Fighter {
  body: Matter.Body; isPlayer: boolean; char: Char | null; color: string; skin: Skin;
  /** For the player these five read the match; for an enemy they are its own. */
  hp: number; maxHp: number; alive: boolean; aura: number; od: number; flying: boolean;
  spd: number; pow: number; airJumpsMax: number;
  facing: number; grounded: boolean; coyote: number; jumpBuf: number; airJumps: number; runPhase: number; lastVy: number;
  pose: Pose; atk: Attack | null; queued: Pick | null; str: string; sinceAtk: number;
  stun: number; floatT: number; flash: number; burn: number; spin: number; spinDir: number; plant: number;
  skel: Skeleton | null; trail: Skeleton[]; cool: number; stuck: number;
  /** An enemy's way to the fighter: how far off it was a step ago, for how many steps it has meant to close and not, and for how many it has been out of reach altogether. */
  near: number; balk: number; lost: number;
  charging: boolean; special: SpecialState | null; caster: boolean;
  /** The character of cast.ts an enemy is drawn as, or null for the Seeker in its skin. */
  cast: CastId | null;
  /** Another player's fighter in a duel: who, by name, with how many lives, and the frame their own game shows. */
  peer: { id: string; name: string; lives: number; guard: boolean; at: Frame } | null;
  /** One of the enemies by a guarded level's way out: it stays shut while any of them stands. */
  final: boolean;
  /** Another of the five, seen in a level where their roads cross: there to be looked at, and not to be struck. */
  shade?: boolean;
  /** How many times its usual size it stands: a level's boss is four. */
  big: number;
  /** A level's boss: the attack it is in the middle of, how many steps in, and which way it was aimed. */
  boss: { move: "slam" | "volley" | "rush" | null; t: number; dir: number; hit: boolean } | null;
  /** An enemy's own special (cast.ts, ARTS) under way: steps in, where it is aimed, which way, whether it has landed;
   *  and the steps until it may use it again. */
  art: { t: number; x: number; y: number; dir: number; hit: boolean } | null; artCool: number;
  /** In co-op (docs/coop-plan.md): an enemy's number, the same in every game of the group; whether this one is only a
   *  stand-in for the host's, placed and drawn as the host's game says; and the frame the host's game draws it in. */
  uid: number; remote: boolean; shown: { anim: string; frame: number } | null;
  /** What an enemy that is not a player is called: the duel's stand-in rival, written over it; or a level's boss, written by its health across the screen. */
  tag: string | null;
  /** The dash under way, and the last one: its direction, and the step it began on. */
  dash: { t: number; x: number; y: number } | null; lastDash: Vec; dashAt: number;
  /** The side of the wall being held, or 0; and the steps left in which a climb jump off `refundWall` can still become a wall jump. */
  climb: number; refundT: number; refundWall: number;
  /** The ledge it hangs from: the lip's corner, which side of the fighter it is on, and how many steps it has hung; and
   *  the steps before it may catch one again, after letting go. */
  hang: { x: number; y: number; side: number; t: number; from: Vec } | null; regrab: number;
  /** Stretch (above 0) or squash (below) of the drawn figure, and how fast it is changing: a spring that overshoots and settles. */
  squash: number; squashV: number;
  /** Still on the way up from a jump whose button has not been let go. */
  rising: boolean;
}

export interface Orb {
  x: number; y: number; vx: number; vy: number; r: number; dmg: number; hero: boolean; big: boolean; radius?: number; g: number; life: number;
  color: string; disc: boolean; home: boolean; pierce: boolean; cd: Map<Fighter, number>; trail: Vec[]; spin: number;
  /** Another player's, shown here and hitting nothing: their game decides what it hits. */
  ghost?: boolean;
}
export interface Ragdoll { parts: B[]; cons: Matter.Constraint[]; head: B; skin: Skin; cast: CastId | null; life: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; heavy?: boolean }
export interface Burst { x: number; y: number; r: number; life: number; max: number; rot: number; color: string }
export interface Floater { x: number; y: number; text: string; life: number; red?: boolean; /** An enemy's special named as it warns of it (foeArt): larger, and outlined to be read on any sky. */ warn?: boolean }
/** One play of a pixel effect: its origin at (x, y), in the colours of `tone`, `scale` times its usual size, `age` steps in. */
export interface Sprite { fx: FxName; x: number; y: number; tone: Tone; scale: number; flip: boolean; age: number }
export interface Ring { x: number; y: number; r: number; max: number; life: number; flat?: boolean; /** Where an enemy's special is about to land (foeArt): drawn red. */ danger?: boolean }
export type Effect = { step(): boolean } & (
  | { kind: "pillar"; x: number; y: number; t: number }
  | { kind: "quake"; x: number; y: number; dir: number }
  | { kind: "cyclone"; x: number; y: number }
  | { kind: "echo"; x: number; y: number; t: number; dir: number; trail: number[]; skin: Skin }
  | { kind: "bolt"; pts: Vec[]; life: number; color: string; width: number }
  // Nothing of its own is drawn: what happens later, or moves, in a greater art (`later`, `each`).
  | { kind: "timed" }
);

/** Everything the renderer draws. */
/** Something a fallen foe left: falling, then lying where it landed until it is picked up or its time is up. */
export interface Drop { x: number; y: number; vy: number; item: ItemId; life: number }
/** One of the things to find in a campaign level besides the key (relics.ts). */
export interface Relic { kind: RelicKind; x: number; y: number; found: boolean }
export interface Scene {
  statics: Matter.Body[]; props: B[]; enemies: Fighter[]; ragdolls: Ragdoll[]; orbs: Orb[]; effects: Effect[];
  particles: Particle[]; bursts: Burst[]; floaters: Floater[]; rings: Ring[]; sprites: Sprite[];
  hero: Fighter | null; match: Match; lastSafe: Vec;
  /** What the fighter carries, three of a kind at most, and which of it is chosen; and what lies about to be picked up. */
  bag: { item: ItemId; count: number }[]; chosen: number; drops: Drop[];
  /** Steps left of a Ward Charm, and of a Haste Tonic. */
  warded: number; hasted: number;
  /** What there is still to find in this level besides the key; whether the fairy of light follows the fighter; and
   *  whether the fighter's outfit glitters (relics.ts). */
  relics: Relic[]; fairy: boolean; sparkle: boolean;
  /** The level of a campaign in play, or null in the arena; and which of its clues have been found. */
  level: Level | null; cluesFound: number[];
  /** When each spring of the level last threw the fighter, in seconds of `time`. */
  sprung: number[];
  /** The way out of a guarded level is still shut. */
  sealed: boolean;
  /** How the level's crumbling ledges and falling blocks stand, and the last bolt of each slot that struck (traps.ts). */
  traps: { crumbles: Crumble[]; crushers: Crusher[]; struck: number[]; frozen: Thaw[]; wisps: Wisp[]; graves: Grave[]; unveiled: boolean[]; told: boolean; opened: boolean[]; shells: Shell[]; booms: { x: number; y: number; t: number }[]; shades: Shade[]; trail: Vec[]; step: number; lanternAt: number[] };
  /** The place is the black room a fighter tries a new power in (`Game.trial`): nothing is drawn of it but its floor, and what stands in it only stands. */
  dark: boolean;
  /** The pieces of the key hidden in a level, and the room they open: its boss's, shut (`locked`) until all are found and again while the boss stands. */
  keys: (Vec & { found: boolean })[]; bossRoom: [x0: number, y0: number, x1: number, y1: number] | null; locked: boolean;
  /** How far the picture is blacked out, from 0 to 1: between the waves of a fight, as its sky changes. */
  fade: number;
  /** What is behind the islands of a fight of waves: a sky drawn afresh for each. A level has its own. */
  sky: SkyId | null;
  /** The sky the next wave will be under, chosen a wave ahead so that its picture is ready before it is needed. */
  nextSky: SkyId | null;
  /** Where the guide stands in a level, and whether he is talking: while he is, nothing in the level moves. */
  guide: Vec | null; talking: boolean;
  /** How far down anything can fall before it is gone: below the islands, or below a level's lowest room. */
  voidY: number;
  /** How much of the fighter's guard is left while it is up, from 1 to just above 0; 0 while it is down. */
  guard: number;
  shake: number; slowMs: number; flashT: number; time: number; worldMin: number; worldMax: number;
  /** How far an impact has punched the zoom in, how many steps of red flash are left, and how long the knockout's slow motion still runs. */
  punch: number; red: number; deathMs: number;
  /** The corner of the view in world space, set by the camera: bolts and rain fall from its top. */
  camX: number; camY: number;
  /** Counts fights begun, so the camera can jump to the spawn. */
  fights: number;
  /** Co-op (docs/coop-plan.md): the teammates' fighters, placed where their games say; this game's part (the host's
   *  game runs the enemies and the level, the others show them); and, while this fighter is down, where it fell, how
   *  long a teammate has stood by it (to 1), and whether it has no revive left. */
  allies: Fighter[]; coop: { host: boolean } | null; down: (Vec & { held: number; out: boolean }) | null;
}

/** Co-op: one of the host's enemies as its game tells the others, about twelve times a second. */
export type FoeWord = [uid: number, cast: string, x: number, y: number, vx: number, vy: number, facing: number, hp: number, maxHp: number, big: number,
  /** 1 boss, 2 by the way out (`final`), 4 caster, 8 flashing */ flags: number, anim: string, frame: number, tag: string];
/** A warning of an enemy's special, as the host's game shows it: a mark on the ground or round it, or its name. */
export type Warn = { ring: Ring } | { name: Floater };
/** Co-op: what the host's game tells the others of the shared world each time it speaks. */
export interface World { foes: FoeWord[]; orbs: Shot[]; fx: Omit<Sprite, "age">[]; warns: Warn[] }
/** Co-op: something that happens to the whole group: an ambush sprung, a piece of the key found, the level cleared. */
export type Shared = { e: "amb"; i: number } | { e: "key"; i: number; by: string } | { e: "clear" };

export type Button = "left" | "right" | "down" | "up" | "grab" | "dash" | "run" | "jump" | "charge" | "punch" | "kick" | "blast" | "fly" | "guard" | "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "item" | "next";
export interface Game {
  scene: Scene;
  press(k: Button): void; release(k: Button): void; clearInput(): void;
  /** Flips the run toggle of the touch pad; returns whether running is now on. */
  toggleRun(): boolean;
  /** Sets the arena for the fight the match has just started, or builds `level` for a quest. */
  /** `kit` is the three specials the fighter goes in with, and `build` what the player has made of it; left out, both stay as they were. */
  begin(level?: Level | null, kit?: SpecialDef[] | null, build?: Build): void;
  /** Against the waves, after a knockout: starts over from the first wave. */
  again(): void;
  /**
   * How the fighter answered the boss it faces. Defied, the boss hits two fifths harder and attacks sooner, and its
   * fall fills the fighter's aura. Reasoned with, it fights with half its health, and its fall teaches the fighter
   * the first thing in the level it has not found.
   */
  answer(how: "defied" | "reasoned"): void;
  /** Gives the boss of the level just begun its name, to be shown with its health. */
  title(boss: string | null): void;
  /** Makes the place just begun the black room, where the fighter tries its special `slot`: its aura never runs out there, and nothing in it fights back or falls. */
  trial(slot: number): void;
  /** The three specials the fighter has gone in with. */
  specials(): SpecialDef[];
  /** Puts one piece of the level's key in the fighter's hand before it has looked for any. */
  gift(): void;
  /** Stands another of the five in the level, as `who` describes it, to be seen and come near. */
  visit(who: Peer): void;
  /** On a quest, out of lives: lets the fighter off once, to go on from where the level starts. */
  bargain(): void;
  /** Holds the level still while the guide talks, or lets it go on. */
  talk(on: boolean): void;
  /** In a duel: the other players as last heard of. Their fighters appear, move and go as the list does. */
  peers(list: Peer[]): void;
  /** In a duel: a blow another player's game says has landed on this fighter. */
  struck(by: string, blow: Hurt): void;
  /** In a duel, or a run the arena server plays: the health the server says this fighter has. */
  heldTo(hp: number): void;
  /** The arena server (arena/run.ts): the fighter is played by a player's game elsewhere and stands where that game last
   *  said, in the special it said; null plays it here again. */
  puppet(word: Peer | null): void;
  /** The fighter has fallen off the islands: 25 health, and back where it last stood, or down. */
  plunge(): void;
  /** The arena server (arena/level.ts): this game hosts a co-op level for a group whose every fighter is a teammate
   *  here, and has no fighter of its own in it; what is each fighter's own (its keys, traps, the way out) is its
   *  player's game's. Called after `begin`. */
  haunt(): void;
  /** In a duel: an effect that played in another player's game. */
  fx(sprite: Omit<Sprite, "age">): void;
  /** In a duel: a projectile another player has let go. */
  shot(orb: Shot): void;
  /** Advances by `realDt` milliseconds of wall time. */
  frame(realDt: number): void;
  /** Co-op (docs/coop-plan.md): this game's part in a group, or null alone. Called again with `host` to take over a
   *  level whose host has gone: its stand-ins become enemies and fight on. */
  coop(part: { host: boolean } | null): void;
  /** Co-op host: the shared world since last asked: its enemies, and what was let go, played or warned of. */
  world(): World;
  /** Co-op guest: the host's world as just told; `at` is when it was said, by this game's clock. */
  heardWorld(world: World, at: number): void;
  /** Co-op host: a blow a teammate's game says it landed on enemy `uid`. */
  hitFoe(uid: number, blow: Hurt): void;
  /** Co-op: something another game of the group says happened to everyone. */
  shared(event: Shared, from: string): void;
}

// Keyframes of the five basic moves.
const KATA_KEYS: Record<string, Key[]> = {
  jab: [[0, STANCE], [0.2, [0.02, -0.05, 0.45, 2.1, 0.25, 2.1, 0.3, -0.15, -0.25, -0.05]], [0.4, JAB_S], [0.62, JAB_S], [1, STANCE]],
  cross: [[0, STANCE], [0.2, [-0.02, -0.05, 0.6, 1.9, 0.0, 2.2, 0.3, -0.15, -0.25, -0.05]], [0.4, CROSS_S], [0.62, CROSS_S], [1, STANCE]],
  hook: [[0, STANCE], [0.22, [-0.1, 0, 0.2, 2.4, 0.3, 2.1, 0.35, -0.5, -0.3, -0.3]], [0.42, [0.3, -0.25, 2.2, 0.5, 0.2, 2.2, 0.4, -0.1, -0.4, -0.05]], [0.6, [0.3, -0.25, 2.3, 0.4, 0.2, 2.2, 0.4, -0.1, -0.4, -0.05]], [1, STANCE]],
  kick: [[0, STANCE], [0.22, [-0.15, 0, 0.7, 1.9, 0.0, 2.0, 1.35, -2.0, -0.12, -0.1]], [0.42, KICK_X], [0.64, KICK_X], [1, STANCE]],
  roundhouse: [[0, STANCE], [0.25, [-0.2, 0, 0.7, 1.9, 0, 2, 1.6, -1.9, -0.1, -0.1]], [0.45, [-0.5, 0.15, 0.9, 1.7, -0.4, 1.5, 2.15, -0.05, -0.15, -0.05]], [0.65, [-0.5, 0.15, 0.9, 1.7, -0.4, 1.5, 2.15, -0.05, -0.15, -0.05]], [1, STANCE]],
};

const overlaps = (a: Matter.Bounds, b: Matter.Bounds) => a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y;
const box = (x0: number, y0: number, x1: number, y1: number): Matter.Bounds => ({ min: { x: x0, y: y0 }, max: { x: x1, y: y1 } });
const rnd = Math.random;
/** Chance that comes out the same in every game given the same `text` (co-op: the level's id). */
function seeded(text: string) {
  let a = 0;
  for (const ch of text) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const num = (v: number | string | undefined) => Number(v);

export function createGame(rules: Rules, ui: Ui): Game {
  const engine = Engine.create({ gravity: { x: 0, y: 1.15 } });
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  const world = engine.world;
  const antiGravity = (b: Matter.Body) => { b.force.y -= b.mass * engine.gravity.y * engine.gravity.scale; };
  const propFilter = { category: CAT.prop, mask: CAT.world | CAT.player | CAT.prop | CAT.enemy | CAT.rag };

  const S: Scene = {
    statics: [], props: [], enemies: [], ragdolls: [], orbs: [], effects: [], particles: [], bursts: [], floaters: [], rings: [], sprites: [],
    bag: [], chosen: 0, drops: [], warded: 0, hasted: 0, nextSky: null, relics: [], fairy: false, sparkle: false,
    hero: null, match: rules.get(), lastSafe: { ...SPAWN }, level: null, cluesFound: [], sprung: [], sealed: false, traps: { crumbles: [], crushers: [], struck: [], frozen: [], wisps: [], graves: [], unveiled: [], told: false, opened: [], shells: [], booms: [], shades: [], trail: [], step: 0, lanternAt: [] }, dark: false, keys: [], bossRoom: null, locked: false, fade: 0, sky: null, guide: null, talking: false, voidY: VOID_Y, guard: 0, shake: 0, slowMs: 0, flashT: 0, time: 0, worldMin: -500, worldMax: 2000, punch: 0, red: 0, deathMs: 0, camX: 0, camY: 0, fights: 0,
    allies: [], coop: null, down: null,
  };
  const { statics, props, enemies, ragdolls, orbs, effects, particles, bursts, floaters, rings, sprites, drops, allies } = S;
  const sfx = ui.sfx;
  let hitstop = 0, stepCount = 0, sinceHit = 999, sinceKo = 999, streak = 0, uids = 0;
  /** Shakes do not add up: the strongest one asked for wins, and it dies away steadily. */
  /** When a controller was last shaken, by `shake`, in steps. */
  let rumbled = -99;
  // A big shake of the picture shakes the controller too, as hard as the picture and for as long, at most twelve
  // times a second: the blasts of a greater art come one after another.
  /** Any sky but `now`. */
  const skyAfter = (now: SkyId | null) => { const others = SKY_IDS.filter((id) => id !== now); return others[Math.floor(rnd() * others.length)]; };
  const shake = (k: number) => {
    S.shake = Math.max(S.shake, k);
    if (k >= 8 && stepCount - rumbled >= 5) { rumbled = stepCount; ui.rumble?.(Math.min(1, k / 20), 60 + k * 8); }
  };
  const punch = (k: number) => { S.punch = Math.max(S.punch, k); };
  /** How long a combo or a run of knockouts stays open, and the longest any hit may freeze the fight. */
  const COMBO_STEPS = 90, FREEZE_MAX = 7;
  let waveWait = 70, spawnTimer = 0, heroDeadTimer = 0, heroInWorld = false;
  const respawnQueue: { at: number; kind: string; size: number }[] = [];
  /** The ambushes of the level already sprung. */
  const ambushed = new Set<number>();
  /** The bodies of the level's crumbling ledges, one to each of `S.traps.crumbles`. */
  let crumbling: B[] = [];
  /** The bodies of the level's wagons, and where the middle of each was on the last step. */
  let wagons: B[] = [], wagonX: number[] = [];
  /** The bodies of the level's blade-lifts, and where the top of each was on the last step. */
  let lifts: B[] = [], liftY: number[] = [];
  /** The bodies of the level's seams, and which of them are open; the same for its paths of the dead (which are solid). */
  let seams: B[] = [], seamOpen: boolean[] = [], spirits: B[] = [], spiritSolid: boolean[] = [];
  /** The ground that moves or breaks: the crumbling ledges that stand now, the wagons, and the seams that are shut. */
  const standing = () => crumbling.filter((_, i) => !S.traps.crumbles[i]?.gone).concat(wagons, lifts, seams.filter((_, i) => !seamOpen[i]), spirits.filter((_, i) => spiritSolid[i]));
  /** The last sending of each of the level's eyes; how long the fighter has been under a tide. */
  let sentBy: number[] = [], under = 0, firedAt: number[] = [];
  /** The end of a gate the fighter has just come out of: it will not take them back until they step clear of it. */
  let gateHeld: Vec | null = null;
  /** The player's fighter stands on ice (found by stepTraps, used by stepFighter on the next step). */
  let icy = false;
  /** The last bolt each slot loosed, for its sound; the last toll each bell rang. */
  const loosed: number[] = [], tolling: number[] = [];
  let hazardCool = 0, rivalWait = 180, guardLeft = 40, guardCool = 0, dark = 0;
  /** How much damage a guard takes before it breaks. */
  const GUARD = 40;

  /** Reports `event` to the match; false when the rules refuse it. */
  function send(event: Event): boolean {
    const next = rules.send(event);
    if (next) S.match = next;
    return next !== undefined;
  }
  const hero = () => S.hero!;
  const ch = (F: Fighter) => F.char!;
  const heroFx = () => (S.hero ? ch(S.hero).fx : "242,178,0");
  // What the player has built its fighter into (story/build.ts): each point of damage is 8% more of it.
  const dmgMul = (F: Fighter) => (F.isPlayer ? (F.od > 0 ? 1.5 : 1) * (1 + 0.08 * skills.damage) : 1);
  // docs/coop-plan.md: the fighters on the player's side, whom enemies go for. Alone that is the player's own; in co-op
  // its teammates' are added here, and every enemy, shot and special finds them through this.
  const sides = (): Fighter[] => (S.hero && !ghost ? [S.hero, ...allies] : allies);
  const heroTargets = () => sides().filter((F) => F.alive && !F.special);
  /** Co-op host: what the others are still to be told with the next word of the world (`world`). */
  const outbox: { orbs: Shot[]; fx: Omit<Sprite, "age">[]; warns: Warn[] } = { orbs: [], fx: [], warns: [] };
  /** An enemy's special warned of (foeArt): shown here, and in co-op told to the others. */
  function warn(w: Warn) {
    if ("ring" in w) rings.push({ ...w.ring }); else floaters.push({ ...w.name });
    if (S.coop?.host && outbox.warns.length < 16) outbox.warns.push(w);
  }
  /** Co-op: a piece of the key found, by this fighter or (`by`, a name) a teammate: kept, shown and told of. */
  function foundKey(i: number, by: string | null) {
    const key = S.keys[i];
    if (!key || key.found) return;
    key.found = true;
    const found = S.keys.filter((each) => each.found).length;
    play("ring", key.x, key.y + 40, toneOf(S.hero), 0.6); sfx.power();
    floaters.push({ x: key.x, y: key.y - 50, text: `KEY ${found} / ${S.keys.length}`, life: 60 });
    ui.keys?.(found, S.keys.length);
    ui.callout(found === S.keys.length ? "The key is whole" : by ? `${by} found a piece of the key` : "A piece of the key", found === S.keys.length ? "The last door will open" : `${S.keys.length - found} still hidden`);
  }
  /** An ambush's foes, and in co-op more of them for each teammate: a third as many again each, never more than
   *  eight waiting at once (spec/app/index.md, "A level brings its enemies where it places them, never more than eight waiting at once"). */
  function crowd(foes: Level["ambushes"][number]["foes"]) {
    const extra = Math.min(Math.round(foes.length * 0.35 * teammates()), Math.max(0, 8 - S.match.waiting - foes.length));
    return [...foes, ...Array.from({ length: extra }, (_, k) => { const f = foes[k % foes.length]; return { ...f, x: f.x + (k % 2 ? 1 : -1) * Math.min(90, 30 * (k + 1)) }; })];
  }
  /** The living fighter on the player's side nearest to `E`, which it goes for; null when none is standing. */
  function targetOf(E: Fighter): Fighter | null {
    let best: Fighter | null = null, bd = Infinity;
    for (const F of sides()) {
      const d = Math.hypot(F.body.position.x - E.body.position.x, F.body.position.y - E.body.position.y);
      if (F.alive && d < bd) { bd = d; best = F; }
    }
    return best;
  }
  const ragParts = () => ragdolls.flatMap((r) => r.parts);
  const toneOf = (F: Fighter | null): Tone => (F?.char ? F.char.element : "enemy");
  /** Plays an effect, and gives it back so that what made it can move it. */
  function play(name: FxName, x: number, y: number, tone: Tone, scale = 1, flip = false): Sprite {
    const sprite: Sprite = { fx: name, x, y, tone, scale, flip, age: 0 };
    sprites.push(sprite);
    // In a duel, or co-op, what plays here is told to the others, who would otherwise see a blow land and nothing come
    // of it: at once by a duel's or a co-op guest's game, with the next word of the world by a co-op host's.
    const told = { fx: name, x: Math.round(x), y: Math.round(y), tone, scale, flip };
    if (S.coop?.host) { if (outbox.fx.length < 24) outbox.fx.push(told); }
    else if (S.match.duel || S.coop) ui.fx?.(told);
    return sprite;
  }
  /** Does `act` in `steps` steps. */
  function later(steps: number, act: () => void) {
    let t = 0;
    effects.push({ kind: "timed", step() { if (++t < steps) return true; act(); return false; } });
  }
  /** Does `act` each step for `steps` steps, or until it says false. */
  function each(steps: number, act: (t: number) => boolean | void) {
    let t = 0;
    effects.push({ kind: "timed", step() { return act(t++) !== false && t < steps; } });
  }
  /** Plays an effect whose blow lands part-way through it, and does `act` as it lands. */
  function land(name: FxName, x: number, y: number, tone: Tone, scale: number, act: () => void, flip = false) {
    const def = FX[name];
    play(name, x, y, tone, scale, flip);
    later(Math.max(1, Math.round((("hit" in def ? def.hit : 0) / def.rate) * 60)), act);
  }
  const loose = () => (props as Matter.Body[]).concat(ragParts());

  // ---------- world ----------
  function addSlab(cx: number, cy: number, w: number, h: number, label: string) {
    const b = Bodies.rectangle(cx, cy, w, h, { isStatic: true, label, friction: 0.8 });
    b.collisionFilter = { category: CAT.world, mask: 0xffff, group: 0 };
    statics.push(b);
  }
  function makeCrate(x: number, y: number, s: number) {
    const b: B = Bodies.rectangle(x, y, s, s, { label: "crate", friction: 0.6, frictionAir: 0.008, restitution: 0.08, density: 0.0016, chamfer: { radius: 2 }, collisionFilter: propFilter });
    b.size = s; props.push(b); Composite.add(world, b);
  }
  function makeBall(x: number, y: number, r: number) {
    const b = Bodies.circle(x, y, r, { label: "ball", friction: 0.3, frictionAir: 0.004, restitution: 0.72, density: 0.0009, collisionFilter: propFilter });
    props.push(b); Composite.add(world, b);
  }
  /** Clears the world and builds `level`, or with none, the arena. */
  function buildWorld(level: Level | null) {
    Composite.remove(world, statics); Composite.remove(world, props); Composite.remove(world, crumbling);
    icy = false; gateHeld = null;
    statics.length = props.length = 0; respawnQueue.length = 0;
    S.level = level;
    S.voidY = level?.bounds ? level.bounds.bottom + 400 : VOID_Y;
    // A crumbling ledge is a ledge of its own, kept out of `statics` so that it is never somewhere safe to come back to.
    const traps = level?.traps;
    crumbling = (traps?.crumbles ?? []).map(([cx, top, w]) => {
      const b = Bodies.rectangle(cx, top + 11, w, 22, { isStatic: true, label: "ledge", friction: 0.8 });
      b.collisionFilter = { category: CAT.world, mask: 0xffff, group: 0 };
      return b;
    });
    Composite.add(world, crumbling);
    // A wagon is a ledge of its own too, moved along its track each step (stepTraps).
    Composite.remove(world, wagons);
    wagons = (traps?.wagons ?? []).map((w) => {
      const b = Bodies.rectangle(w.from, w.y + 11, w.w, 22, { isStatic: true, label: "ledge", friction: 0.8 });
      b.collisionFilter = { category: CAT.world, mask: 0xffff, group: 0 };
      return b;
    });
    wagonX = (traps?.wagons ?? []).map((w) => w.from);
    Composite.add(world, wagons);
    // A blade-lift is a ledge of its own, moved up and down each step (stepTraps).
    Composite.remove(world, lifts);
    lifts = (traps?.lifts ?? []).map((l) => {
      const b = Bodies.rectangle(l.x, l.y + 11, l.w, 22, { isStatic: true, label: "ledge", friction: 0.8 });
      b.collisionFilter = { category: CAT.world, mask: 0xffff, group: 0 };
      return b;
    });
    liftY = (traps?.lifts ?? []).map((l) => l.y);
    Composite.add(world, lifts);
    // A seam is a ledge of its own, taken out of the world while it is open (stepTraps).
    Composite.remove(world, seams);
    seams = (traps?.seams ?? []).map((s) => {
      const b = Bodies.rectangle(s.x, s.y + 11, s.w, 22, { isStatic: true, label: "ledge", friction: 0.8 });
      b.collisionFilter = { category: CAT.world, mask: 0xffff, group: 0 };
      return b;
    });
    seamOpen = seams.map(() => false);
    Composite.add(world, seams);
    // The paths of the dead are ledges too, put into the world and taken out as their set comes and goes (stepTraps).
    Composite.remove(world, spirits);
    spirits = (traps?.spirits ?? []).map((p) => {
      const b = Bodies.rectangle(p.x, p.y + 11, p.w, 22, { isStatic: true, label: "ledge", friction: 0.8 });
      b.collisionFilter = { category: CAT.world, mask: 0xffff, group: 0 };
      return b;
    });
    spiritSolid = spirits.map(() => false);
    S.traps = { crumbles: crumbling.map(() => ({ t: -1, gone: 0 })), crushers: (traps?.crushers ?? []).map(() => ({ mode: 0, t: 0, y: 0, v: 0 })), struck: (traps?.bolts ?? []).map(() => -1), frozen: (traps?.frozen ?? []).map(() => ({ mode: 0, t: 0 })), wisps: [], graves: (traps?.graves ?? []).map(() => ({ mode: 0, t: 0 })), shells: [], booms: [], shades: [], trail: [], step: 0, lanternAt: (traps?.lanterns ?? []).map(() => -LANTERN_SLEEP), unveiled: (traps?.veils ?? []).map(() => false), told: false, opened: (traps?.hollows ?? []).map(() => false) };
    // A cache lies in its hidden chamber until it is taken: the better things for the bag, a different one in each.
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life === Infinity) drops.splice(i, 1);
    (traps?.caches ?? []).forEach((c, i) => drops.push({ x: c.x, y: c.y - 30, vy: 0, item: CACHED[(i + (level?.chapter ?? 0) * 2) % CACHED.length], life: Infinity }));
    sentBy = (traps?.eyes ?? []).map(() => -2);
    firedAt = (traps?.mortars ?? []).map((_, i) => i * 0.9 - MORTAR_EVERY + 1.5);
    if (level) {
      for (const [cx, cy, w, h, kind] of level.slabs) addSlab(cx, cy, w, h, kind);
      for (const [x, y, size] of level.crates) makeCrate(x, y, size);
      [S.worldMin, S.worldMax] = level.span;
      Composite.add(world, statics);
      return;
    }
    // The arena, seeded: the first island, a small one to the left, then twelve running right.
    S.worldMin = -500;
    let seed = 20020;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    addSlab(800, 700, 1100, 40, "ground");
    addSlab(430, 500, 220, 22, "ledge");
    addSlab(1170, 500, 240, 22, "ledge");
    addSlab(800, 300, 170, 20, "ledge");
    addSlab(-60, 740, 420, 40, "ground");
    addSlab(-40, 520, 180, 22, "ledge");
    makeCrate(330, 640, 60); makeCrate(1080, 644, 56); makeCrate(1080, 590, 48); makeCrate(1170, 470, 38); makeBall(700, 640, 18);
    let x = 1350;
    for (let i = 0; i < 12; i++) {
      x += 150 + r() * 150;
      const w = 750 + r() * 650, top = 600 + r() * 220;
      addSlab(x + w / 2, top + 20, w, 40, "ground");
      const ledges = 1 + Math.floor(r() * 3);
      for (let k = 0; k < ledges; k++) {
        const lw = 150 + r() * 140;
        addSlab(x + 90 + r() * (w - 180), top - 170 - k * 170 - r() * 30, lw, 22, "ledge");
      }
      if (r() < 0.4) addSlab(x + w * (0.3 + r() * 0.4), top - 70, 34, 140, "wall");
      if (r() < 0.55) addSlab(x + w / 2 + (r() - 0.5) * 400, top - 600 - r() * 200, 200 + r() * 160, 24, "ledge");
      const crates = 1 + Math.floor(r() * 3);
      for (let k = 0; k < crates; k++) { const s = 38 + Math.floor(r() * 24); makeCrate(x + 60 + r() * (w - 120), top - s / 2 - 2, s); }
      if (r() < 0.4) makeBall(x + 60 + r() * (w - 120), top - 20, 18);
      x += w;
    }
    S.worldMax = x + 300;
    Composite.add(world, statics);
  }
  buildWorld(null);

  /** Top of the static surface under x at or below fromY, or null over a gap. */
  function groundYAt(x: number, fromY: number): number | null {
    let best = Infinity;
    for (const s of statics) {
      if (x >= s.bounds.min.x && x <= s.bounds.max.x && s.bounds.min.y >= fromY - 10 && s.bounds.min.y < best) best = s.bounds.min.y;
    }
    return best === Infinity ? null : best;
  }

  // ---------- moves ----------
  // dmg/knock act on fighters; power is a force per unit mass on props and ragdolls.
  const flurryPose = (rate: number) => (t: number) => (Math.floor(t * rate) % 2 ? JAB_S : CROSS_S);
  const flurryEff = (rate: number) => (t: number): [Joint, Joint] => (Math.floor(t * rate) % 2 ? ["fistF", "elbowF"] : ["fistB", "elbowB"]);
  const spinUp = (vy: number) => (F: Fighter) => { Body.setVelocity(F.body, { x: F.body.velocity.x, y: vy }); F.spin = 0.001; F.spinDir = F.facing; };
  const dash = (from: number, until: number, speed: number) => (F: Fighter, t: number, ov: Overrides) => { if (t > from && t < until) ov.vx = F.facing * speed; };
  const SPIN_POSE: Pose = [-0.3, 0, 0.9, 1.7, -0.3, 1.6, 1.66, -0.02, -0.4, -0.6];
  const DIVE_POSE: Pose = [0.5, -0.2, 0.9, 0.1, 0.85, 0.1, 0.4, -0.6, 0.1, -0.5];
  const ELBOW_POSE: Pose = [0.5, -0.2, 1.7, 2.6, 0.2, 2.2, 0.7, -0.6, -0.7, -0.3];
  const SWEEP_POSE: Pose = [0.6, 0.1, 1.4, 1.4, 0.4, 1.6, 1.62, -0.02, 1.2, -2.6];
  const KNEE_POSE: Pose = [-0.1, -0.1, 1.8, 0.6, -0.6, 1.0, 2.3, -2.6, -0.15, -0.05];
  const SKY_POSE: Pose = [0.1, -0.4, 3.05, 0.05, 0.2, 2.0, 1.4, -2.2, -0.2, -0.4];
  const SPIKE_POSE: Pose = [0.35, 0.2, 1.2, 1.7, -0.9, 0.6, 0.7, -0.02, -0.4, -1.4];
  const AIRKICK_POSE: Pose = [0.12, 0, 0.9, 1.6, -0.8, 0.5, 1.0, -0.02, -0.3, -1.6];
  const PALM_POSE: Pose = [0.25, -0.1, 1.55, 0.02, 0.3, 2.1, 0.45, -0.3, -0.45, -0.1];
  const HAYMAKER_POSE: Pose = [0.45, -0.2, 1.55, 0.05, 0.2, 2.2, 0.6, -0.4, -0.6, -0.1];

  const MOVES: Record<string, MoveDef> = {
    jab: { dur: 14, active: [0.28, 0.62], eff: ["fistF", "elbowF"], dmg: 7, knock: [3, -1], power: [0.026, -0.006], stop: 3, keys: KATA_KEYS.jab },
    cross: { dur: 17, active: [0.28, 0.62], eff: ["fistB", "elbowB"], dmg: 9, knock: [4, -1.5], power: [0.034, -0.008], stop: 4, keys: KATA_KEYS.cross },
    hook: { dur: 22, active: [0.3, 0.6], eff: ["fistF", "elbowF"], dmg: 15, knock: [4.5, -10], power: [0.04, -0.04], stop: 7, heavy: true, keys: KATA_KEYS.hook },
    kick: { dur: 24, active: [0.36, 0.66], eff: ["footF", "kneeF"], dmg: 12, knock: [8, -4], power: [0.05, -0.028], stop: 6, heavy: true, keys: KATA_KEYS.kick },
    roundhouse: { dur: 24, active: [0.36, 0.66], eff: ["footF", "kneeF"], dmg: 11, knock: [6, -6], power: [0.045, -0.035], stop: 5, heavy: true, keys: KATA_KEYS.roundhouse },
    tornado: { dur: 30, active: [0.15, 0.85], rehit: 8, eff: ["footF", "kneeF"], dmg: 9, knock: [6, -8], power: [0.05, -0.04], stop: 4, heavy: true,
      keys: [[0, STANCE], [0.15, SPIN_POSE], [1, SPIN_POSE]], onStart: spinUp(-7.5) },
    knee: { dur: 24, active: [0.3, 0.6], eff: ["kneeF", "hip"], dmg: 12, knock: [1.5, -13], power: [0.02, -0.06], stop: 6, heavy: true,
      keys: [[0, STANCE], [0.25, [0.1, 0, 0.4, 2.2, 0.2, 2.2, 0.2, -0.3, -0.3, -0.1]], [0.45, KNEE_POSE], [0.8, KNEE_POSE], [1, AIR_RISE]],
      onStep: (_F, t, ov, a) => { if (!a.hopped && t > 0.5) { a.hopped = true; ov.vy = -11; } } },
    flurry: { dur: 42, active: [0.08, 0.92], rehit: 3, dmg: 3, knock: [1.2, -0.6], power: [0.012, -0.004], stop: 1, stun: 14, poseAt: flurryPose(14), effAt: flurryEff(14) },
    sweep: { dur: 26, active: [0.35, 0.65], eff: ["footF", "kneeF"], dmg: 10, knock: [2.5, -7], power: [0.03, -0.04], stop: 5, heavy: true, stun: 42,
      keys: [[0, STANCE], [0.25, [0.55, 0.1, 1.2, 1.6, 0.6, 1.8, -0.6, -0.2, 1.2, -2.6]], [0.5, SWEEP_POSE], [0.72, SWEEP_POSE], [1, STANCE]] },
    hammer: { dur: 40, active: [0.3, 0.98], eff: ["fistF", "elbowF"], dmg: 16, knock: [3, 11], power: [0.02, 0.05], stop: 6, heavy: true, air: true,
      keys: [[0, AIR_FALL], [0.25, SLAM_UP], [0.38, DIVE_POSE], [1, DIVE_POSE]],
      onStart: (F) => Body.setVelocity(F.body, { x: F.body.velocity.x * 0.5, y: -3 }),
      onStep: (_F, t, ov) => { if (t > 0.3) ov.vy = 16; else ov.hang = true; },
      onLand: (F) => shockwave(F.body.position.x, F.body.bounds.max.y, 120, 8) },
    elbow: { dur: 24, active: [0.2, 0.65], eff: ["elbowF", "shoulder"], dmg: 12, knock: [10, -3], power: [0.055, -0.02], stop: 6, heavy: true,
      keys: [[0, STANCE], [0.15, ELBOW_POSE], [0.7, ELBOW_POSE], [1, STANCE]], onStep: dash(0.12, 0.6, 15) },
    vanish: { dur: 24, active: [0.3, 0.66], eff: ["footF", "kneeF"], dmg: 14, knock: [9, -7], power: [0.05, -0.03], stop: 7, heavy: true,
      keys: [[0, [-0.15, 0, 0.7, 1.9, 0.0, 2.0, 1.35, -2.0, -0.12, -0.1]], [0.3, KICK_X], [0.66, KICK_X], [1, STANCE]],
      onStart: (F) => teleportBehind(F) },
    skyward: { dur: 32, active: [0.08, 0.6], rehit: 6, eff: ["fistF", "elbowF"], dmg: 8, knock: [2, -12], power: [0.02, -0.06], stop: 4, heavy: true, rising: true,
      keys: [[0, [0.3, 0, 0.4, 2.4, 0.2, 2.2, 0.6, -1.2, -0.4, -0.8]], [0.12, SKY_POSE], [1, SKY_POSE]],
      onStart: (F) => Body.setVelocity(F.body, { x: F.facing * 3, y: -14.5 }) },
    airjab: { dur: 14, active: [0.28, 0.62], eff: ["fistF", "elbowF"], dmg: 7, knock: [2, -2], power: [0.026, -0.01], stop: 3, air: true, float: true,
      keys: [[0, AIR_FALL], [0.4, airify(JAB_S)], [0.62, airify(JAB_S)], [1, AIR_FALL]] },
    aircross: { dur: 16, active: [0.28, 0.62], eff: ["fistB", "elbowB"], dmg: 8, knock: [2.5, -2], power: [0.03, -0.01], stop: 4, air: true, float: true,
      keys: [[0, AIR_FALL], [0.4, airify(CROSS_S)], [0.62, airify(CROSS_S)], [1, AIR_FALL]] },
    spike: { dur: 24, active: [0.38, 0.7], eff: ["footF", "kneeF"], dmg: 15, knock: [5, 13], power: [0.03, 0.05], stop: 7, heavy: true, air: true,
      keys: [[0, AIR_FALL], [0.25, [-0.1, 0, 1.4, 1.8, -0.6, 0.8, 2.0, -2.2, -0.3, -1.2]], [0.45, SPIKE_POSE], [0.75, SPIKE_POSE], [1, AIR_FALL]],
      onStep: (_F, t, ov) => { if (t < 0.4) ov.hang = true; } },
    airkick: { dur: 30, active: [0.18, 0.88], eff: ["footF", "kneeF"], dmg: 13, knock: [9, 2], power: [0.05, 0.012], stop: 5, heavy: true, air: true,
      keys: [[0, AIR_FALL], [0.18, AIRKICK_POSE], [0.88, AIRKICK_POSE], [1, AIR_FALL]],
      onStep: (F, _t, ov) => { ov.dvx = F.facing * 0.3; ov.dvy = 0.18; } },
    blast: { dur: 18, active: [2, 2], eff: ["fistF", "elbowF"], dmg: 0, knock: [0, 0], power: [0, 0], stop: 0,
      keys: [[0, STANCE], [0.3, PALM_POSE], [0.7, PALM_POSE], [1, STANCE]],
      onStep: (F, t, ov, a) => { if (!a.fired && t >= 0.35) { a.fired = true; fireFrom(F, "fistF"); } if (!F.grounded) ov.hang = true; } },
  };
  const V = (base: string, o: Partial<MoveDef>): MoveDef => ({ ...MOVES[base], ...o });
  Object.assign(MOVES, {
    // Ember
    haymaker: V("hook", { dur: 28, active: [0.38, 0.6], dmg: 22, knock: [8, -7], stop: 9,
      keys: [[0, STANCE], [0.3, [-0.25, 0.1, -0.6, 1.8, 0.4, 2.0, 0.3, -0.4, -0.4, -0.2]], [0.45, HAYMAKER_POSE], [0.65, HAYMAKER_POSE], [1, STANCE]] }),
    cinder: V("flurry", { dur: 40, rehit: 5, dmg: 6, knock: [2, -1], poseAt: flurryPose(8), effAt: flurryEff(8) }),
    quakestomp: { dur: 30, active: [0.42, 0.52], eff: ["footF", "kneeF"], dmg: 10, knock: [4, -8], power: [0.03, -0.05], stop: 6, heavy: true,
      keys: [[0, STANCE], [0.3, [0.05, 0, 0.9, 1.6, 0.6, 1.8, 1.7, -2.2, -0.2, -0.1]], [0.45, [0.2, 0.1, 0.6, 1.2, 0.4, 1.4, 0.35, -0.05, -0.3, -0.1]], [1, STANCE]],
      onStep: (F, t, _ov, a) => { if (!a.done && t >= 0.45) { a.done = true; shockwave(F.body.position.x, F.body.bounds.max.y, 170, 12); } } } satisfies MoveDef,
    meteordrop: V("hammer", { dmg: 20, onLand: (F) => shockwave(F.body.position.x, F.body.bounds.max.y, 220, 14) }),
    bullcharge: V("elbow", { dur: 34, dmg: 16, knock: [13, -5], onStep: dash(0.1, 0.7, 13) }),
    lariat: { dur: 34, active: [0.12, 0.88], rehit: 6, eff: ["fistF", "elbowF"], dmg: 8, knock: [6, -5], power: [0.04, -0.03], stop: 4, heavy: true,
      poseAt: () => [0.1, 0, 1.57, 0.02, -1.57, -0.02, 0.35, -0.2, -0.35, -0.1],
      onStep: (F, t, ov, a) => { const ph = Math.floor(t * 6); if (ph !== a.ph) { a.ph = ph; if (ph > 0) F.facing *= -1; } ov.vx = F.facing * 2.5; } } satisfies MoveDef,
    // Tide
    riptidespin: V("tornado", { dur: 40, rehit: 5, dmg: 7 }),
    torrent: V("flurry", { dur: 56, rehit: 2, dmg: 2, poseAt: flurryPose(28), effAt: flurryEff(28) }),
    undertow: V("sweep", { knock: [-3, -5], stun: 50 }),
    slipstream: V("elbow", { dur: 26, dmg: 10, knock: [6, -4], onStep: dash(0.1, 0.65, 20) }),
    ripplestep: V("vanish", { dur: 34, rehit: 10, active: [0.25, 0.85] }),
    // Volt
    shockpalm: V("blast", { dur: 22, active: [0.3, 0.55], eff: ["fistF", "elbowF"], dmg: 12, knock: [9, -4], power: [0.05, -0.02], stop: 6, heavy: true }),
    coilkick: V("tornado", { rehit: 4, dmg: 5, dur: 34 }),
    railelbow: V("elbow", { onStep: dash(0.12, 0.5, 19) }),
    boltspike: V("spike", { onHitT: (_F, T) => strikeBolt(T, 8) }),
    // Moss
    leafcyclone: V("tornado", { dur: 44, rehit: 7, onStart: spinUp(-10), onStep: (_F, t, ov) => { if (t > 0.3) ov.hang = true; } }),
    petalstorm: V("flurry", { float: true, knock: [0.6, -1.2] }),
    vinetrip: V("sweep", { active: [0.3, 0.75], stun: 70, dmg: 8, knock: [1, -3] }),
    galejuggle: V("spike", { knock: [4, -7], float: true, dmg: 14 }),
  });

  // ---------- fighters ----------
  function makeFighter(x: number, y: number, isPlayer: boolean, hp: number, c: Char | null): Fighter {
    const body = Bodies.rectangle(x, y, 28, 84, {
      label: isPlayer ? "player" : "enemy", inertia: Infinity, friction: 0, frictionStatic: 0, frictionAir: 0, restitution: 0, density: 0.002,
      chamfer: { radius: 12 }, collisionFilter: { category: isPlayer ? CAT.player : CAT.enemy, mask: CAT.world | CAT.prop },
    });
    Composite.add(world, body);
    return {
      body, isPlayer, char: c, alive: true, hp, maxHp: hp, color: c ? c.color : "#7a7a76", skin: c ? c.skin : ENEMY_SKIN,
      spd: c ? c.spd : 1, pow: c ? c.pow : 1, airJumpsMax: c ? c.airJumps : 1,
      facing: 1, grounded: false, coyote: 0, jumpBuf: 0, airJumps: 1, runPhase: 0, lastVy: 0,
      pose: STANCE.slice(), atk: null, queued: null, str: "", sinceAtk: 999,
      stun: 0, floatT: 0, flash: 0, burn: 0, spin: 0, spinDir: 1, plant: 0, skel: null, trail: [], cool: 40, stuck: 0, near: 0, balk: 0, lost: 0,
      aura: 0, od: 0, flying: false, charging: false, special: null, caster: false, cast: null, peer: null, tag: null, final: false, big: 1, boss: null, art: null, artCool: 0, uid: 0, remote: false, shown: null,
      dash: null, lastDash: { x: 0, y: 0 }, dashAt: -999, climb: 0, refundT: 0, refundWall: 0, hang: null, regrab: 0, squash: 0, squashV: 0, rising: false,
    };
  }
  /** The player's fighter: its health, aura, Overdrive and flight are the match's, read and never written here. */
  function makeHero(c: Char, at: Vec): Fighter {
    const F = makeFighter(at.x, at.y, true, 0, c);
    const read = (get: () => number | boolean) => ({ get, enumerable: true });
    return Object.defineProperties(F, {
      hp: read(() => S.match.hp), maxHp: read(() => full(S.match)), alive: read(() => S.match.alive),
      aura: read(() => S.match.aura / 1000), od: read(() => S.match.overdrive), flying: read(() => S.match.flying),
    });
  }

  // ---------- input ----------
  const input = { left: false, right: false, down: false, up: false, grab: false, run: false, jump: false, charge: false, guard: false, dashPressed: false, jumpPressed: false, punchPressed: false, kickPressed: false, blastPressed: false, flyPressed: false, itemPressed: false, special: -1 };
  // Motion buffer: absolute L/R/D taps, read relative to the last tap's direction when an attack button lands.
  const tokens: { tok: string; t: number }[] = [];
  function token(t: string) { tokens.push({ tok: t, t: stepCount }); if (tokens.length > 8) tokens.shift(); }
  function press(k: Button) {
    switch (k) {
      // Up is also the jump, except on a wall, where it climbs.
      case "up": input.up = true; if (S.hero?.climb) break;
      // falls through
      case "jump": if (!input.jump) input.jumpPressed = true; input.jump = true; break;
      case "dash": input.dashPressed = true; break;
      case "punch": input.punchPressed = true; break;
      case "kick": input.kickPressed = true; break;
      case "blast": input.blastPressed = true; break;
      case "fly": input.flyPressed = true; break;
      case "s1": case "s2": case "s3": case "s4": case "s5": case "s6": input.special = +k[1] - 1; break;
      case "item": input.itemPressed = true; break;
      case "next": if (S.bag.length) S.chosen = (S.chosen + 1) % S.bag.length; break;
      case "left": if (!input.left) token("L"); input.left = true; break;
      case "right": if (!input.right) token("R"); input.right = true; break;
      case "down": if (!input.down) token("D"); input.down = true; break;
      default: input[k] = true;
    }
  }
  function release(k: Button) {
    if (k === "up") input.up = input.jump = false;
    else if (k === "left" || k === "right" || k === "down" || k === "grab" || k === "run" || k === "jump" || k === "charge" || k === "guard") input[k] = false;
  }
  function clearInput() {
    input.left = input.right = input.down = input.up = input.grab = input.run = input.jump = input.charge = input.guard = false;
    input.dashPressed = input.jumpPressed = input.punchPressed = input.kickPressed = input.blastPressed = input.flyPressed = input.itemPressed = false;
    input.special = -1; tokens.length = 0;
  }

  function checkGrounded(F: Fighter) {
    const b = F.body;
    if (b.velocity.y < -0.5) return false;
    const bb = b.bounds;
    return Query.region(statics.concat(props, standing()), box(bb.min.x + 4, bb.max.y - 1, bb.max.x - 4, bb.max.y + 3)).length > 0;
  }

  // spec/app/index.md, "There are seventeen things to find, and each is found once"
  function discover(move: number) { if (!S.match.found.includes(move)) send({ type: "discover", move }); }

  function startMove(F: Fighter, name: string, slot?: Slot) {
    const def = MOVES[name];
    F.atk = { name, def, t: 0, hit: new Set() };
    F.sinceAtk = 0;
    F.charging = false;
    def.onStart?.(F);
    if (F.isPlayer) {
      // Every blow but the blast is a swing of the sword, and sounds like one.
      if (name !== "blast") ui.sample?.("slash");
      if (slot) { ui.callout(ch(F).slots[slot][1]); discover(SLOTS.indexOf(slot)); }
    }
  }

  function motion(seq: string[]) {
    if (tokens.length < seq.length) return false;
    const tail = tokens.slice(-seq.length);
    if (stepCount - tail[tail.length - 1].t > 14) return false;
    const lastLR = [...tail].reverse().find((x) => x.tok !== "D");
    const f = lastLR ? (lastLR.tok === "R" ? 1 : -1) : hero().facing;
    for (let i = 0; i < seq.length; i++) {
      const tk = tail[i].tok;
      const rel = tk === "D" ? "D" : ((tk === "R") === (f === 1) ? "F" : "B");
      if (rel !== seq[i]) return false;
      if (i > 0 && tail[i].t - tail[i - 1].t > 14) return false;
    }
    tokens.length = 0;
    hero().facing = f;
    return true;
  }

  function pickMove(F: Fighter, btn: "P" | "K", I: Intent): Pick | null {
    const air = !F.grounded;
    const take = (slot: Slot): Pick => { F.str = ""; return { name: ch(F).slots[slot][0], slot }; };
    if (btn === "P") {
      if (air && I.down) return take("hammer");
      if (!air && motion(["F", "D", "F"])) return take("sky");
      if (!air && motion(["F", "F"])) return take("elbow");
    }
    if (btn === "K") {
      if (!air && I.down) return take("sweep");
      if (motion(["B", "F"])) return take("vanish");
    }
    const table = air ? AIR_CHAIN : GROUND_CHAIN;
    const chaining = F.atk || F.sinceAtk <= 30;
    let s = (chaining ? F.str : "") + btn;
    if (!table[s]) s = btn;
    if (!table[s]) return null;
    const v = table[s];
    if (v[0] === "@") return take(v.slice(1) as Slot);
    F.str = s;
    return { name: v };
  }

  // spec/app/index.md, "Every power is free during Overdrive, and otherwise needs its cost in aura"
  function pay(event: Event, cost: number) {
    if (send(event)) return true;
    ui.callout(`Need ${cost / 1000} aura`, "Hold U to charge");
    return false;
  }

  function heroIntent(): Intent {
    const I = {
      dir: (input.right ? 1 : 0) - (input.left ? 1 : 0), run: input.run, jumpHeld: input.jump, down: input.down, up: input.up, grab: input.grab, dash: input.dashPressed, charge: input.charge,
      jumpPressed: input.jumpPressed, P: input.punchPressed, K: input.kickPressed, X: input.blastPressed, fly: input.flyPressed, special: input.special,
    };
    input.dashPressed = input.jumpPressed = input.punchPressed = input.kickPressed = input.blastPressed = input.flyPressed = false;
    input.special = -1;
    return I;
  }

  /** Strikes every fighter on the player's side for whom `near` holds, away from `E`; whether any was struck. */
  function strikeSides(E: Fighter, near: (F: Fighter) => boolean, dmg: number, kx: number, ky: number) {
    let any = false;
    for (const F of sides()) {
      if (!F.alive || !near(F)) continue;
      const from = Math.sign(F.body.position.x - E.body.position.x) || E.facing;
      hurt(F, { dmg, kx: from * kx, ky, heavy: true, from });
      any = true;
    }
    return any;
  }
  // Each kind of enemy has a special of its own in the campaign's levels (cast.ts, ARTS), stronger chapter by chapter:
  // warned of (a flash, a mark where it will land, its name over it), and cancelled by a blow while it is warning.
  // It is begun when its rest is over and the fighter is near enough to see it, and only so many at once. True while
  // one is under way: the enemy does nothing else meanwhile.
  function foeArt(E: Fighter, H: Fighter, I: Intent): boolean {
    const own = E.cast ? ARTS[E.cast] : null;
    if (!own || !S.level) return false;
    const k = Math.min(4, S.level.chapter), pw = artPower(k), n = artCount(own.kind, k), at = E.body.position, feet = E.body.bounds.max.y;
    // Damage: the kind's base, the chapter's multiple, and its own strength (a boss's is held down: its size is enough).
    const dmg = (base: number) => base * pw.dmg * Math.min(E.pow, 1.3);
    if (E.art && E.stun > 0 && E.art.t < pw.tell) {
      E.art = null; E.artCool = pw.rest / 2; E.flash = 0;
      floaters.push({ x: at.x, y: at.y - 60 * E.big, text: "INTERRUPTED", life: 34 });
      return false;
    }
    if (!E.art) {
      if (--E.artCool > 0) return false;
      const dx = H.body.position.x - at.x, dy = H.body.position.y - at.y;
      if (Math.abs(dx) > 620 || Math.abs(dy) > 320 || E.atk || E.stun > 0 || enemies.filter((o) => o.art).length >= pw.together) { E.artCool = 30; return false; }
      const A = (E.art = { t: 0, x: H.body.position.x, y: H.body.bounds.max.y, dir: Math.sign(dx) || E.facing, hit: false });
      E.artCool = pw.rest + rnd() * 200; E.flash = pw.tell; E.facing = A.dir;
      warn({ name: { x: at.x, y: at.y - 60 * E.big - 20, text: own.name.toUpperCase(), life: Math.max(44, pw.tell), warn: true } });
      sfx.charge();
      // Where it will land, marked for as long as it is warned of.
      const mark = (x: number, y: number, r: number) => warn({ ring: { x, y, r: 10, max: r, life: pw.tell, flat: true, danger: true } });
      if (own.kind === "quake") mark(at.x, feet, (160 + 25 * k) * (E.big > 1 ? 1.6 : 1));
      else if (own.kind === "arrowRain") mark(A.x, A.y, 130);
      else if (own.kind === "eruption") for (let i = 0; i < n; i++) mark(A.x + (i - (n - 1) / 2) * 150, A.y, 70);
      else if (own.kind === "hexfire") for (let i = 0; i < n; i++) mark(A.x + (i - (n - 1) / 2) * 90, A.y, 50);
      else warn({ ring: { x: at.x, y: at.y, r: 10, max: 70, life: pw.tell, danger: true } });
    }
    const A = E.art!, tell = pw.tell, t = ++A.t;
    I.dir = 0;
    let done = t > tell + 14;
    switch (own.kind) {
      // A cut drawn in one step across the room, and from chapter 4 a second one back.
      case "iaido": {
        const second = n > 1 && t >= tell + 24;
        if (t === tell || (n > 1 && t === tell + 24)) { A.dir = Math.sign(H.body.position.x - at.x) || A.dir; A.hit = false; E.facing = A.dir; sfx.vanish(); }
        const cutting = (t >= tell && t < tell + 14) || (second && t < tell + 38);
        if (cutting) {
          Body.setVelocity(E.body, { x: A.dir * (16 + 2 * k), y: E.body.velocity.y });
          if (!A.hit && strikeSides(E, (F) => overlaps(hurtBox(F), E.body.bounds), dmg(10), 11, -7)) { A.hit = true; shake(6); sfx.hit(true); }
        }
        done = t > tell + (n > 1 ? 40 : 18);
        break;
      }
      // The ground broken around it; from chapter 4 a wider second wave.
      case "quake": {
        const r = (160 + 25 * k) * (E.big > 1 ? 1.6 : 1);
        const wave = (reach: number, scale: number) => {
          shake(8); sfx.boom(false); play("quake", at.x, feet, "enemy", scale);
          strikeSides(E, (F) => Math.abs(F.body.position.x - at.x) < reach && Math.abs(F.body.bounds.max.y - feet) < 120, dmg(11), 10, -12);
        };
        if (t === tell) wave(r, 1 + 0.15 * k);
        if (n > 1 && t === tell + 16) { warn({ ring: { x: at.x, y: feet, r: r, max: r * 1.6, life: 14, flat: true, danger: true } }); wave(r * 1.6, 1.4 + 0.15 * k); }
        done = t > tell + (n > 1 ? 30 : 14);
        break;
      }
      // Spinning blades thrown at the fighter, more of them in later chapters.
      case "crescent":
        if (t === tell) {
          const ang = Math.atan2(H.body.position.y - (at.y - 20), H.body.position.x - at.x);
          for (let i = 0; i < n; i++) spawnOrb(E, at.x + A.dir * 30, at.y - 20, ang + (i - (n - 1) / 2) * 0.25, { speed: 10 + k, dmg: dmg(7), r: 13, disc: true, life: 110 });
          sfx.zap();
        }
        break;
      // Fire lobbed to land where it was marked.
      case "hexfire":
        if (t === tell) {
          for (let i = 0; i < n; i++) {
            const T = 48 + i * 8, g = 0.35, sx = at.x, sy = at.y - 30, tx = A.x + (i - (n - 1) / 2) * 90;
            spawnOrb(E, sx, sy, 0, { vx: (tx - sx) / T, vy: (A.y - 20 - sy - 0.5 * g * T * T) / T, g, dmg: dmg(8), r: 12, life: T + 40 });
          }
          sfx.zap();
        }
        break;
      // Gone in a puff, and out of the dark behind the fighter.
      case "shadowStep":
        if (t === 1) play("puff", at.x, at.y, "enemy", 0.9);
        if (t === tell) {
          const to = { x: H.body.position.x - (H.facing || 1) * 70, y: H.body.position.y - 10 };
          Body.setPosition(E.body, to); Body.setVelocity(E.body, { x: 0, y: 0 });
          play("puff", to.x, to.y, "enemy", 0.9); sfx.vanish();
          E.facing = Math.sign(H.body.position.x - to.x) || 1;
        }
        if (t === tell + 8 && strikeSides(E, (F) => Math.hypot(F.body.position.x - at.x, F.body.position.y - at.y) < 95, dmg(9), 9, -8)) { shake(5); sfx.hit(true); }
        break;
      // Arrows falling on the marked ground, one every four steps.
      case "arrowRain":
        if (t >= tell && (t - tell) % 4 === 0 && (t - tell) / 4 < n) {
          spawnOrb(E, A.x + (rnd() - 0.5) * 220, A.y - 520, Math.PI / 2, { speed: 15, dmg: dmg(6), r: 8, life: 70 });
          if ((t - tell) % 8 === 0) sfx.zap();
        }
        done = t > tell + n * 4 + 2;
        break;
      // Pillars of dark out of the marked ground, one more for each chapter.
      case "eruption":
        if (t === tell) {
          shake(10); sfx.boom(true);
          for (let i = 0; i < n; i++) {
            const x = A.x + (i - (n - 1) / 2) * 150;
            play("holyPillar", x, A.y, "enemy", 1.1);
            strikeSides(E, (F) => Math.abs(F.body.position.x - x) < 60 && Math.abs(F.body.bounds.max.y - A.y) < 140, dmg(12), 4, -16);
          }
        }
        done = t > tell + 20;
        break;
    }
    if (done) E.art = null;
    return true;
  }

  // A level's boss is too big for a brawler's blows to reach from, so it has three attacks of its own, each with a
  // warning: a slam that shakes the ground around it, a volley of three shots, and a rush across the room.
  function bossIntent(E: Fighter, H: Fighter, I: Intent): Intent {
    const B = E.boss!, at = E.body.position, feet = E.body.bounds.max.y;
    const dx = H.body.position.x - at.x, dist = Math.abs(dx), toward = Math.sign(dx) || 1;
    // It waits in its room for a fighter that has been sent back to the start.
    if (!fought) { B.move = null; return I; }
    // Between its three attacks it also has the special of its kind (cast.ts, ARTS).
    if (!B.move && foeArt(E, H, I)) return I;
    const strike = (dmg: number, kx: number, ky: number) => hurt(H, { dmg: dmg * E.pow, kx: toward * kx, ky, heavy: true, from: toward });
    if (!B.move) {
      E.facing = toward;
      if (dist > 300) I.dir = toward;
      if (--E.cool <= 0) {
        const near = dist < 320, roll = rnd();
        Object.assign(B, { move: near ? (roll < 0.55 ? "slam" : "rush") : roll < 0.6 ? "volley" : "rush", t: 0, dir: toward, hit: false });
        E.cool = (100 + rnd() * 60) * (answered === "defied" ? 0.7 : 1);
      }
      return I;
    }
    B.t++;
    if (B.move === "slam") {
      if (B.t === 1) { rings.push({ x: at.x, y: feet, r: 20, max: 340, life: 45, flat: true }); E.flash = 44; }
      if (B.t === 45) {
        shake(12); S.flashT = Math.max(S.flashT, 6); sfx.boom(true); play("ring", at.x, feet, "enemy", 2.2);
        if (dist < 340 && H.body.bounds.max.y > feet - 150) strike(13, 12, -13);
      }
    } else if (B.move === "volley") {
      E.facing = toward;
      if (B.t === 20 || B.t === 34 || B.t === 48) {
        const from = { x: at.x + toward * 70, y: at.y - 40 };
        spawnOrb(E, from.x, from.y, Math.atan2(H.body.position.y - from.y, H.body.position.x - from.x) + (B.t - 34) / 14 * 0.22, { r: 15, speed: 9, dmg: 8, life: 150 });
        sfx.zap();
      }
    } else {
      E.facing = B.dir;
      if (B.t === 1) E.flash = 26;
      if (B.t > 26 && B.t < 62) {
        Body.setVelocity(E.body, { x: B.dir * 11, y: E.body.velocity.y });
        if (!B.hit && overlaps(hurtBox(H), E.body.bounds)) { B.hit = true; shake(8); strike(12, 13, -8); }
      }
    }
    if (B.t > 76) B.move = null;
    return I;
  }

  function enemyIntent(E: Fighter): Intent {
    const I: Intent = { dir: 0, run: false, jumpHeld: true, jumpPressed: false, down: false, P: false, K: false, X: false, special: -1 };
    const H = targetOf(E);
    if (!H || S.dark) return I;
    if (E.boss) return bossIntent(E, H, I);
    if (foeArt(E, H, I)) return I;
    const wave = S.match.wave;
    const dx = H.body.position.x - E.body.position.x, dy = H.body.position.y - E.body.position.y;
    const dist = Math.abs(dx);
    E.cool--;
    if (E.caster) {
      // It keeps its distance, unless the fighter is too far above or below to shoot at: then it makes its way over,
      // as one that fights hand to hand does.
      if (Math.abs(dy) >= 90) I.dir = dy > 60 && dist < 60 ? E.facing || 1 : Math.sign(dx);
      else if (dist < 200) I.dir = -Math.sign(dx);
      else if (dist > 380) I.dir = Math.sign(dx);
      if (E.cool <= 0 && !E.atk && Math.abs(dy) < 90 && dist < 600) {
        E.facing = Math.sign(dx) || E.facing; I.dir = 0; I.X = true;
        E.cool = Math.max(60, 150 + rnd() * 60 - wave * 6);
      }
    } else if (dist > 52 || Math.abs(dy) > 60) {
      // Right over the fighter there is no way toward it but off the ledge: it keeps on the way it faces.
      I.dir = dy > 60 && dist < 60 ? E.facing || 1 : Math.sign(dx);
      I.run = dist > 260;
      if (dy < -90 && E.grounded && dist < 220 && rnd() < 0.04) I.jumpPressed = true;
    } else {
      E.facing = Math.sign(dx) || E.facing;
      if (E.cool <= 0 && !E.atk) {
        if (rnd() < 0.6) I.P = true; else I.K = true;
        E.cool = Math.max(26, 70 + rnd() * 50 - wave * 5);
      }
    }
    if (I.dir && E.grounded) {
      const ahead = Query.point(statics.concat(props), { x: E.body.position.x + I.dir * 30, y: E.body.bounds.max.y + 8 }).length > 0;
      // At an edge: a jump toward a fighter that is far, a step off it to one that is below, and otherwise a halt.
      if (!ahead) { if (dist > 140) { I.jumpPressed = true; I.run = true; } else if (dy <= 60) I.dir = 0; }
      if (Math.abs(E.body.velocity.x) < 0.4) { if (++E.stuck > 12) { I.jumpPressed = true; E.stuck = 0; } } else E.stuck = 0;
      // Meaning to close, barely moving and getting no nearer: something it is pushing is between them (a crate, with
      // the fighter behind it). It jumps over.
      if (dist < 220 && dist >= E.near - 0.5 && Math.abs(E.body.velocity.x) < 1.5) { if (++E.balk > 40) { I.jumpPressed = true; I.run = true; E.balk = 0; } } else E.balk = 0;
    }
    E.near = dist;
    // On the islands an enemy that cannot find its way to the fighter in six seconds comes down beside it again, as
    // it first arrived: none is left stranded where the fighter cannot be reached.
    if (!S.level && (dist > 420 || Math.abs(dy) > 300)) {
      if (++E.lost > 360) { E.lost = 0; const at = dropSpot(); Body.setPosition(E.body, at); Body.setVelocity(E.body, { x: 0, y: 0 }); play("puff", at.x, at.y, "enemy"); }
    } else E.lost = 0;
    return I;
  }

  // The player jumps hard against a heavy pull: up and down fast. Enemies keep the lighter arc their gap jumps are tuned to.
  const JUMP = -17.4, FLIP = -15, KICK_OFF = -15.5, DASH = 15, DASH_STEPS = 9, DASH_CANCEL = 14;
  /** What an enemy's blow must touch: the player's own is a little smaller than the body, so a graze is a miss. */
  const hurtBox = (T: Fighter): Matter.Bounds => (T.isPlayer ? box(T.body.bounds.min.x + 5, T.body.bounds.min.y + 5, T.body.bounds.max.x - 5, T.body.bounds.max.y - 5) : T.body.bounds);
  function wallBeside(F: Fighter, dir: number) {
    const bb = F.body.bounds, x = dir > 0 ? bb.max.x : bb.min.x - 5;
    return Query.region(statics, box(x, bb.min.y + 12, x + 5, bb.max.y - 12)).length > 0;
  }
  const wallOf = (F: Fighter) => (wallBeside(F, F.facing) ? F.facing : wallBeside(F, -F.facing) ? -F.facing : 0);
  function launch(F: Fighter, vx: number, vy: number) {
    Body.setVelocity(F.body, { x: vx, y: vy });
    F.lastVy = vy; F.coyote = 0; F.jumpBuf = 0; F.grounded = false; F.squash = 0.3; F.rising = true;
    sfx.jump();
  }
  /** A dash stopped by the corner of a platform slips past it instead. */
  function slipPast(F: Fighter, dx: number) {
    const bb = F.body.bounds, p = F.body.position;
    for (const off of [-4, 4, -8, 8, -12, 12]) {
      const ox = dx ? dx * 6 : off, oy = dx ? off : -6;
      if (Query.region(statics, box(bb.min.x + ox + 1, bb.min.y + oy + 1, bb.max.x + ox - 1, bb.max.y + oy - 1)).length) continue;
      Body.setPosition(F.body, dx ? { x: p.x, y: p.y + off } : { x: p.x + off, y: p.y });
      return;
    }
  }

  /** The dash and the climb. True when it has set this step's velocity. */
  // A ledge caught by the hands (figure.ts, "hang"): a fighter falling past the lip of a ledge at a walk catches it
  // and hangs there, as long as it likes. Running hard off an edge, or holding down, it drops. Hanging, a jump hops it
  // up onto the ledge (or, pushing away, leaps off), up pulls it up, and down or pushing away lets go.
  /** Half a fighter's width, and how far below its middle its top is. */
  const HALF_W = 14, HALF_H = 42;
  function catchLedge(F: Fighter, I: Intent): boolean {
    const b = F.body;
    if (F.grounded || F.regrab > 0 || F.flying || F.atk || F.dash || F.climb || I.down || b.velocity.y < -1 || S.dark) return false;
    const top = b.bounds.min.y;
    for (const s of statics) {
      const sb = s.bounds;
      // `side`: where the ledge is from the fighter, +1 on its right (the ledge's left corner).
      for (const side of [1, -1]) {
        const cx = side > 0 ? sb.min.x : sb.max.x, cy = sb.min.y;
        // A fighter that has walked off the ledge has carried on past it by the time its hands are at the lip: it is
        // caught from further out than one jumping up to a ledge ahead.
        const off = (cx - b.position.x) * side, away = Math.sign(b.velocity.x) === -side;
        if (off < 0 || off > HALF_W + (away ? 110 : 32) || top - cy < -14 || top - cy > 30) continue;
        // Running away from it, it is let go by; there must be room on the lip, and room to hang in.
        if (I.dir === -side && Math.abs(b.velocity.x) > 6) continue;
        if (Query.point(statics, { x: cx + side * 12, y: cy - 12 }).length || Query.point(statics, { x: cx - side * (HALF_W + 2), y: cy + HALF_H }).length) continue;
        F.hang = { x: cx, y: cy, side, t: 0, from: { x: b.position.x, y: b.position.y } };
        F.facing = side; F.spin = 0; F.airJumps = F.airJumpsMax; F.squash = -0.25;
        dust(cx, cy, 3, -side); sfx.land();
        return true;
      }
    }
    return false;
  }
  function stepHang(F: Fighter, I: Intent): boolean {
    const b = F.body, h = F.hang!;
    h.t++;
    antiGravity(b);
    // Drawn in to the corner over the catch, eased, from wherever it was caught.
    const k = Math.min(1, h.t / 6), ease = 1 - (1 - k) * (1 - k), to = { x: h.x - h.side * (HALF_W + 1), y: h.y + HALF_H };
    Body.setPosition(b, { x: h.from.x + (to.x - h.from.x) * ease, y: h.from.y + (to.y - h.from.y) * ease }); Body.setVelocity(b, { x: 0, y: 0 });
    F.lastVy = 0; F.facing = h.side;
    // The catch: a moment before the grip can be let go or climbed from.
    if (h.t < 6) return true;
    if (I.jumpPressed && I.dir === -h.side) { F.hang = null; F.regrab = 16; F.facing = -h.side; launch(F, -h.side * 7.5, KICK_OFF); return true; }
    if (I.jumpPressed || I.up) {
      F.hang = null; F.regrab = 16;
      // Up and over, onto the ledge.
      Body.setPosition(b, { x: h.x + h.side * (HALF_W + 8), y: h.y - HALF_H - 2 });
      launch(F, h.side * 2.5, I.jumpPressed ? -9 : -5.5);
      dust(h.x + h.side * 20, h.y, 4, h.side);
      return true;
    }
    if (I.down || I.dir === -h.side) { F.hang = null; F.regrab = 20; return true; }
    return true;
  }

  function stepMoves(F: Fighter, I: Intent): boolean {
    const b = F.body, m = S.match;
    if (F.hang) return stepHang(F, I);
    if (F.regrab > 0) F.regrab--;
    // spec/app/index.md, "A fighter has one dash, and gets it back by touching the ground"
    if (F.grounded && !F.dash && (m.dashes === 0 || m.stamina < fullStamina || m.owed)) send({ type: "regain" });

    if (I.dash && send({ type: "dash" })) {
      let x = I.dir, y = (I.down ? 1 : 0) - (I.up ? 1 : 0);
      if (!x && !y) x = F.facing;
      const len = Math.hypot(x, y);
      F.lastDash = { x: x / len, y: y / len };
      F.dash = { t: 0, ...F.lastDash };
      F.dashAt = stepCount; F.atk = null; F.queued = null; F.charging = false; F.climb = 0; F.spin = 0; F.refundT = 0;
      if (x) F.facing = Math.sign(x);
      // A four-step pause and the smallest shake make the jolt land.
      hitstop = Math.max(hitstop, 4); shake(2.5);
      sfx.flip(); ui.rumble?.(0.5, 70);
    }

    // A jump out of a dash keeps the dash's speed.
    if (I.jumpPressed && stepCount - F.dashAt <= DASH_CANCEL) {
      const d = F.lastDash, wall = wallOf(F);
      if (!d.x && d.y < 0 && wall) {
        // Up a wall: a wall bounce, higher than any jump.
        F.dash = null; F.dashAt = -999; F.facing = -wall;
        launch(F, -wall * 5, -19.5);
        return true;
      }
      if (d.x && d.y >= 0 && (F.grounded || F.coyote > 0)) {
        // Along the ground: a long jump, or lower and faster out of a crouch.
        const low = d.y > 0 || I.down, side = Math.sign(d.x);
        F.dash = null; F.dashAt = -999;
        launch(F, side * DASH * (low ? 1.3 : 1.1), low ? JUMP * 0.55 : JUMP);
        dust(b.position.x, b.bounds.max.y, 6, -side);
        return true;
      }
    }

    if (F.dash) {
      const d = F.dash;
      // Each point of dash is one more step of it.
      if (++d.t <= DASH_STEPS + (F.isPlayer ? skills.dash : 0)) {
        if (d.t > 1 && d.x && Math.abs(b.velocity.x) < 1) slipPast(F, Math.sign(d.x));
        else if (d.t > 1 && !d.x && d.y < 0 && Math.abs(b.velocity.y) < 1) slipPast(F, 0);
        antiGravity(b);
        Body.setVelocity(b, { x: d.x * DASH, y: d.y * DASH });
        F.lastVy = d.y * DASH;
        const c = b.position;
        particles.push({ x: c.x, y: c.y - 8, vx: 0, vy: 0, life: 14, max: 14, size: 9, color: "255,255,255" }, { x: c.x - d.x * 8, y: c.y - d.y * 8 - 8, vx: 0, vy: 0, life: 18, max: 18, size: 5, color: ch(F).fx });
        return true;
      }
      // Control comes back with the dash still carrying the fighter.
      F.dash = null;
      Body.setVelocity(b, { x: b.velocity.x * 0.67, y: b.velocity.y < 0 ? b.velocity.y * 0.75 : b.velocity.y });
    }

    // spec/app/index.md, "A jump straight up a wall costs 27.5 stamina, which is given back if the fighter pushes away at once"
    if (F.refundT > 0) {
      if (I.dir === -F.refundWall && send({ type: "refund" })) { Body.setVelocity(b, { x: -F.refundWall * 7.5, y: b.velocity.y }); F.facing = -F.refundWall; F.refundT = 0; }
      else if (--F.refundT === 0) send({ type: "forfeit" });
    }

    if (catchLedge(F, I)) return stepHang(F, I);
    // spec/app/index.md, "Holding a wall costs a little stamina each step, and climbing up it costs more"
    const held = F.climb;
    const wall = I.grab && !F.flying && !F.atk && m.stamina > 0 && b.velocity.y > -9 ? wallOf(F) : 0;
    F.climb = wall;
    if (!wall) {
      if (!held || !I.grab || !I.up || m.stamina <= 0) return false;
      // The top of the wall: a hop up onto it.
      launch(F, held * 3.4, -9.5);
      return true;
    }
    F.facing = wall; F.spin = 0;
    if (I.jumpPressed) {
      F.climb = 0;
      if (I.dir === -wall) { F.facing = -wall; launch(F, -wall * 7.5, KICK_OFF); }
      else if (send({ type: "climbJump" })) { launch(F, 0, JUMP); F.refundT = 12; F.refundWall = wall; }
      return true;
    }
    const vy = I.up ? -2.7 : I.down ? 4.8 : 0;
    // Each point of climb makes a wall tire the fighter a quarter more slowly: some steps on it cost nothing.
    tired += 1 / (1 + 0.25 * skills.climb);
    if (tired >= 1) { tired -= 1; if (I.up) send({ type: "climb", steps: 1 }); else if (!I.down) send({ type: "cling", steps: 1 }); }
    antiGravity(b);
    Body.setVelocity(b, { x: wall * 0.6, y: vy });
    F.lastVy = vy;
    return true;
  }

  function stepFighter(F: Fighter, I: Intent) {
    const b = F.body;
    const was = F.grounded;
    F.grounded = checkGrounded(F);
    if (F.grounded && !was && F.lastVy > 5) {
      // A landing is felt in proportion to the fall: a hop barely registers, a long drop thumps.
      const thump = Math.max(0, Math.min(2, ((F.lastVy / 17) * 400 - 120) / 220));
      dust(b.position.x, b.bounds.max.y, 4 + Math.round(thump * 5), 0); F.squash = -0.12 - thump * 0.16;
      if (F.isPlayer) { sfx.land(); shake(thump * 3); punch(thump * 0.02); ui.rumble?.(Math.min(1, F.lastVy / 17), 90); }
    }
    // Landing out of a downward diagonal dash carries its speed on, and adds a fifth.
    if (F.grounded && !was && F.lastDash.y > 0 && F.lastDash.x && stepCount - F.dashAt < 40) Body.setVelocity(b, { x: b.velocity.x * 1.2, y: b.velocity.y });
    // The figure's stretch is a damped spring, so a squash overshoots into a stretch and settles.
    F.squashV += (-360 * F.squash - 16 * F.squashV) / 60;
    F.squash += F.squashV / 60;
    if (F.grounded) { F.coyote = 6; F.airJumps = F.airJumpsMax; } else F.coyote--;
    if (F.isPlayer && F.grounded && Query.point(statics, { x: b.position.x, y: b.bounds.max.y + 4 }).length) S.lastSafe = { x: b.position.x, y: b.position.y - 10 };
    F.sinceAtk++;
    if (F.flash > 0) F.flash--;
    if (F.spin > 0) { F.spin += 1 / 26; if (F.spin >= 1 || (F.grounded && F.spin > 0.2)) F.spin = 0; }
    // spec/app/index.md, "Overdrive runs down a step at a time and leaves 25 aura when it fades"
    if (F.isPlayer && F.od > 0) { send({ type: "fade", steps: 1 }); if (F.od === 0) ui.callout("Overdrive faded"); }
    if (F.burn > 0) {
      F.burn--; F.hp -= 0.1;
      if (stepCount % 4 === 0) particles.push({ x: b.position.x + (rnd() - 0.5) * 20, y: b.position.y - rnd() * 40, vx: 0, vy: -1.5, life: 20, max: 20, size: 3, color: "255,122,26" });
      if (F.hp <= 0) { knockOutEnemy(F, { x: 0, y: -4 }, false); return; }
    }

    if (F.stun > 0) {
      F.stun--; F.atk = null; F.queued = null; F.charging = false; F.special = null; F.hang = null;
      const v = b.velocity;
      if (F.floatT > 0) { F.floatT--; antiGravity(b); Body.setVelocity(b, { x: v.x * 0.9, y: v.y * 0.8 }); }
      else Body.setVelocity(b, { x: v.x * (F.grounded ? 0.86 : 0.99), y: Math.min(v.y, 17) });
      F.lastVy = v.y;
      return;
    }
    if (F.special) { stepSpecial(F); return; }
    if (F.isPlayer && stepMoves(F, I)) return;

    // Powers (hero only).
    if (F.isPlayer) {
      if (I.fly) {
        // spec/app/index.md, "Taking off needs 5 aura, or Overdrive"
        if (F.flying) { send({ type: "touchDown" }); ui.callout("Flight off"); }
        else if (send({ type: "takeOff" })) { F.spin = 0; play("puff", b.position.x, b.bounds.max.y, toneOf(F), 0.7); discover(FOUND.fly); ui.callout("Flight", "W up · S down · F to land"); Body.setVelocity(b, { x: b.velocity.x, y: Math.min(b.velocity.y, -3) }); }
        else if (S.match.learned < 5) ui.callout("Flight not learned", "Finish chapter 5");
        else ui.callout("Need aura to fly", "Hold U to charge");
      }
      let sp = I.special;
      if (I.X && !F.atk) {
        if (motion(["F", "D", "F"])) sp = 5;
        else if (motion(["D", "F"])) sp = 0;
        else if (motion(["F", "D"])) sp = 3;
        else if (motion(["F", "F"])) sp = 4;
        else if (motion(["B", "F"])) sp = 1;
        else if (motion(["D", "D"])) sp = 2;
      }
      if (sp >= 0 && !F.atk) { if (startSpecial(F, sp)) return; I.X = false; }
    }

    // Attack buttons.
    for (const btn of ["P", "K", "X"] as const) {
      if (!I[btn]) continue;
      let pick: Pick | null;
      if (btn === "X") {
        if (F.isPlayer && !pay({ type: "blast" }, blastCostOf(S.match.fighter))) continue;
        pick = { name: "blast" };
        if (F.isPlayer) discover(FOUND.blast);
      } else if (F.isPlayer) pick = pickMove(F, btn, I);
      else pick = { name: btn === "P" ? (rnd() < 0.5 ? "jab" : "cross") : "kick" };
      if (!pick) continue;
      if (!F.atk) { startMove(F, pick.name, pick.slot); if (!MOVES[pick.name].onStart) F.spin = 0; }
      else if (F.atk.t / F.atk.def.dur > 0.45) F.queued = pick;
      break;
    }

    const ov: Overrides = {};
    if (F.atk) {
      const a = F.atk;
      a.t++;
      if (a.def.rehit && a.t % a.def.rehit === 0) a.hit.clear();
      a.def.onStep?.(F, a.t / a.def.dur, ov, a);
      if (a.def.air && F.grounded && a.t > 4) { a.def.onLand?.(F); a.t = a.def.dur; }
      if (a.t >= a.def.dur) { F.atk = null; if (F.queued) { const q = F.queued; F.queued = null; startMove(F, q.name, q.slot); } }
    }

    // spec/app/index.md, "Charging adds three quarters of a point of aura each step, up to full"
    F.charging = !!(F.isPlayer && I.charge && !F.atk && (F.grounded || F.flying));
    if (F.charging) {
      discover(FOUND.charge);
      const before = F.od;
      send({ type: "charge", steps: 1 });
      if (before === 0 && F.od > 0) activateOverdrive(F);
      if (stepCount % 9 === 0) sfx.charge();
      shake(S.match.aura >= fullAura ? 3 : 1.5);
      if (rnd() < 0.6) auraSpark(F);
      if (ch(F).element === "volt" && stepCount % 10 === 0) bolt(b.position.x + (rnd() - 0.5) * 40, b.position.y - 70, b.position.x + (rnd() - 0.5) * 40, b.bounds.max.y, ch(F).aura, 5);
    } else if (F.isPlayer && S.match.held > 0) send({ type: "release" });

    const v = b.velocity;
    let vx = v.x, vy = v.y;
    const od = F.od > 0;
    if (F.flying) {
      // spec/app/index.md, "Flight drains aura each step, and ends when the aura is gone"
      if (!od) { send({ type: "drift", steps: 1 }); if (!F.flying) ui.callout("Out of aura"); }
      const quick = F.isPlayer && S.hasted > 0 ? 1.45 : 1, spd = (I.run ? 10 : 6.5) * (od ? 1.25 : 1) * F.spd * quick;
      const tx = F.charging ? 0 : I.dir * spd;
      const ty = F.charging ? 0 : ((I.down ? 1 : 0) - (I.jumpHeld ? 1 : 0)) * 6.5;
      vx += (tx - vx) * 0.12; vy += (ty - vy) * 0.12;
      if (F.atk && ov.hang) vy *= 0.5;
      antiGravity(b);
      if (I.dir && !F.atk) F.facing = I.dir;
    } else {
      const maxSpd = (I.run ? 7.4 : 4.2) * (od ? 1.3 : 1) * F.spd * (F.isPlayer && S.hasted > 0 ? 1.45 : 1);
      let target = F.charging ? 0 : I.dir * maxSpd;
      if (F.atk && F.grounded) target *= 0.2;
      if (Math.abs(v.x) > maxSpd && Math.sign(v.x) === I.dir && !F.atk) {
        // Faster than a run, and still holding that way: the speed of a dash or a wall jump bleeds off slowly.
        vx = v.x - Math.sign(v.x) * (F.grounded ? 0.18 * (F.isPlayer && icy ? ICE_GRIP : 1) : 0.06);
      } else {
        // Six steps to full speed and five to a stop on the ground; in the air the fighter turns a little slower and
        // keeps its momentum far longer.
        const gaining = target !== 0 && Math.abs(target) > Math.abs(v.x) && Math.sign(target) === Math.sign(v.x || target);
        const grip = F.isPlayer && icy && F.grounded ? ICE_GRIP : 1;
        const rate = (gaining ? (maxSpd / 6) * (F.grounded ? 1 : 0.69) : F.grounded ? maxSpd / 5 : maxSpd / 22) * grip;
        vx = v.x + Math.max(-rate, Math.min(rate, target - v.x));
      }
      if (I.dir && !F.atk && !F.charging) F.facing = I.dir;

      if (I.jumpPressed) F.jumpBuf = 6; else F.jumpBuf--;
      const busy = F.charging || (F.atk && !F.atk.def.air && F.atk.t < F.atk.def.dur * 0.5);
      if (F.jumpBuf > 0 && F.coyote > 0 && !busy) {
        vy = F.isPlayer ? JUMP : -12.2; F.coyote = 0; F.jumpBuf = 0; F.grounded = false; F.squash = 0.3; F.rising = F.isPlayer;
        dust(b.position.x, b.bounds.max.y, 5, -I.dir); if (F.isPlayer) sfx.jump();
      } else if (F.isPlayer && I.jumpPressed && !F.grounded && F.coyote <= 0 && !F.atk && wallOf(F)) {
        // A jump beside a wall kicks off it.
        const wall = wallOf(F);
        vy = KICK_OFF; vx = -wall * 7.5; F.facing = -wall; F.jumpBuf = 0; F.squash = 0.3;
        sfx.jump();
      } else if (I.jumpPressed && !F.grounded && F.coyote <= 0 && F.airJumps > 0 && !F.atk) {
        vy = F.isPlayer ? FLIP : -11; F.airJumps--; F.jumpBuf = 0; F.spin = 0.001; F.spinDir = F.facing;
        if (F.isPlayer) sfx.flip();
      }
      if (!F.isPlayer) { if (!I.jumpHeld && vy < -3 && !F.atk) vy += 0.5; }
      else if (vy >= 0) F.rising = false;
      // Letting go of the jump on the way up keeps 45% of the rise.
      else if (F.rising && !I.jumpHeld && !F.atk) { vy *= 0.45; F.rising = false; }
      if (ov.hang) { vy = Math.min(vy * 0.5, 1); antiGravity(b); }
      else if (F.isPlayer && !F.grounded && !F.atk) {
        // Up and down fast, with a held jump hanging at the top long enough to line up the landing.
        const weight = b.mass * engine.gravity.y * engine.gravity.scale;
        // Falling pulls harder than rising, by as much as the fighter's weight says (data.ts, `fall`), and the top of a
        // held jump hangs.
        if (Math.abs(vy) < 2 && I.jumpHeld) b.force.y += weight * 0.19; else b.force.y += weight * (vy > 0 ? ch(F).fall.pull : 0.95);
      }
    }
    if (ov.dvx) vx += ov.dvx;
    if (ov.dvy) vy += ov.dvy;
    if (ov.vx !== undefined) vx = ov.vx;
    if (ov.vy !== undefined) vy = ov.vy;
    vy = Math.max(F.isPlayer ? -19.5 : -17, Math.min(vy, F.isPlayer ? ch(F).fall.most : 17));
    Body.setVelocity(b, { x: vx, y: vy });
    F.lastVy = vy;
    if (F.grounded && Math.abs(vx) > 5.5 && rnd() < 0.25) dust(b.position.x - F.facing * 8, b.bounds.max.y, 1, -F.facing);
  }

  function targetPose(F: Fighter): Pose {
    const time = S.time;
    if (F.stun > 0) {
      const j = Math.sin(time * 40) * 0.08;
      return STUN.map((a, i) => a + (i > 1 ? j : 0));
    }
    if (F.special) {
      const p = F.special.kind.pose(F, F.special);
      return !F.grounded && F.special.kind.ground ? airify(p) : p;
    }
    if (F.dash) return FLY_MOVE;
    if (F.climb || F.hang) return CLIMB;
    const airborne = !F.grounded;
    if (F.atk) {
      const t = F.atk.t / F.atk.def.dur, d = F.atk.def;
      const p = d.poseAt ? d.poseAt(t) : sampleKeys(d.keys!, t);
      return airborne && !d.air && !d.rising && !d.onStart ? airify(p) : p;
    }
    if (F.charging) {
      const j = Math.sin(time * 50) * 0.05;
      return (F.flying ? airify(CHARGE) : CHARGE).map((a) => a + j);
    }
    const vx = F.body.velocity.x, vy = F.body.velocity.y;
    if (F.flying) {
      if (Math.abs(vx) > 2.5) return FLY_MOVE;
      const bob = Math.sin(time * 3) * 0.06;
      return FLY_HOVER.map((a, i) => a + (i > 5 ? bob : 0));
    }
    if (F.spin > 0) return TUCK;
    if (airborne) return vy < 0 ? AIR_RISE : AIR_FALL;
    const speed = Math.abs(vx);
    if (speed < 0.6) {
      const br = Math.sin(time * 3 + F.body.id) * 0.04;
      const s = STANCE.slice(); s[0] += br; s[3] += br * 2; s[5] += br * 2; return s;
    }
    F.runPhase += speed * 0.075;
    const ph = F.runPhase, running = speed > 5;
    const amp = running ? 0.85 : 0.55, knee = running ? 1.5 : 0.9;
    const legU = (a: number) => Math.sin(a) * amp, legL = (a: number) => -(0.1 + knee * Math.max(0, Math.cos(a)));
    return [
      running ? 0.32 : 0.1, running ? -0.2 : -0.05,
      -Math.sin(ph) * amp * 0.9, running ? 1.5 : 0.6,
      Math.sin(ph) * amp * 0.9, running ? 1.5 : 0.6,
      legU(ph), legL(ph), legU(ph + Math.PI), legL(ph + Math.PI),
    ];
  }

  function updatePose(F: Fighter) {
    const tgt = targetPose(F);
    const k = F.atk || F.stun || F.special ? 0.6 : 0.3;
    for (let i = 0; i < 10; i++) F.pose[i] += (tgt[i] - F.pose[i]) * k;
    const c = F.body.position;
    const sk = skeleton(F.pose, c.x, c.y + 2, F.facing);
    let plant = 0;
    if (F.grounded && !F.flying) plant = Math.max(-4, Math.min(22, F.body.bounds.max.y - Math.max(sk.footF.y, sk.footB.y)));
    F.plant += (plant - F.plant) * 0.5;
    const ang = F.spin > 0 ? F.spinDir * Math.PI * 2 * smooth(F.spin) : 0;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const feet = F.body.bounds.max.y, tall = 1 + F.squash, wide = 1 - F.squash * 0.6;
    for (const p of Object.values(sk)) {
      p.y += F.plant;
      if (F.squash) { p.y = feet + (p.y - feet) * tall; p.x = c.x + (p.x - c.x) * wide; }
      if (ang) { const dx = p.x - c.x, dy = p.y - c.y; p.x = c.x + dx * cs - dy * sn; p.y = c.y + dx * sn + dy * cs; }
    }
    F.skel = sk;
    const flashy = F.dash || F.atk || F.spin > 0 || F.stun > 0 || F.special || Math.abs(F.body.velocity.x) > 6.5 || (F.flying && Math.abs(F.body.velocity.y) > 4);
    if (stepCount % 2 === 0) {
      if (flashy) { F.trail.push(sk); if (F.trail.length > 5) F.trail.shift(); }
      else if (F.trail.length) F.trail.shift();
    }
  }

  // ---------- powers ----------
  function activateOverdrive(F: Fighter) {
    discover(FOUND.overdrive);
    ui.banner("Overdrive", "gold");
    sfx.power();
    S.slowMs = 600; S.flashT = 18; shake(14); punch(0.1);
    rings.push({ x: F.body.position.x, y: F.body.position.y, r: 20, max: 200, life: 24 });
    play("surge", F.body.position.x, F.body.position.y - 10, toneOf(F));
    explode(F.body.position.x, F.body.position.y, 170, 6, true, 1.2, true);
  }

  function nearestEnemy(x: number, y: number, max: number): Fighter | null {
    let best: Fighter | null = null, bd = max;
    for (const E of enemies) { const d = Math.hypot(E.body.position.x - x, E.body.position.y - y); if (E.alive && d < bd) { bd = d; best = E; } }
    return best;
  }
  const handsOf = (F: Fighter): Vec => { const s = F.skel!; return { x: (s.fistF.x + s.fistB.x) / 2, y: (s.fistF.y + s.fistB.y) / 2 }; };
  const orbAbove = (F: Fighter): Vec => ({ x: F.body.position.x, y: F.skel ? F.skel.head.y - 46 : F.body.position.y - 100 });

  /** The foes within `reach` across of F, and a screen up or down, nearest first; `most` of them at most. */
  const foesNear = (F: Fighter, reach: number, most = 8) => enemies
    .filter((E) => E.alive && Math.abs(E.body.position.x - F.body.position.x) < reach && Math.abs(E.body.position.y - F.body.position.y) < 600)
    .sort((a, b) => Math.abs(a.body.position.x - F.body.position.x) - Math.abs(b.body.position.x - F.body.position.x)).slice(0, most);
  /** Strikes every foe within `r` of (x, y), thrown away from it and up by `ky`. */
  function hitAround(F: Fighter, x: number, y: number, r: number, dmg: number, ky: number) {
    for (const T of enemies.slice()) {
      const p = T.body.position, dir = Math.sign(p.x - x) || F.facing;
      if (T.alive && Math.hypot(p.x - x, p.y - y) < r + 24) hurt(T, { dmg: dmg * dmgMul(F), kx: dir * 6, ky, stun: 34, heavy: true, float: true, from: dir });
    }
  }
  /** Draws every foe within `reach` of `c` towards it, held where it is pulled to; `dmg` a step, if any. */
  function pull(F: Fighter, c: Vec, reach: number, dmg: number) {
    for (const T of enemies.slice()) {
      const p = T.body.position, d = Math.hypot(c.x - p.x, c.y - p.y);
      if (!T.alive || d > reach) continue;
      T.stun = Math.max(T.stun, 6); T.floatT = Math.max(T.floatT, 6); T.atk = null;
      Body.setVelocity(T.body, { x: T.body.velocity.x * 0.8 + (c.x - p.x) * 0.07, y: T.body.velocity.y * 0.8 + (c.y - p.y) * 0.07 });
      if (dmg) hurt(T, { dmg: dmg * dmgMul(F), kx: (c.x - p.x) * 0.04, ky: (c.y - p.y) * 0.04, stun: 12, float: true, from: Math.sign(c.x - p.x) });
    }
    for (const b of Query.region(loose(), box(c.x - reach, c.y - reach, c.x + reach, c.y + reach))) {
      Body.applyForce(b, b.position, { x: (c.x - b.position.x) * 0.00005 * b.mass, y: ((c.y - b.position.y) * 0.00005 - 0.0011) * b.mass });
    }
  }
  /** Ice holds a foe where it stands for `steps`. */
  function freeze(T: Fighter, steps: number) {
    if (!T.alive) return;
    T.stun = Math.max(T.stun, steps); T.atk = null; T.burn = 0;
    Body.setVelocity(T.body, { x: 0, y: Math.max(0, T.body.velocity.y) });
    play("freeze", T.body.position.x, T.body.bounds.max.y, "water", 0.9);
  }
  /** A lance of ice flown from (x, y): it goes through every foe on its way, freezing each. */
  function lance(F: Fighter, x: number, y: number, dir: number, ang: number) {
    const vx = Math.cos(ang) * 17 * dir, vy = Math.sin(ang) * 17, shard = play("iceLance", x, y, "water", 1.1, dir < 0), hit = new Set<Fighter>();
    each(72, () => {
      x += vx; y += vy; shard.x = x; shard.y = y;
      for (const T of enemies.slice()) {
        if (!T.alive || hit.has(T) || Math.hypot(T.body.position.x - x, T.body.position.y - y) > 50) continue;
        hit.add(T);
        hurt(T, { dmg: 12 * dmgMul(F), kx: dir * 3, ky: -2, stun: 20, from: dir });
        freeze(T, 100);
        sfx.zap();
      }
      if (rnd() < 0.5) particles.push({ x, y, vx: -vx * 0.05, vy: (rnd() - 0.5), life: 14, max: 14, size: 2 + rnd() * 2, color: "200,240,255" });
    });
  }
  /** Foes in a chain, each the nearest to the one before, beginning with the nearest to F; `hop` apart at most. */
  function chainOf(F: Fighter, most: number, hop: number) {
    const out: Fighter[] = [];
    let at = F.body.position;
    while (out.length < most) {
      let best: Fighter | null = null, bd = out.length ? hop : hop * 2;
      for (const E of enemies) { const d = Math.hypot(E.body.position.x - at.x, E.body.position.y - at.y); if (E.alive && !out.includes(E) && d < bd) { bd = d; best = E; } }
      if (!best) break;
      out.push(best); at = best.body.position;
    }
    return out;
  }

  // Special kinds: each is a small program run over the special's timeline.
  // ground: stands still on the ground instead of hovering; rise: skips the hover for the first steps.
  const SK: Record<string, SpecialKind> = {
    beam: { dur: 120, ground: true,
      pose: (_F, s) => (s.t < 44 ? BEAM_CHARGE : s.t < 104 ? BEAM_FIRE : STANCE),
      step(F, s) {
        if (s.t < 44) gather(handsOf(F), 2, 90, ch(F).fx);
        if (s.t === 44) { sfx.beam(); shake(10); const h = handsOf(F); play("ring", h.x + F.facing * 20, h.y + 40, toneOf(F), 0.5); }
        if (s.t >= 44 && s.t < 104) {
          s.ang = s.p.sweep ? Math.sin((s.t - 44) / 60 * Math.PI * 2) * num(s.p.sweep) : 0;
          if (s.t % num(s.p.tick) === 0) beamTick(F, s);
          shake(num(s.p.width) > 20 ? 4 : 2);
          if (ch(F).element === "volt" && s.t % 3 === 0) sfx.zap();
        }
      } },
    volley: { dur: 108, rise: 12,
      pose: (_F, s) => (s.t < 16 ? AIR_RISE : s.t < 84 ? (Math.floor(s.t / 5) % 2 ? VOLLEY_A : VOLLEY_B) : s.t < 100 ? airify(BEAM_FIRE) : AIR_FALL),
      start(F) { if (F.grounded) Body.setVelocity(F.body, { x: 0, y: -10 }); },
      step(F, s) {
        if (s.p.mode === "fan") {
          if (s.t === 16 || s.t === 34 || s.t === 52) fan(F, 7, 0.55);
          if (s.t === 84) fan(F, 13, 0.95);
        } else {
          if (s.t >= 16 && s.t <= 78 && s.t % 5 === 1) fireFrom(F, Math.floor(s.t / 5) % 2 ? "fistF" : "fistB", true);
          if (s.t === 92) fireFrom(F, "fistF", true, true);
        }
      } },
    nova: { dur: 66,
      pose: (_F, s) => (s.t < 42 ? NOVA_GATHER : s.t < 58 ? NOVA_RELEASE : STANCE),
      step(F, s) {
        const c = F.body.position, radius = num(s.p.radius);
        if (s.t < 42) { gather(c, 3, 90, ch(F).fx); shake(s.t / 6); }
        if (s.t === 42) {
          rings.push({ x: c.x, y: c.y, r: 20, max: radius + 10, life: 26 }, { x: c.x, y: c.y, r: 10, max: radius * 0.7, life: 18 });
          explode(c.x, c.y, radius, num(s.p.dmg), true, 1.9);
          S.flashT = 22; S.slowMs = 500;
        }
      } },
    pillars: { dur: 70, ground: true,
      pose: (_F, s) => (s.t < 10 ? SLAM_UP : SLAM_DOWN),
      step(F, s) {
        if (s.t >= 12 && (s.t - 12) % 8 === 0) {
          const i = (s.t - 12) / 8; if (i > 5) return;
          const x = F.body.position.x + F.facing * (80 + i * 95);
          const y = groundYAt(x, F.body.bounds.max.y - 120);
          if (y !== null) pillar(x, y, F);
        }
      } },
    bigorb: { dur: 42, ground: true,
      pose: (_F, s) => (s.t < 18 ? BOTH_UP : BEAM_FIRE),
      step(F, s) {
        if (s.t < 18) gather(orbAbove(F), 2, 70, ch(F).fx);
        if (s.t === 18) { const p = orbAbove(F); spawnOrb(F, p.x, p.y, 0, { vx: F.facing * 8, vy: -8, g: 0.35, r: 30, big: true, radius: 175, dmg: 32, life: 220 }); ui.sample?.("blast"); }
      } },
    quake: { dur: 54, ground: true,
      pose: (_F, s) => (s.t < 16 ? SLAM_UP : SLAM_DOWN),
      step(F, s) {
        if (s.t === 16) {
          const x = F.body.position.x, y = F.body.bounds.max.y;
          shockwave(x, y, 140, 10);
          quakeWave(x, y, 1, F); quakeWave(x, y, -1, F);
          play("quake", x, y, "fire"); play("thorns", x + 40, y, "fire"); play("thorns", x - 40, y, "fire", 1, true);
          S.flashT = 10;
        }
      } },
    rush: { dur: 20,
      pose: (_F, s) => ((s.t - 4) % 12 < 8 ? KICK_X : AIR_FALL),
      start(F, s) {
        const x = F.body.position.x;
        s.targets = enemies.filter((E) => E.alive && Math.abs(E.body.position.x - x) < 1100).sort((a, b) => Math.abs(a.body.position.x - x) - Math.abs(b.body.position.x - x)).slice(0, 6);
        if (!s.targets.length) { ui.callout("No one in range"); return false; }
        s.dur = s.targets.length * 12 + 16;
      },
      step(F, s) {
        if (s.t < 4 || (s.t - 4) % 12 !== 0) return;
        const T = s.targets![(s.t - 4) / 12];
        if (!T || !T.alive) return;
        const side = rnd() < 0.5 ? -1 : 1;
        poof(F.body.position.x, F.body.position.y, ch(F).fx);
        Body.setPosition(F.body, { x: T.body.position.x + side * 44, y: T.body.position.y - 4 });
        Body.setVelocity(F.body, { x: 0, y: 0 });
        F.facing = -side; F.trail = [];
        hurt(T, { dmg: 14 * dmgMul(F), kx: -side * 7, ky: -6, stun: 30, float: true, heavy: true, from: -side });
        burst(T.body.position.x, T.body.position.y - 20, 24, ch(F).orb);
        sfx.vanish(); sfx.hit(true, S.match.combo); shake(7);
      } },
    discs: { dur: 32,
      pose: (_F, s) => (Math.floor(s.t / 6) % 2 ? VOLLEY_A : VOLLEY_B),
      step(F, s) {
        if (s.t === 10 || s.t === 16 || s.t === 22) {
          const k = (s.t - 16) / 6, p = F.skel!.fistF;
          spawnOrb(F, p.x, p.y, (F.facing > 0 ? 0 : Math.PI) + k * 0.4 * F.facing, { r: 12, disc: true, home: true, pierce: true, life: 170, dmg: 10, speed: 12 });
          ui.sample?.("blast");
        }
      } },
    vortex: { dur: 96,
      pose: (_F, s) => (Math.floor(s.t / 8) % 2 ? VOLLEY_A : VOLLEY_B),
      start(F, s) { s.c = { x: F.body.position.x + F.facing * 240, y: F.body.position.y - 10 }; play("whirl", s.c.x, s.c.y, "water"); },
      step(F, s) {
        const c = s.c!;
        if (s.t >= 8 && s.t < 84) {
          for (const T of enemies.slice()) {
            const p = T.body.position, d = Math.hypot(c.x - p.x, c.y - p.y);
            if (!T.alive || d > 300) continue;
            T.stun = Math.max(T.stun, 6); T.floatT = Math.max(T.floatT, 6); T.atk = null;
            Body.setVelocity(T.body, { x: T.body.velocity.x * 0.8 + (c.x - p.x) * 0.06, y: T.body.velocity.y * 0.8 + (c.y - p.y) * 0.06 });
            if (s.t % 10 === 0) hurt(T, { dmg: 3 * dmgMul(F), kx: (c.x - p.x) * 0.05, ky: (c.y - p.y) * 0.05, stun: 12, float: true, from: Math.sign(c.x - p.x) });
          }
          for (const b of Query.region(loose(), box(c.x - 300, c.y - 300, c.x + 300, c.y + 300))) {
            Body.applyForce(b, b.position, { x: (c.x - b.position.x) * 0.00004 * b.mass, y: ((c.y - b.position.y) * 0.00004 - 0.0011) * b.mass });
          }
        }
        if (s.t === 84) { explode(c.x, c.y, 220, 22, true, 1.6); rings.push({ x: c.x, y: c.y, r: 20, max: 240, life: 20 }); }
      } },
    storm: { dur: 84, ground: true,
      pose: (_F, s) => (s.t < 12 ? CHARGE : RAISE),
      start(_F, s) { s.targets = []; },
      step(F, s) {
        if (s.t < 18) gather(F.skel!.fistF, 2, 60, ch(F).fx);
        if (s.t === 18) s.targets = enemies.filter((E) => E.alive && Math.abs(E.body.position.x - F.body.position.x) < 1200).slice(0, 8);
        if (s.t >= 20 && (s.t - 20) % 7 === 0) {
          const k = (s.t - 20) / 7; if (k > 7) return;
          const T = s.targets![k];
          if (T && T.alive) strikeBolt(T, 18 * dmgMul(F), true);
          else {
            const x = F.body.position.x + (rnd() - 0.5) * 900, y = groundYAt(x, F.body.position.y - 300);
            if (y !== null) { bolt(x, S.camY - 40, x, y, ch(F).aura, 9); explode(x, y - 10, 60, 10 * dmgMul(F), true, 1); }
          }
        }
      } },
    cyclone: { dur: 30, ground: true,
      pose: (_F, s) => (s.t < 12 ? VOLLEY_B : VOLLEY_A),
      step(F, s) { if (s.t === 12) cyclone(F); } },
    rain: { dur: 76, ground: true,
      pose: () => BOTH_UP,
      step(F, s) {
        if (s.t >= 10 && s.t < 70 && s.t % 2 === 0) {
          const x = F.body.position.x + F.facing * 160 + (rnd() - 0.5) * 820;
          spawnOrb(F, x, S.camY - 30, Math.PI / 2 + (rnd() - 0.5) * 0.15, { speed: 13, r: 7, dmg: 8, life: 200, radius: 40 });
        }
      } },
    echo: { dur: 46,
      pose: (_F, s) => (s.t < 10 ? NOVA_GATHER : NOVA_RELEASE),
      step(F, s) { if (s.t === 10) { echoClone(F, 1); echoClone(F, -1); sfx.vanish(); } } },

    // ---- The greater arts: each fighter's last three specials. ----
    // Ink. Runes are written under each foe, and a blade of light falls on each in turn.
    guillotine: { dur: 96, ground: true,
      pose: (_F, s) => (s.t < 22 ? RAISE : SLAM_DOWN),
      start(F, s) { s.targets = foesNear(F, 1100, 5); },
      step(F, s) {
        if (s.t < 22) gather(handsOf(F), 2, 80, ch(F).fx);
        if (s.t === 8) for (const T of s.targets!) play("runeCircle", T.body.position.x, T.body.bounds.max.y, toneOf(F), 1.3);
        if (s.t >= 22 && (s.t - 22) % 10 === 0) {
          const k = (s.t - 22) / 10, T = s.targets![k];
          if (k >= Math.max(3, s.targets!.length)) return;
          const x = T?.alive ? T.body.position.x : F.body.position.x + F.facing * (150 + k * 130);
          const y = T?.alive ? T.body.bounds.max.y : groundYAt(x, F.body.position.y - 200) ?? F.body.bounds.max.y;
          land("smite", x, y, toneOf(F), 1.6, () => { hitAround(F, x, y - 60, 80, 26, -11); shake(12); S.flashT = Math.max(S.flashT, 8); punch(0.08); sfx.boom(true); });
        }
      } },
    // Ink. A black sun rises before the fighter, drags everything near into it, and bursts.
    blacksun: { dur: 118,
      pose: (_F, s) => (s.t < 96 ? (Math.floor(s.t / 8) % 2 ? VOLLEY_A : VOLLEY_B) : NOVA_RELEASE),
      start(F, s) {
        s.c = { x: F.body.position.x + F.facing * 260, y: F.body.position.y - 150 };
        play("eclipse", s.c.x, s.c.y, toneOf(F), 2.2); play("blackHole", s.c.x, s.c.y + 10, toneOf(F), 1.8);
      },
      step(F, s) {
        const c = s.c!;
        if (s.t < 92) { pull(F, c, 430, s.t % 12 === 0 ? 4 : 0); if (s.t % 4 === 0) gather(c, 2, 160, ch(F).fx); }
        if (s.t === 92) play("surge", c.x, c.y, toneOf(F), 1.4);
        if (s.t === 100) { play("bigBoom", c.x, c.y + 80, toneOf(F), 1.3); explode(c.x, c.y, 290, 34, true, 2.4); S.flashT = 26; S.slowMs = 700; punch(0.14); }
      } },
    // Ink. Time stops. A pillar of judgment stands on every foe, and then they all burst at once.
    verdict: { dur: 132, ground: true,
      pose: (_F, s) => (s.t < 30 ? NOVA_GATHER : s.t < 104 ? RAISE : NOVA_RELEASE),
      start(F, s) {
        s.targets = foesNear(F, 1400, 8);
        play("timeStop", F.body.position.x, F.body.position.y - 20, toneOf(F), 2.6);
        for (const T of s.targets) { T.stun = Math.max(T.stun, 130); T.atk = null; Body.setVelocity(T.body, { x: 0, y: 0 }); }
        S.flashT = 14;
      },
      step(F, s) {
        if (s.t < 30) { gather(F.body.position, 3, 130, ch(F).fx); shake(s.t / 10); }
        if (s.t >= 30 && (s.t - 30) % 8 === 0) {
          const T = s.targets![(s.t - 30) / 8];
          if (T?.alive) land("holyPillar", T.body.position.x, T.body.bounds.max.y, toneOf(F), 1.3, () => { hurt(T, { dmg: 12 * dmgMul(F), kx: 0, ky: -3, stun: 100, float: true, from: F.facing }); sfx.zap(); shake(5); });
        }
        if (s.t === 106) {
          for (const T of s.targets!) if (T.alive) explode(T.body.position.x, T.body.position.y, 140, 30, true, 2, true);
          S.flashT = 30; S.slowMs = 900; shake(20); punch(0.16); sfx.boom(true);
        }
      } },
    // Ember. Meteors come down in a line ahead of the fighter, one after another.
    meteors: { dur: 100, ground: true,
      pose: () => BOTH_UP,
      step(F, s) {
        if (s.t < 14) gather(orbAbove(F), 2, 70, ch(F).fx);
        if (s.t >= 14 && (s.t - 14) % 9 === 0 && s.t <= 14 + 9 * 7) {
          const k = (s.t - 14) / 9, x = F.body.position.x + F.facing * (110 + k * 105) + (rnd() - 0.5) * 50, y = groundYAt(x, F.body.position.y - 260);
          if (y === null) return;
          land("meteor", x, y, "fire", 1.3, () => { explode(x, y - 30, 120, 22, true, 1.7, true); play("flame", x, y, "fire", 0.6); shake(10); sfx.boom(true); }, F.facing < 0);
        }
      } },
    // Ember. A tornado of fire walks out along the ground, lifting and burning whatever it meets, and bursts.
    firestorm: { dur: 40, ground: true,
      pose: (_F, s) => (s.t < 16 ? SLAM_UP : SLAM_DOWN),
      step(F, s) {
        if (s.t !== 16) return;
        const dir = F.facing;
        let x = F.body.position.x + dir * 80, y = groundYAt(x, F.body.bounds.max.y - 90) ?? F.body.bounds.max.y;
        if (Math.abs(y - F.body.bounds.max.y) > 90) { x = F.body.position.x; y = F.body.bounds.max.y; }
        const twister = play("fireTornado", x, y, "fire", 2.3);
        shake(8); sfx.boom(false);
        each(190, (t) => {
          const ny = groundYAt(x + dir * 5, y - 90);
          if (ny !== null && Math.abs(ny - y) < 90) { x += dir * 5; y = ny; }
          twister.x = x; twister.y = y;
          if (t % 10 === 0) for (const T of enemies.slice()) {
            if (!T.alive || Math.abs(T.body.position.x - x) > 110 || T.body.bounds.max.y < y - 320 || T.body.bounds.min.y > y + 10) continue;
            hurt(T, { dmg: 6 * dmgMul(F), kx: dir * 2, ky: -9, stun: 22, float: true, from: dir });
            T.burn = Math.max(T.burn, 120);
          }
          if (t % 3 === 0) particles.push({ x: x + (rnd() - 0.5) * 60, y: y - rnd() * 260, vx: (rnd() - 0.5) * 3, vy: -2 - rnd() * 3, life: 22, max: 22, size: 3 + rnd() * 3, color: "255,122,26" });
          if (t === 189) explode(x, y - 70, 170, 22, true, 1.9);
        });
      } },
    // Ember. The furnace in the fighter's chest opens: the whole place goes up.
    furnace: { dur: 124, ground: true,
      pose: (_F, s) => (s.t < 50 ? CHARGE : s.t < 58 ? SLAM_UP : SLAM_DOWN),
      step(F, s) {
        const c = F.body.position, feet = F.body.bounds.max.y;
        if (s.t < 50) { gather(c, 4, 170, ch(F).fx); shake(s.t / 8); if (s.t % 10 === 0) sfx.charge(); }
        if (s.t === 52) play("nuke", c.x, feet, "fire", 1.8);
        if (s.t === 56) {
          explode(c.x, c.y, 430, 45, true, 2.8); S.flashT = 40; S.slowMs = 1100; shake(24); punch(0.2);
          for (let i = 0; i < 6; i++) {
            const x = c.x + (i < 3 ? -1 : 1) * (150 + (i % 3) * 150), y = groundYAt(x, feet - 150);
            if (y !== null) later(4 + (i % 3) * 6, () => pillar(x, y, F));
          }
        }
      } },
    // Tide. Five lances of ice in a fan, through every foe they meet, freezing each.
    lances: { dur: 58,
      pose: (_F, s) => (Math.floor(s.t / 6) % 2 ? VOLLEY_A : VOLLEY_B),
      step(F, s) {
        if (s.t >= 10 && s.t <= 42 && (s.t - 10) % 8 === 0) {
          const k = (s.t - 10) / 8, h = handsOf(F);
          lance(F, h.x, h.y, F.facing, (k - 2) * 0.12);
          ui.sample?.("blast");
        }
      } },
    // Tide. A wave rises at the fighter's feet and rolls along the ground, carrying every foe before it.
    tidal: { dur: 36, ground: true,
      pose: (_F, s) => (s.t < 14 ? SLAM_UP : SLAM_DOWN),
      step(F, s) {
        if (s.t !== 14) return;
        const dir = F.facing, hit = new Set<Fighter>();
        let x = F.body.position.x + dir * 60, y = F.body.bounds.max.y;
        shake(10); sfx.boom(true);
        each(84, (t) => {
          const ny = groundYAt(x + dir * 12, y - 90);
          if (ny === null || Math.abs(ny - y) > 100) return false;
          x += dir * 12; y = ny;
          if (t % 10 === 0) play("waveCrash", x, y, "water", 1.8, dir < 0);
          for (const T of enemies.slice()) {
            if (!T.alive || hit.has(T) || Math.abs(T.body.position.x - x) > 90 || Math.abs(T.body.bounds.max.y - y) > 170) continue;
            hit.add(T);
            hurt(T, { dmg: 18 * dmgMul(F), kx: dir * 14, ky: -8, stun: 40, heavy: true, from: dir });
          }
          for (const b of Query.region(loose(), box(x - 80, y - 160, x + 80, y))) Body.applyForce(b, b.position, { x: dir * 0.02 * b.mass, y: -0.01 * b.mass });
          if (t % 4 === 0) shake(3);
        });
      } },
    // Tide. A blizzard: every foe near freezes solid, and then shatters.
    zero: { dur: 132, ground: true,
      pose: (_F, s) => (s.t < 40 ? NOVA_GATHER : s.t < 108 ? RAISE : NOVA_RELEASE),
      start(F, s) { s.targets = foesNear(F, 1300, 10); play("blizzard", F.body.position.x, F.body.position.y - 40, "water", 3.4); },
      step(F, s) {
        const c = F.body.position, feet = F.body.bounds.max.y;
        if (s.t < 40) gather(c, 3, 140, ch(F).fx);
        if (s.t === 24) land("frostNova", c.x, feet, "water", 2.4, () => { for (const T of s.targets!) freeze(T, 90); S.flashT = 16; shake(10); sfx.boom(false); });
        if (s.t === 104) {
          for (const T of s.targets!) if (T.alive) {
            const dir = Math.sign(T.body.position.x - c.x) || F.facing;
            play("shatter", T.body.position.x, T.body.bounds.max.y, "water", 1.4);
            hurt(T, { dmg: 40 * dmgMul(F), kx: dir * 7, ky: -12, stun: 30, heavy: true, from: dir });
          }
          S.slowMs = 800; S.flashT = 22; shake(18); punch(0.12); sfx.boom(true);
        }
      } },
    // Volt. One bolt that leaps from foe to foe, harder at each.
    chain: { dur: 64, ground: true,
      pose: (_F, s) => (s.t < 14 ? CHARGE : BEAM_FIRE),
      start(F, s) { s.targets = chainOf(F, 8, 420); if (!s.targets.length) { ui.callout("No one in range"); return false; } },
      step(F, s) {
        if (s.t < 14) gather(handsOf(F), 2, 60, ch(F).fx);
        if (s.t === 14) { const h = handsOf(F); play("chain", h.x, h.y, "volt", 1.4, F.facing < 0); }
        if (s.t >= 14 && (s.t - 14) % 5 === 0) {
          const k = (s.t - 14) / 5, T = s.targets![k];
          if (!T?.alive) return;
          const from = k ? s.targets![k - 1].body.position : handsOf(F), to = T.body.position, dir = Math.sign(to.x - from.x) || F.facing;
          bolt(from.x, from.y, to.x, to.y, ch(F).aura, 8);
          play("zap", to.x, to.y, "volt", 1.3);
          hurt(T, { dmg: (16 + k * 2) * dmgMul(F), kx: dir * 4, ky: -5, stun: 50, heavy: true, from: dir });
          sfx.zap(); shake(5); S.flashT = Math.max(S.flashT, 4);
        }
      } },
    // Volt. A ball of lightning drifts after the nearest foe, lashing out at everything near, and bursts.
    plasma: { dur: 30,
      pose: (_F, s) => (s.t < 14 ? BOTH_UP : BEAM_FIRE),
      step(F, s) {
        if (s.t !== 14) return;
        let { x, y } = orbAbove(F);
        const ball = play("plasma", x, y, "volt", 2.2);
        sfx.power();
        each(260, (t) => {
          const T = nearestEnemy(x, y, 800), tx = T ? T.body.position.x : x + F.facing * 3, ty = T ? T.body.position.y - 70 : y;
          x += Math.max(-3.4, Math.min(3.4, (tx - x) * 0.03)); y += Math.max(-2.6, Math.min(2.6, (ty - y) * 0.03));
          ball.x = x; ball.y = y;
          if (t % 12 === 0) {
            for (const E of enemies.filter((E) => E.alive && Math.hypot(E.body.position.x - x, E.body.position.y - y) < 270).slice(0, 3)) {
              bolt(x, y, E.body.position.x, E.body.position.y, ch(F).aura, 5);
              hurt(E, { dmg: 5 * dmgMul(F), kx: 0, ky: -3, stun: 24, from: Math.sign(E.body.position.x - x) });
            }
            sfx.zap();
          }
          if (t === 259) { explode(x, y, 210, 26, true, 2); play("thunderclap", x, y + 40, "volt", 1.5); }
        });
      } },
    // Volt. Storm clouds cover the sky and the fighter calls lightning down on everything, again and again.
    thundergod: { dur: 140, ground: true,
      pose: (_F, s) => (s.t < 24 ? CHARGE : RAISE),
      start(F, s) { s.targets = foesNear(F, 1400, 10); },
      step(F, s) {
        const c = F.body.position, feet = F.body.bounds.max.y;
        if (s.t < 24) { gather(F.skel!.fistF, 3, 80, ch(F).fx); if (s.t % 6 === 0) sfx.zap(); }
        if (s.t === 8) for (let i = -2; i <= 2; i++) play("stormCloud", c.x + i * 270, S.camY + 70, "volt", 2.4);
        if (s.t === 24) { S.slowMs = 1400; play("thunderclap", c.x, feet, "volt", 2); S.flashT = 12; shake(10); }
        if (s.t >= 28 && (s.t - 28) % 6 === 0 && s.t <= 28 + 6 * 15) {
          const k = (s.t - 28) / 6, T = s.targets!.length ? s.targets![k % s.targets!.length] : undefined;
          const x = T?.alive ? T.body.position.x : c.x + (rnd() - 0.5) * 1100, y = T?.alive ? T.body.bounds.max.y : groundYAt(x, c.y - 300);
          if (y === null) return;
          bolt(x, S.camY - 40, x, y, ch(F).aura, 11); play("strike", x, y, "volt", 1.3);
          explode(x, y - 30, 90, 14, true, 1.6, true); S.flashT = Math.max(S.flashT, 8); sfx.zap();
        }
        if (s.t === 126) { play("thunderclap", c.x, feet, "volt", 2.4); explode(c.x, c.y, 300, 20, true, 2.2); }
      } },
    // Moss. Roots rise under each foe and hold it, and then the earth spears up beneath it.
    roots: { dur: 84, ground: true,
      pose: (_F, s) => (s.t < 16 ? SLAM_UP : SLAM_DOWN),
      start(F, s) { s.targets = foesNear(F, 1000, 6); },
      step(F, s) {
        if (s.t === 16) { shake(8); sfx.boom(false); for (const T of s.targets!) if (T.alive) { play("roots", T.body.position.x, T.body.bounds.max.y, "leaf", 1.6); T.stun = Math.max(T.stun, 110); T.atk = null; } }
        if (s.t > 16 && s.t < 70) for (const T of s.targets!) if (T.alive) Body.setVelocity(T.body, { x: 0, y: Math.max(0, T.body.velocity.y) });
        if (s.t === 54) for (const T of s.targets!) if (T.alive) {
          const x = T.body.position.x, y = T.body.bounds.max.y;
          land("earthSpike", x, y, "leaf", 1.4, () => { hurt(T, { dmg: 24 * dmgMul(F), kx: 0, ky: -15, stun: 40, heavy: true, float: true, from: F.facing }); shake(6); });
        }
      } },
    // Moss. A cloud of spores bursts ahead and hangs there, sickening everything inside it.
    spores: { dur: 40, ground: true,
      pose: (_F, s) => (s.t < 14 ? BOTH_UP : NOVA_RELEASE),
      step(F, s) {
        if (s.t !== 14) return;
        const x = F.body.position.x + F.facing * 230, y = groundYAt(x, F.body.position.y - 120) ?? F.body.bounds.max.y;
        play("spores", x, y, "leaf", 2); play("poison", x, y, "leaf", 2.3);
        sfx.boom(false);
        each(250, (t) => {
          if (t % 15 === 0) for (const E of enemies.slice()) {
            if (E.alive && Math.abs(E.body.position.x - x) < 270 && Math.abs(E.body.bounds.max.y - y) < 220) hurt(E, { dmg: 5 * dmgMul(F), kx: 0, ky: -2, stun: 28, from: Math.sign(E.body.position.x - x) || F.facing });
          }
          if (t % 4 === 0) particles.push({ x: x + (rnd() - 0.5) * 460, y: y - rnd() * 140, vx: (rnd() - 0.5) * 0.6, vy: -0.6 - rnd(), life: 40, max: 40, size: 3 + rnd() * 3, color: "150,220,90" });
        });
      } },
    // Moss. A tree of the world grows through the fighter: leaves whirl, it is healed, and the earth spears up on both sides.
    worldtree: { dur: 130, ground: true,
      pose: (_F, s) => (s.t < 30 ? NOVA_GATHER : s.t < 100 ? RAISE : NOVA_RELEASE),
      step(F, s) {
        const c = F.body.position, feet = F.body.bounds.max.y;
        if (s.t < 30) gather(c, 3, 130, ch(F).fx);
        if (s.t === 6) { play("leafStorm", c.x, feet, "leaf", 3); play("bloom", c.x, feet, "leaf", 2.2); }
        // spec/app/index.md, "Something used from the bag heals, up to full health"
        if (s.t === 30 && F.isPlayer && send({ type: "heal", amount: 30 })) { floaters.push({ x: c.x, y: c.y - 90, text: "+30", life: 50 }); S.flashT = Math.max(S.flashT, 10); }
        if (s.t >= 34 && (s.t - 34) % 10 === 0 && s.t <= 34 + 10 * 4) {
          const k = (s.t - 34) / 10;
          for (const d of [-1, 1]) {
            const x = c.x + d * (90 + k * 150), y = groundYAt(x, feet - 130);
            if (y !== null) land("earthSpike", x, y, "leaf", 1.3, () => hitAround(F, x, y - 50, 90, 18, -14), d < 0);
          }
          shake(6);
        }
        if (s.t === 112) { explode(c.x, c.y, 260, 20, true, 2); S.slowMs = 700; }
      } },
  };

  function startSpecial(F: Fighter, slot: number) {
    // spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"
    if (lesson(slot) >= S.match.learned) { ui.callout("Not learned yet", `Finish chapter ${lesson(slot) + 1}`); return false; }
    // An earned special takes the place of one of the first three; the greater arts are always the fighter's own.
    const def = (F.isPlayer && kit ? kit : ch(F).specials)[slot] ?? ch(F).specials[slot], kind = SK[def.kind];
    const event: Event = { type: "special", slot };
    if (!enabled(S.match, event)) { ui.callout(`Need ${specialCost(slot) / 1000} aura`, "Hold U to charge"); return false; }
    const s: SpecialState = { def, kind, p: def.p ?? {}, t: 0, dur: kind.dur };
    if (kind.start?.(F, s) === false || !send(event)) return false;
    F.special = s;
    if (F.isPlayer && S.dark && slot === proving) ui.used?.();
    F.atk = null; F.queued = null; F.charging = false; F.spin = 0;
    ui.callout(def.name);
    if (slot < 3) discover(FOUND.special + slot);
    sfx.power();
    return true;
  }

  function stepSpecial(F: Fighter) {
    const s = F.special!, b = F.body, v = b.velocity;
    s.t++;
    if (s.kind.rise && s.t < s.kind.rise) { /* let the launch carry upward */ }
    else if (s.kind.ground && F.grounded) Body.setVelocity(b, { x: 0, y: v.y });
    else { antiGravity(b); Body.setVelocity(b, { x: v.x * 0.85, y: v.y * 0.8 }); }
    F.lastVy = b.velocity.y;
    if (F.skel) s.kind.step(F, s);
    if (s.t >= s.dur) F.special = null;
  }

  function beamGeom(F: Fighter, s: SpecialState) {
    const o = handsOf(F), a = s.ang || 0, len = num(s.p.len);
    const dir = { x: F.facing * Math.cos(a), y: Math.sin(a) };
    return { o, dir, end: { x: o.x + dir.x * len, y: o.y + dir.y * len } };
  }
  function distToSeg(p: Vec, a: Vec, b: Vec) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  function beamTick(F: Fighter, s: SpecialState) {
    const g = beamGeom(F, s), width = num(s.p.width);
    for (const T of enemies.slice()) {
      if (T.alive && distToSeg(T.body.position, g.o, g.end) < width / 2 + 22) hurt(T, { dmg: num(s.p.dmg) * dmgMul(F), kx: g.dir.x * 7, ky: g.dir.y * 7 - 1.5, stun: 14, float: true, from: F.facing });
    }
    for (const c of Query.ray(loose(), g.o, g.end, width)) {
      const b = c.bodyA;
      Body.applyForce(b, b.position, { x: g.dir.x * 0.022 * b.mass, y: (g.dir.y * 0.022 - 0.004) * b.mass });
    }
    sparks(g.o.x + g.dir.x * 20, g.o.y, F.facing, 3, false, ch(F).fx);
  }

  function teleportBehind(F: Fighter) {
    const from = { x: F.body.position.x, y: F.body.position.y };
    const best = nearestEnemy(from.x, from.y, 600);
    let to: Vec;
    if (best) {
      const side = Math.sign(best.body.position.x - from.x) || F.facing;
      to = { x: best.body.position.x + side * 46, y: best.body.position.y - 4 };
      F.facing = -side;
    } else to = { x: from.x + F.facing * 160, y: from.y };
    poof(from.x, from.y, heroFx());
    Body.setPosition(F.body, to);
    Body.setVelocity(F.body, { x: 0, y: 0 });
    F.trail = [];
    poof(to.x, to.y, heroFx());
    sfx.vanish();
  }

  function spawnOrb(F: Fighter, x: number, y: number, ang: number, o: Partial<Orb> & { speed?: number } = {}) {
    const bl = F.char ? F.char.blast : { r: 9, speed: 12.5, dmg: 7 };
    const speed = o.speed ?? bl.speed;
    orbs.push({
      x, y, vx: o.vx ?? Math.cos(ang) * speed, vy: o.vy ?? Math.sin(ang) * speed, r: o.r ?? bl.r,
      dmg: (o.dmg ?? bl.dmg) * dmgMul(F), hero: F.isPlayer, big: !!o.big, radius: o.radius, g: o.g || 0, life: o.life || 90,
      color: F.isPlayer ? ch(F).orb : "#d42a1e", disc: !!o.disc, home: !!o.home, pierce: !!o.pierce, cd: new Map(), trail: [], spin: 0,
    });
    const made = orbs[orbs.length - 1], seen: Shot = { x, y, vx: made.vx, vy: made.vy, r: made.r, g: made.g, life: made.life, color: made.color, big: made.big, disc: made.disc };
    if (S.coop?.host) { if (outbox.orbs.length < 30) outbox.orbs.push(seen); }
    else if (F.isPlayer && (S.match.duel || S.coop)) ui.shot?.(seen);
  }
  function fireFrom(F: Fighter, hand: Joint, aimed?: boolean, big?: boolean) {
    const p = F.skel ? F.skel[hand] : F.body.position;
    let ang = F.facing > 0 ? 0 : Math.PI;
    if (aimed) {
      const best = nearestEnemy(p.x, p.y, 900);
      ang = best ? Math.atan2(best.body.position.y - p.y, best.body.position.x - p.x) : ang + F.facing * 0.35;
      ang += (rnd() - 0.5) * 0.25;
    } else if (!F.isPlayer) {
      // An enemy tilts its shot up or down at the fighter, by forty degrees at most: one a little above or below it is not safe.
      const to = targetOf(F)?.body.position;
      if (to) { const tilt = Math.atan2(to.y - p.y, Math.abs(to.x - p.x)); ang += F.facing * Math.max(-0.7, Math.min(0.7, tilt)); }
    }
    spawnOrb(F, p.x, p.y, ang, big ? { speed: 9, r: 24, dmg: 24, big: true, life: 140 } : {});
    if (F.isPlayer || (S.hero && Math.abs(p.x - S.hero.body.position.x) < 700)) ui.sample?.("blast");
  }
  function fan(F: Fighter, n: number, spread: number) {
    const p = handsOf(F), base = F.facing > 0 ? 0 : Math.PI;
    for (let i = 0; i < n; i++) spawnOrb(F, p.x, p.y, base + (i / (n - 1) - 0.5) * 2 * spread, { speed: 13, dmg: 8 });
    sfx.zap();
  }

  function stepOrbs() {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.trail.push({ x: o.x, y: o.y }); if (o.trail.length > 6) o.trail.shift();
      if (o.g) o.vy += o.g;
      if (o.home) {
        const returning = o.life < 70;
        const tgt = returning ? (S.hero && S.hero.alive ? S.hero.body.position : null) : nearestEnemy(o.x, o.y, 900)?.body.position;
        if (tgt) {
          const want = Math.atan2(tgt.y - o.y, tgt.x - o.x), cur = Math.atan2(o.vy, o.vx);
          let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
          const na = cur + Math.max(-0.13, Math.min(0.13, d)), sp = Math.hypot(o.vx, o.vy);
          o.vx = Math.cos(na) * sp; o.vy = Math.sin(na) * sp;
          if (returning && Math.hypot(tgt.x - o.x, tgt.y - o.y) < 30) { orbs.splice(i, 1); continue; }
        }
      }
      o.x += o.vx; o.y += o.vy; o.life--; o.spin += 0.45;
      if (o.ghost) { if (o.life <= 0 || o.y > S.voidY || Query.point(statics, { x: o.x, y: o.y }).length > 0) { burst(o.x, o.y, o.big ? 40 : 16, o.color); orbs.splice(i, 1); } continue; }
      const hb = box(o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r);
      if (o.pierce) {
        for (const T of enemies.slice()) {
          if (!T.alive || !overlaps(hb, T.body.bounds) || (o.cd.get(T) || 0) > stepCount) continue;
          o.cd.set(T, stepCount + 20);
          hurt(T, { dmg: o.dmg, kx: Math.sign(o.vx) * 4, ky: -3, stun: 16, float: true, from: Math.sign(o.vx) || 1 });
          burst(o.x, o.y, 14, o.color); sfx.hit(false); ui.sample?.("bolt");
        }
        for (const b of Query.region(loose(), hb)) Body.applyForce(b, b.position, { x: Math.sign(o.vx) * 0.01 * b.mass, y: -0.006 * b.mass });
        if (o.life <= 0) orbs.splice(i, 1);
        continue;
      }
      let hit = Query.point(statics, { x: o.x, y: o.y }).length > 0 || Query.region(loose(), hb).length > 0;
      // Landing on a fighter is heard as well as seen; a wall only stops it.
      const landed = (o.hero ? enemies : heroTargets()).some((T) => T.alive && overlaps(hb, hurtBox(T)));
      if (landed) { hit = true; ui.sample?.("bolt"); }
      if (hit) { explode(o.x, o.y, o.radius || (o.big ? 120 : 46), o.dmg, o.hero, o.big ? 1.7 : 1, false, o.color); orbs.splice(i, 1); }
      else if (o.life <= 0 || o.y > S.voidY) orbs.splice(i, 1);
    }
  }

  /** Radial damage and force; quiet skips the sound for the Overdrive shove. */
  function explode(x: number, y: number, r: number, dmg: number, heroSide: boolean, k: number, quiet?: boolean, color?: string) {
    for (const T of heroSide ? enemies.slice() : heroTargets()) {
      if (!T.alive) continue;
      const c = T.body.position, dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy);
      if (d > r + 24) continue;
      const dir = Math.sign(dx) || (rnd() < 0.5 ? -1 : 1);
      hurt(T, { dmg, kx: dir * 5.5 * k, ky: -3.5 * k - (dy < 0 ? 2 : 0), stun: 24, heavy: k > 1.2, from: dir });
    }
    for (const b of Query.region(loose(), box(x - r, y - r, x + r, y + r))) {
      const dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > r) continue;
      const f = 0.045 * k * (1 - d / r);
      Body.applyForce(b, b.position, { x: (dx / d) * f * b.mass, y: ((dy / d) * f - 0.01 * k) * b.mass });
    }
    const fx = heroSide ? heroFx() : "212,42,30";
    burst(x, y, r * 0.55, color || (heroSide ? ch(hero()).orb : "#d42a1e"));
    for (let i = 0; i < r / 4; i++) {
      const a = rnd() * Math.PI * 2, s = 2 + rnd() * 6 * k;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 24, max: 24, size: 2 + rnd() * 3, color: rnd() < 0.5 ? fx : "17,17,17", heavy: true });
    }
    const tone = heroSide ? toneOf(S.hero) : "enemy";
    play("boom", x, y, tone, Math.max(0.6, r / 110));
    if (k > 1.2 && !quiet) play("ring", x, y + r * 0.25, tone, Math.max(0.8, r / 200));
    shake(Math.min(18, 6 * k)); if (k > 1.2) punch(0.06);
    if (!quiet) { sfx.boom(k > 1.2); if (k > 1.2) rings.push({ x, y, r: 10, max: r, life: 16 }); }
  }

  function shockwave(x: number, y: number, r: number, dmg: number) {
    rings.push({ x, y, r: 10, max: r, life: 14, flat: true });
    for (const T of enemies.slice()) {
      const c = T.body.position;
      if (T.alive && Math.abs(c.x - x) < r && Math.abs(T.body.bounds.max.y - y) < 40) hurt(T, { dmg: dmg * dmgMul(hero()), kx: Math.sign(c.x - x) * 5, ky: -7, stun: 30, from: Math.sign(c.x - x) });
    }
    dust(x, y, 16, 0);
    play("slam", x, y, toneOf(S.hero), r / 200);
    shake(11); punch(0.04);
    sfx.boom(false);
  }

  // ---------- effect entities ----------
  function pillar(x: number, y: number, F: Fighter) {
    effects.push({ kind: "pillar", x, y, t: 0, step() {
      this.t++;
      if (this.t === 4) {
        for (const T of enemies.slice()) {
          const b = T.body.bounds;
          if (T.alive && Math.abs(T.body.position.x - x) < 40 && b.max.y > y - 280 && b.min.y < y + 10) hurt(T, { dmg: 15 * dmgMul(F), kx: F.facing * 2, ky: -12, stun: 30, float: true, heavy: true, from: F.facing });
        }
        for (const b of Query.region(loose(), box(x - 40, y - 280, x + 40, y))) Body.applyForce(b, b.position, { x: 0, y: -0.05 * b.mass });
        play("flame", x, y, "fire");
        shake(6); sfx.boom(false);
      }
      if (this.t % 2 === 0) particles.push({ x: x + (rnd() - 0.5) * 40, y: y - rnd() * 200, vx: 0, vy: -3, life: 18, max: 18, size: 4, color: "255,122,26" });
      return this.t < 30;
    } });
  }

  function quakeWave(x: number, y: number, dir: number, F: Fighter) {
    const hit = new Set<Fighter>();
    let dist = 0;
    effects.push({ kind: "quake", x, y, dir, step() {
      this.x += dir * 13; dist += 13;
      const ny = groundYAt(this.x, this.y - 70);
      if (ny === null || Math.abs(ny - this.y) > 80 || dist > 820) return false;
      this.y = ny;
      for (const T of enemies.slice()) {
        if (!T.alive || hit.has(T) || Math.abs(T.body.position.x - this.x) > 34 || Math.abs(T.body.bounds.max.y - this.y) > 60) continue;
        hit.add(T);
        hurt(T, { dmg: 16 * dmgMul(F), kx: dir * 3, ky: -13, stun: 36, float: true, heavy: true, from: dir });
      }
      for (const b of Query.region(loose(), box(this.x - 30, this.y - 60, this.x + 30, this.y))) Body.applyForce(b, b.position, { x: dir * 0.01 * b.mass, y: -0.04 * b.mass });
      if (dist % 26 === 0) { particles.push({ x: this.x, y: this.y, vx: (rnd() - 0.5) * 3, vy: -4 - rnd() * 4, life: 26, max: 26, size: 5, color: "17,17,17", heavy: true }); shake(3); }
      return true;
    } });
  }

  function cyclone(F: Fighter) {
    const vx = F.facing * 4.2, caught = new Set<Fighter>();
    const x0 = F.body.position.x + F.facing * 80;
    let t = 0;
    effects.push({ kind: "cyclone", x: x0, y: groundYAt(x0, F.body.bounds.max.y - 40) ?? F.body.bounds.max.y, step() {
      t++; this.x += vx;
      const ny = groundYAt(this.x, this.y - 60); if (ny !== null && Math.abs(ny - this.y) < 90) this.y = ny;
      const y = this.y;
      for (const T of enemies.slice()) {
        const p = T.body.position;
        if (!T.alive || Math.abs(p.x - this.x) > 46 || p.y < y - 240 || p.y > y + 10) continue;
        caught.add(T);
        T.stun = Math.max(T.stun, 8); T.floatT = Math.max(T.floatT, 8); T.atk = null;
        Body.setVelocity(T.body, { x: vx + (this.x - p.x) * 0.15, y: ((y - 120 + Math.sin(S.time * 8 + T.body.id) * 40) - p.y) * 0.15 });
        if (t % 9 === 0) hurt(T, { dmg: 5 * dmgMul(F), kx: vx, ky: -2, stun: 12, float: true, from: F.facing });
      }
      for (const b of Query.region(loose(), box(this.x - 46, y - 240, this.x + 46, y))) Body.applyForce(b, b.position, { x: (this.x - b.position.x) * 0.0002 * b.mass, y: -0.0016 * b.mass });
      if (rnd() < 0.6) particles.push({ x: this.x + (rnd() - 0.5) * 60, y: y - rnd() * 220, vx: vx + (rnd() - 0.5) * 4, vy: -2, life: 20, max: 20, size: 3, color: "81,207,102" });
      if (t >= 140) {
        for (const T of caught) if (T.alive) hurt(T, { dmg: 8 * dmgMul(F), kx: F.facing * 6, ky: -10, stun: 26, heavy: true, from: F.facing });
        return false;
      }
      return true;
    } });
  }

  function echoClone(F: Fighter, dir: number) {
    const x0 = F.body.position.x, y = F.body.position.y, hit = new Set<Fighter>();
    effects.push({ kind: "echo", x: x0, y, t: 0, dir, trail: [], skin: F.skin, step() {
      this.t++;
      this.x = x0 + dir * 780 * smooth(Math.min(1, this.t / 34));
      this.trail.push(this.x); if (this.trail.length > 6) this.trail.shift();
      const area = box(this.x - 24, y - 44, this.x + 24, y + 44);
      for (const T of enemies.slice()) {
        if (!T.alive || hit.has(T) || !overlaps(area, T.body.bounds)) continue;
        hit.add(T);
        hurt(T, { dmg: 16 * dmgMul(F), kx: dir * 10, ky: -7, stun: 30, heavy: true, from: dir });
        burst(T.body.position.x, T.body.position.y - 20, 22, ch(F).orb); sfx.hit(true);
      }
      for (const b of Query.region(loose(), area)) Body.applyForce(b, b.position, { x: dir * 0.03 * b.mass, y: -0.02 * b.mass });
      return this.t < 40;
    } });
  }

  function bolt(x1: number, y1: number, x2: number, y2: number, color: string, width = 7) {
    const pts: Vec[] = [];
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      pts.push({ x: x1 + (x2 - x1) * t + (i && i < 9 ? (rnd() - 0.5) * 34 : 0), y: y1 + (y2 - y1) * t });
    }
    effects.push({ kind: "bolt", pts, life: 10, color, width, step() { return --this.life > 0; } });
  }
  function strikeBolt(T: Fighter, dmg: number, big?: boolean) {
    const p = T.body.position;
    bolt(p.x + (rnd() - 0.5) * 60, big ? S.camY - 40 : p.y - 180, p.x, p.y, ch(hero()).aura, big ? 9 : 6);
    play("zap", p.x, p.y, toneOf(S.hero), big ? 1.4 : 1);
    hurt(T, { dmg, kx: 0, ky: -5, stun: 34, heavy: true, from: hero().facing });
    sfx.zap();
    if (big) S.flashT = Math.max(S.flashT, 6);
  }

  // ---------- combat ----------
  function resolveHits(F: Fighter) {
    const a = F.atk; if (!a || !F.skel) return;
    const t = a.t / a.def.dur;
    if (t < a.def.active[0] || t > a.def.active[1]) return;
    const [effName, jointName] = a.def.effAt ? a.def.effAt(t) : a.def.eff!;
    const eff = F.skel[effName], joint = F.skel[jointName], r = 13;
    const reach = box(Math.min(eff.x, joint.x) - r, Math.min(eff.y, joint.y) - r, Math.max(eff.x, joint.x) + r, Math.max(eff.y, joint.y) + r);
    let landed = false, onFighter = false;

    for (const b of Query.region(F.isPlayer ? loose() : props, reach)) {
      if (a.hit.has(b.id)) continue;
      a.hit.add(b.id);
      const [fx, fy] = a.def.power;
      Body.applyForce(b, { x: eff.x, y: eff.y }, { x: F.facing * fx * b.mass, y: fy * b.mass });
      landed = true;
    }
    for (const T of F.isPlayer ? enemies.slice() : heroTargets()) {
      if (!T.alive || a.hit.has(T) || !overlaps(reach, hurtBox(T))) continue;
      a.hit.add(T);
      const dmg = F.isPlayer ? a.def.dmg * dmgMul(F) * F.pow : Math.round(a.def.dmg * 0.6 * F.pow);
      hurt(T, { dmg, kx: F.facing * a.def.knock[0], ky: a.def.knock[1], stun: a.def.stun, heavy: a.def.heavy, float: a.def.float, from: F.facing });
      if (F.isPlayer) {
        // spec/app/index.md, "A clean hit on an enemy gives 3 aura, or 4.5 to Ink"
        send({ type: "connect" });
        elementHit(F, T, eff);
        if (a.def.onHitT && T.alive) a.def.onHitT(F, T);
      }
      landed = onFighter = true;
    }
    if (!landed) return;
    const plain = !F.isPlayer || ch(F).element === "ink";
    // Feedback in proportion to the blow: a jab barely stops the fight, a heavy hit freezes it for an instant.
    hitstop = Math.min(FREEZE_MAX, Math.max(hitstop, a.def.stop));
    shake(a.def.heavy ? 10 : 3);
    if (a.def.heavy && onFighter) punch(0.04);
    burst(eff.x, eff.y, a.def.heavy ? 26 : 17, onFighter ? (plain ? "#d42a1e" : ch(F).orb) : "#ffffff");
    sparks(eff.x, eff.y, F.facing, a.def.heavy ? 14 : 8, onFighter, plain ? null : ch(F).fx);
    // The spark stands on a floor twenty of its pixels under the blow.
    if (onFighter) play(a.def.heavy ? "crit" : "spark", eff.x, eff.y + (a.def.heavy ? 47 : 36), toneOf(F), 1, F.facing < 0);
    sfx.hit(!!a.def.heavy, F.isPlayer ? S.match.combo : 1);
  }

  /** Falling onto an enemy from above squashes it, bounces the fighter back up and gives its air jumps back. */
  function stomp(F: Fighter) {
    if (F.grounded || F.body.velocity.y <= 2 || F.atk || F.dash || F.climb || F.flying) return;
    const feet = F.body.bounds.max.y, bb = F.body.bounds;
    for (const E of enemies.slice()) {
      const eb = E.body.bounds;
      // The feet are between the top of its head and a little under its middle.
      if (!E.alive || bb.max.x < eb.min.x || bb.min.x > eb.max.x || feet < eb.min.y - 2 || feet > E.body.position.y + 7) continue;
      hurt(E, { dmg: 8 * dmgMul(F) * F.pow, kx: F.facing * 1.5, ky: 3, stun: 30, heavy: true, from: F.facing });
      E.squash = -0.5;
      launch(F, F.body.velocity.x, -12);
      F.airJumps = F.airJumpsMax;
      hitstop = Math.max(hitstop, 5); shake(6); punch(0.05);
      play("spark", E.body.position.x, eb.min.y + 36, toneOf(F));
      dust(E.body.position.x, eb.max.y, 6, 0);
      sfx.hit(true, S.match.combo); ui.rumble?.(0.6, 80);
      return;
    }
  }

  /** Each fighter's element adds its own twist to every melee hit. */
  function elementHit(F: Fighter, T: Fighter, at: Vec) {
    switch (ch(F).element) {
      case "fire": T.burn = 120; break;
      case "water":
        if (T.alive) Body.setVelocity(T.body, { x: T.body.velocity.x * 1.35, y: T.body.velocity.y });
        rings.push({ x: at.x, y: at.y, r: 6, max: 34, life: 10 });
        break;
      case "volt":
        T.stun += 8;
        bolt(at.x + (rnd() - 0.5) * 30, at.y - 70, at.x, at.y, ch(F).aura, 4);
        break;
      case "leaf":
        T.floatT = Math.max(T.floatT, 20);
        for (let i = 0; i < 5; i++) particles.push({ x: at.x, y: at.y, vx: (rnd() - 0.5) * 5, vy: -rnd() * 3, life: 30, max: 30, size: 4, color: "81,207,102" });
        break;
    }
  }

  /** Every source of damage goes through here: melee, orbs, beams, specials, shockwaves. */
  function hurt(T: Fighter, o: Hurt) {
    if (!T.alive || T.shade) return;
    if (T === S.hero && steered) ui.landed?.(o);
    // A Ward Charm turns every blow while it lasts.
    if (T.isPlayer && S.warded > 0) { T.flash = 4; rings.push({ x: T.body.position.x, y: T.body.position.y, r: 20, max: 60, life: 10 }); ui.sample?.("shieldHit"); return; }
    if (T.isPlayer && S.guard > 0) {
      guardLeft -= o.dmg;
      ui.sample?.("shieldHit"); T.flash = 4; shake(4);
      if (guardLeft <= 0) { guardLeft = GUARD; guardCool = 180; S.guard = 0; T.stun = 30; floaters.push({ x: T.body.position.x, y: T.body.position.y - 80, text: "GUARD BROKEN", life: 40, red: true }); }
      else { send({ type: "suffer", damage: Math.max(1, Math.round(o.dmg * 0.2)), heavy: false }); if (!T.alive) knockOutHero({ x: 0, y: -6 }); }
      return;
    }
    // Another player's fighter: this game only reports the blow. Theirs takes the health and the push. A teammate is
    // struck only by the host's enemies (no blow of a player's reaches one), and that is no combo of this player's.
    // Co-op: a stand-in for the host's enemy. The host's game takes the blow; here it flinches, and the combo counts.
    if (T.remote) {
      ui.foeHit?.(T.uid, o);
      T.flash = 8; T.stun = Math.max(T.stun, 6);
      send({ type: "tally", chained: sinceHit < COMBO_STEPS });
      sinceHit = 0;
      if (S.match.combo >= 2) floaters.push({ x: T.body.position.x, y: T.body.position.y - 70, text: S.match.combo + " HIT", life: 36 });
      return;
    }
    if (T.peer) {
      ui.strike?.(T.peer.id, o);
      T.flash = 8;
      if (S.coop) return;
      send({ type: "tally", chained: sinceHit < COMBO_STEPS });
      sinceHit = 0;
      if (S.match.combo >= 2) floaters.push({ x: T.body.position.x, y: T.body.position.y - 70, text: S.match.combo + " HIT", life: 36 });
      return;
    }
    // In a duel a blow throws its target further the less health it has: up to two and a half times as far on the last of it.
    // A boss is too big to throw: a quarter of the push, and it does not stay stunned.
    if (T.big > 1) o = { ...o, kx: o.kx * 0.25, ky: o.ky * 0.25, stun: 6, float: false };
    if (S.match.duel) { const far = 1 + 1.5 * (1 - Math.max(0, T.hp) / T.maxHp); o = { ...o, kx: o.kx * far, ky: o.ky * far }; }
    // spec/app/index.md, "Being hit costs health and gives 3 aura; a hit that takes the last health is a knockout"
    if (T.isPlayer) { if (!send({ type: "suffer", damage: Math.max(1, Math.round(o.dmg)), heavy: !!o.heavy })) return; }
    // What stands in the black room is there to be struck, and stays standing.
    else T.hp = S.dark ? Math.max(1, T.hp - o.dmg) : T.hp - o.dmg;
    T.stun = o.stun || (o.heavy ? 26 : 16);
    T.floatT = o.float ? 22 : 0;
    T.flash = 8;
    T.facing = -(o.from || 1);
    T.atk = null; T.spin = 0; T.charging = false;
    T.squash = o.heavy ? -0.32 : -0.16;
    Body.setVelocity(T.body, { x: o.kx, y: o.ky });
    const vel = { x: o.kx * 1.5, y: o.ky * 1.2 - 4 };
    if (T.isPlayer) {
      sfx.hurt();
      if (!T.alive) knockOutHero(vel);
      return;
    }
    // spec/app/index.md, "Every hit on an enemy is counted, and hits that follow closely build a combo"
    // A teammate's blow (co-op, `hitFoe`) counts in its own game, not here.
    if (!byOther) {
      send({ type: "tally", chained: sinceHit < COMBO_STEPS });
      sinceHit = 0;
      if (S.match.combo >= 2) floaters.push({ x: T.body.position.x, y: T.body.position.y - 70, text: S.match.combo + " HIT", life: 36 });
    }
    if (T.hp <= 0) knockOutEnemy(T, vel, !!o.heavy);
  }

  function leaveWorld(T: Fighter, vel: Vec) {
    Composite.remove(world, T.body);
    if (T.skel) ragdolls.push({ ...makeRagdoll(T.skel, vel, T.skin), cast: T.cast });
    sfx.ko();
  }
  function knockOutHero(vel: Vec) {
    leaveWorld(hero(), vel);
    heroInWorld = false;
    // One way down, whatever caused it: a red flash and a red poof, the music muffled, the hardest shake, and
    // eight tenths of a second of slow motion.
    fallen();
    heroDeadTimer = 150; play("puff", hero().body.position.x, hero().body.bounds.max.y, "enemy", 1.3);
    hero().special = null;
  }
  function fallen() {
    ui.banner("K.O.", "red"); ui.duck?.(true);
    S.deathMs = 800; S.red = 30; shake(18); punch(0.18);
  }
  // spec/app/index.md, "Only an enemy in the arena can be knocked out, and each one counts"
  function removeEnemy(T: Fighter) {
    T.alive = false;
    const i = enemies.indexOf(T); if (i >= 0) enemies.splice(i, 1);
    send({ type: "fell" });
  }
  function knockOutEnemy(T: Fighter, vel: Vec, heavy: boolean) {
    if (!T.alive) return;
    leaveWorld(T, vel);
    removeEnemy(T);
    // Knockouts in quick succession count up, as the combo does.
    streak = sinceKo < COMBO_STEPS ? streak + 1 : 1; sinceKo = 0;
    floaters.push({ x: T.body.position.x, y: T.body.position.y - 90, text: streak > 1 ? `K.O. +1 x${streak}` : "K.O. +1", life: 36, red: true });
    play("puff", T.body.position.x, T.body.bounds.max.y, "enemy");
    if (heavy || enemies.length === 0) S.slowMs = Math.max(S.slowMs, enemies.length === 0 ? 900 : 450);
    if (T.boss) fall(T);
    leave(T);
  }

  // spec/app/index.md, "Something used from the bag heals, up to full health"
  /** A foe sometimes leaves something behind as it falls, and a level's boss always leaves two, one of them a draught. Not in a duel. */
  function leave(T: Fighter) {
    // Nor in a run the arena server plays: a paid run is fought with what the fighter brings.
    if (S.match.duel || T.peer || steered) return;
    const n = T.boss ? 2 : rnd() < 0.24 ? 1 : 0, all = Object.keys(ITEMS) as ItemId[], total = all.reduce((sum, id) => sum + ITEMS[id].weight, 0);
    for (let i = 0; i < n; i++) {
      let roll = rnd() * total, item = all[0];
      for (const id of all) { roll -= ITEMS[id].weight; if (roll <= 0) { item = id; break; } }
      drops.push({ x: T.body.position.x + (i - (n - 1) / 2) * 50, y: T.body.position.y - 30, vy: -7, item: T.boss && i === 0 ? "draught" : item, life: 60 * 25 });
    }
  }
  /** Drops fall to the ground, and the fighter picks up what it touches, if the bag has room for it. */
  function stepDrops() {
    const H = S.hero;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy = Math.min(d.vy + 0.45, 14);
      const floor = groundYAt(d.x, d.y - 4);
      if (floor !== null && d.y + d.vy >= floor - 14) { d.y = floor - 14; d.vy = 0; } else d.y += d.vy;
      if (--d.life <= 0 || d.y > 3000) { drops.splice(i, 1); continue; }
      if (!H?.alive || Math.hypot(H.body.position.x - d.x, H.body.position.y - d.y) > 64) continue;
      const held = S.bag.find((each) => each.item === d.item);
      if (held && held.count >= 3) continue;
      if (held) held.count++; else S.bag.push({ item: d.item, count: 1 });
      drops.splice(i, 1);
      floaters.push({ x: d.x, y: d.y - 40, text: "+ " + ITEMS[d.item].name.toUpperCase(), life: 46 });
      if (!shown.has(d.item)) { shown.add(d.item); ui.callout(ITEMS[d.item].name, `${ITEMS[d.item].says} · T to use, R to choose`); }
      sfx.vanish();
    }
  }
  /** The items whose use has been told, once each a fight. */
  const shown = new Set<ItemId>();
  /** What each item does as it is used; false if it cannot be used just now. */
  const USE: Record<ItemId, (H: Fighter) => boolean> = {
    draught(H) {
      if (S.match.hp >= full(S.match)) { ui.callout("Already at full health"); return false; }
      if (!send({ type: "heal", amount: 35 })) return false;
      play("bloom", H.body.position.x, H.body.bounds.max.y, "leaf", 1.2);
      floaters.push({ x: H.body.position.x, y: H.body.position.y - 90, text: "+35", life: 50 });
      sfx.power();
      return true;
    },
    vial(H) {
      if (S.match.aura >= fullAura || S.match.overdrive > 0) { ui.callout("Aura is already full"); return false; }
      // spec/app/index.md, "Charging adds three quarters of a point of aura each step, up to full"
      if (!send({ type: "charge", steps: 67 })) return false;
      rings.push({ x: H.body.position.x, y: H.body.position.y, r: 10, max: 130, life: 20 });
      play("ring", H.body.position.x, H.body.position.y + 20, toneOf(H), 0.8);
      sfx.power();
      return true;
    },
    bomb(H) {
      const h = handsOf(H);
      spawnOrb(H, h.x, h.y - 10, 0, { vx: H.facing * 9.5 + H.body.velocity.x * 0.5, vy: -9, g: 0.42, r: 14, big: true, radius: 190, dmg: 34, life: 220 });
      ui.sample?.("blast");
      return true;
    },
    ward(H) {
      S.warded = 300;
      const circle = play("runeCircle", H.body.position.x, H.body.bounds.max.y, toneOf(H), 1.4);
      each(300, (t) => { circle.x = H.body.position.x; circle.y = H.body.bounds.max.y; if (t % 90 === 0) circle.age = 0; if (t % 24 === 0) rings.push({ x: H.body.position.x, y: H.body.position.y, r: 30, max: 70, life: 16 }); });
      sfx.power();
      return true;
    },
    haste(H) {
      S.hasted = 480;
      play("surge", H.body.position.x, H.body.position.y, toneOf(H), 0.8);
      sfx.power();
      return true;
    },
    scroll(H) {
      const foes = foesNear(H, 1300, 10);
      if (!foes.length) { ui.callout("No one in range"); return false; }
      foes.forEach((T, i) => later(1 + i * 5, () => { if (T.alive) strikeBolt(T, 22, true); }));
      S.flashT = Math.max(S.flashT, 10);
      return true;
    },
  };
  /** Uses what is chosen in the bag, if the fighter is free to. */
  function useItem() {
    const H = hero(), held = S.bag[S.chosen];
    if (!held || !H.alive || H.special || !USE[held.item](H)) return;
    ui.callout(ITEMS[held.item].name);
    if (--held.count === 0) { S.bag.splice(S.chosen, 1); S.chosen = Math.min(S.chosen, Math.max(0, S.bag.length - 1)); }
  }

  /** What is still to come of a boss's fall: its blasts, each after so many steps (`stepQuest`). */
  const blasts: (Vec & { wait: number })[] = [];
  /** A boss's fall is the loudest moment of its level: time all but stops, the room whitens and shakes, it goes up
   *  in a string of blasts from its feet to its head, and those who stood with it fall too. */
  function fall(T: Fighter) {
    const at = T.body.position, top = T.body.bounds.min.y, feet = T.body.bounds.max.y;
    S.slowMs = 1600; S.flashT = 26; shake(20); punch(0.14); sfx.boom(true);
    play("boom", at.x, at.y, "enemy", 2.4); play("quake", at.x, feet, "enemy", 2);
    rings.push({ x: at.x, y: at.y, r: 30, max: 520, life: 50 });
    for (let i = 1; i <= 5; i++) blasts.push({ wait: i * 8, x: at.x + (rnd() - 0.5) * 100, y: feet - (feet - top) * (i / 6) });
    ui.banner("Fallen", "gold"); ui.callout(T.tag ?? "The guardian", "The way out is open");
    for (const E of enemies.slice()) if (E.final) knockOutEnemy(E, { x: (rnd() - 0.5) * 8, y: -9 }, false);
  }

  /** A ragdoll built from the fighter's last pose, so the fall picks up exactly where the hit landed. */
  function makeRagdoll(sk: Skeleton, vel: Vec, skin: Skin): Ragdoll {
    const group = Body.nextGroup(true);
    const opts = { collisionFilter: { group, category: CAT.rag, mask: CAT.world | CAT.prop | CAT.rag }, friction: 0.7, frictionAir: 0.012, restitution: 0.15, density: 0.0012 };
    const seg = (a: Vec, b: Vec, thick: number) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const body: B = Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, thick, len, opts);
      Body.setAngle(body, Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2);
      body.len = len; return body;
    };
    const torso = seg(sk.hip, sk.shoulder, 7);
    const head: B = Bodies.circle(sk.head.x, sk.head.y, 10, { ...opts, density: 0.0009 });
    const uF = seg(sk.shoulder, sk.elbowF, 5), lF = seg(sk.elbowF, sk.fistF, 5);
    const uB = seg(sk.shoulder, sk.elbowB, 5), lB = seg(sk.elbowB, sk.fistB, 5);
    const tF = seg(sk.hip, sk.kneeF, 6), sF = seg(sk.kneeF, sk.footF, 6);
    const tB = seg(sk.hip, sk.kneeB, 6), sB = seg(sk.kneeB, sk.footB, 6);
    const parts = [torso, head, uF, lF, uB, lB, tF, sF, tB, sB];
    const pin = (A: B, Bb: B, J: Vec) => Constraint.create({
      bodyA: A, pointA: { x: J.x - A.position.x, y: J.y - A.position.y },
      bodyB: Bb, pointB: { x: J.x - Bb.position.x, y: J.y - Bb.position.y },
      length: 0, stiffness: 0.85, damping: 0.1,
    });
    const neck = { x: sk.shoulder.x + (sk.head.x - sk.shoulder.x) * 0.35, y: sk.shoulder.y + (sk.head.y - sk.shoulder.y) * 0.35 };
    const cons = [
      pin(torso, head, neck), pin(torso, uF, sk.shoulder), pin(uF, lF, sk.elbowF), pin(torso, uB, sk.shoulder), pin(uB, lB, sk.elbowB),
      pin(torso, tF, sk.hip), pin(tF, sF, sk.kneeF), pin(torso, tB, sk.hip), pin(tB, sB, sk.kneeB),
    ];
    for (const p of parts) {
      Body.setVelocity(p, { x: vel.x + (rnd() - 0.5) * 2, y: vel.y + (rnd() - 0.5) * 2 });
      Body.setAngularVelocity(p, (rnd() - 0.5) * 0.3);
    }
    Composite.add(world, [...parts, ...cons]);
    return { parts, cons, head, skin, cast: null, life: 540 };
  }
  const dropRagdoll = (r: Ragdoll) => Composite.remove(world, [...r.parts, ...r.cons]);

  function stepRagdolls() {
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      const r = ragdolls[i];
      r.life--;
      if (r.life <= 0 || r.parts.every((p) => p.position.y > S.voidY)) { dropRagdoll(r); ragdolls.splice(i, 1); }
    }
  }

  /** An enemy of the current wave at (x, y), facing the hero. */
  function enemyAt(x: number, y: number, caster: boolean, kind?: CastId) {
    const foe = kind ? FOES[kind] : { hp: 1, spd: 1, pow: 1 };
    const E = makeFighter(x, y, false, Math.round((26 + S.match.wave * 6) * foe.hp), null);
    E.cast = kind ?? null; E.spd = foe.spd; E.pow = foe.pow; E.uid = ++uids;
    E.facing = Math.sign(hero().body.position.x - x) || 1;
    E.cool = 50 + rnd() * 40;
    // Its own special (foeArt) not before it has been in the fight a while.
    E.artCool = 180 + rnd() * 240;
    if (caster) { E.caster = true; E.color = "#4d4d4a"; E.skin = CASTER_SKIN; E.cool = 90; }
    enemies.push(E);
  }

  /** A boss stands as tall as four fighters in a room built for one. Whatever rises above the floor of its room lets it
   *  through, so that it is never wedged where it arrives and its rush carries; the floor holds it up and the room's
   *  bounds hold it in (`stepQuest`). */
  function clearWay(E: Fighter) {
    const room = S.bossRoom, feet = E.body.bounds.max.y;
    if (!room) return;
    E.body.collisionFilter = { ...E.body.collisionFilter, category: CAT.boss };
    for (const b of statics) if (b.bounds.min.y < feet - 6 && b.bounds.max.x > room[0] && b.bounds.min.x < room[2] && b.bounds.max.y > room[1] && b.bounds.min.y < room[3]) b.collisionFilter.mask = 0xffff & ~CAT.boss;
  }

  // spec/app/index.md, "Enemies of a wave arrive one at a time"
  // Dropped onto islands near the hero, never right on top of them.
  function spawnEnemy() {
    if (!send({ type: "arrive" })) return;
    const at = dropSpot();
    enemyAt(at.x, at.y, S.match.wave >= 3 && rnd() < 0.35);
  }
  /** Somewhere above an island near the fighter, never right on top of it: where an enemy is let fall from. */
  function dropSpot(): Vec {
    const hx = hero().body.position.x;
    const grounds = statics.filter((s) => s.label === "ground" && s.bounds.max.x > hx - 900 && s.bounds.min.x < hx + 900);
    let x = hx + 300, top = GROUND_TOP;
    for (let tries = 0; tries < 12 && grounds.length; tries++) {
      const s = grounds[Math.floor(rnd() * grounds.length)];
      x = s.bounds.min.x + 40 + rnd() * (s.bounds.max.x - s.bounds.min.x - 80);
      top = s.bounds.min.y;
      if (Math.abs(x - hx) > 220 && Math.abs(x - hx) < 950) break;
    }
    return { x, y: top - 520 };
  }

  // spec/app/index.md, "Only a knocked-out fighter revives, with full health and at least 40 aura"
  let told = false, start: Vec = { ...SPAWN }, outside: Vec = { ...SPAWN }, knocked = -9, fought = false, bossName: string | null = null, proving = -1, bossUp = false, answered: "defied" | "reasoned" | null = null, visitor: (Vec & { met: boolean }) | null = null, kit: SpecialDef[] | null = null, skills: Build = UNBUILT, tired = 0;
  // Again on the stage the fight was on (levels.ts, `survivalStage`).
  function again() { if (send({ type: "retry" })) { begin(S.level); ui.banner("Wave 1", "red"); } }
  function respawnHero() {
    // spec/app/index.md, "A fighter knocked out against the waves starts over from the first"
    // The page may want to show where the fight stands among everyone's before it starts over: it is told once, and waits.
    if (!S.match.quest && !S.match.duel) { if (!ui.lost) again(); else if (!told) { told = true; ui.lost(S.match.wave, S.match.kos); } return; }
    if (!send({ type: "revive" })) return;
    rise();
  }
  // spec/app/index.md, "Only a knocked-out fighter revives, with full health and at least 40 aura"
  // spec/app/index.md, "A fighter out of lives on a quest can be let off once, and goes on with its last life"
  // Co-op (docs/coop-plan.md): two lives and the Reaper's letting-off are the three times a fighter can be brought back,
  // each by a teammate standing by it for two and a half seconds; with none left it is out, and watches. When the
  // whole group is down at once the level is lost.
  let wipeT = 0;
  const canRise = () => enabled(S.match, { type: "revive" }) || enabled(S.match, { type: "bargain" });
  function stepDown() {
    const H = hero();
    if (!S.down) S.down = { x: H.body.position.x, y: H.body.bounds.max.y, held: 0, out: !canRise() };
    const D = S.down, by = allies.some((F) => F.alive && Math.hypot(F.body.position.x - D.x, F.body.bounds.max.y - D.y) < 120);
    if (!D.out) D.held = by ? Math.min(1, D.held + 1 / 150) : Math.max(0, D.held - 1 / 300);
    if (D.held >= 1) { riseHere(); return; }
    if (allies.every((F) => !F.alive)) { if (++wipeT === 90) ui.wiped?.(); } else wipeT = 0;
  }
  /** Brought back by a teammate: on its feet where it fell, with one revive fewer left. */
  function riseHere() {
    const D = S.down;
    if (!D || !(send({ type: "revive" }) || send({ type: "bargain" }))) return;
    S.down = null; wipeT = 0;
    Object.assign(hero(), { stun: 0, atk: null, trail: [], special: null, burn: 0, dash: null, climb: 0, refundT: 0 });
    Body.setPosition(hero().body, { x: D.x, y: D.y - 50 }); Body.setVelocity(hero().body, { x: 0, y: 0 });
    Composite.add(world, hero().body); heroInWorld = true;
    hero().squash = -0.5; ui.duck?.(false); sfx.power();
    play("ring", D.x, D.y, toneOf(hero()), 0.9); rings.push({ x: D.x, y: D.y - 40, r: 20, max: 160, life: 24 });
    const left = S.match.lives - 1 + (S.match.spared ? 0 : 1);
    ui.callout("Back on your feet", left > 0 ? `${left} revive${left === 1 ? "" : "s"} left` : "No revives left");
  }
  function bargain() { if (send({ type: "bargain" })) rise(); }
  /** Stands the fighter up again where a fighter that comes back starts. */
  function rise() {
    if (S.match.duel) ui.sample?.("respawn");
    Object.assign(hero(), { stun: 0, atk: null, trail: [], special: null, burn: 0, dash: null, climb: 0, refundT: 0 });
    // On a quest a life lost sends the fighter back to where the level starts; in a duel, to where it last stood.
    if (S.match.quest) {
      S.lastSafe = { ...start }; outside = { ...start };
      // A boss left standing is whole again, and its room opens until the fighter comes back to it.
      fought = false;
      for (const E of enemies) if (E.boss) { E.hp = E.maxHp; E.boss.move = null; }
    }
    Body.setPosition(hero().body, S.lastSafe); Body.setVelocity(hero().body, { x: 0, y: 0 });
    Composite.add(world, hero().body);
    heroInWorld = true;
    hero().squash = -0.5;
    ui.duck?.(false);
  }

  // spec/app/index.md, "The next wave starts only when no enemy is left, and brings one more enemy than its number, eight at most"
  function stepWaves() {
    if (!S.match.alive) {
      // Co-op: a fighter down waits where it fell for a teammate to stand by it (docs/coop-plan.md); alone again, as ever.
      if (S.coop && S.match.quest && allies.length) { stepDown(); return; }
      S.down = null;
      if (--heroDeadTimer <= 0) respawnHero();
      return;
    }
    if (S.match.quest) { stepQuest(); return; }
    // spec/app/index.md, "A duel starts from the select screen like a fight, with three lives and no waves"
    if (S.match.duel) { stepRival(); stepPlace(S.hero); return; }
    stepPlace(S.hero);
    // A guest of the arena server's run waits for the waves the server sends (arena/run.ts).
    if (S.coop && !S.coop.host) return;
    // A wave cleared: the place goes dark, and the next wave comes under another sky.
    // Not while a special that cleared the wave is still playing out: its end is the best of it.
    if (S.match.foes === 0 && S.match.waiting === 0 && waveWait === 0 && !hero().special && !effects.some((e) => e.kind === "timed")) { waveWait = 100; if (S.match.wave >= 1) dark = 100; }
    if (dark > 0) {
      dark--;
      S.fade = dark > 60 ? (100 - dark) / 40 : dark > 40 ? 1 : dark / 40;
      if (dark === 50) { S.sky = S.nextSky ?? S.sky; S.nextSky = skyAfter(S.sky); }
    }
    if (waveWait > 0 && --waveWait === 0 && send({ type: "advance" })) { spawnTimer = 30; ui.banner("Wave " + S.match.wave); }
    if (S.match.waiting > 0 && --spawnTimer <= 0) { spawnEnemy(); spawnTimer = 40; }
  }

  // spec/app/index.md, "A level brings its enemies where it places them, never more than eight waiting at once"
  // spec/app/index.md, "Reaching the way out clears the level, once, and only for a living fighter on a quest"
  /** With nobody else in a duel, one of the five stands in as a rival, and comes back three seconds after it falls. */
  function stepRival() {
    const stand = enemies.filter((E) => !E.peer);
    if (enemies.length > stand.length) { for (const E of stand) { Composite.remove(world, E.body); enemies.splice(enemies.indexOf(E), 1); } rivalWait = 120; return; }
    if (stand.length > 0 || --rivalWait > 0) return;
    rivalWait = 180;
    // The rival starts at whichever of the place's starts is farthest from the fighter.
    const at = hero().body.position, far = [...(S.level?.starts ?? [{ x: at.x < 500 ? 880 : 120, y: 500 }])].sort((p, q) => Math.abs(q.x - at.x) - Math.abs(p.x - at.x))[0], x = far.x, look = CHARS[(S.match.fighter + 1 + Math.floor(rnd() * 4)) % CHARS.length];
    enemyAt(x, far.y, false);
    const E = enemies[enemies.length - 1];
    Object.assign(E, { hp: 90, maxHp: 90, skin: look.skin, color: look.color, tag: "CPU" });
    play("puff", x, far.y, "enemy");
  }

  /** What this game's own fighter finds or is turned back by in a level: a piece of the key, a relic, a locked door,
   *  another of the five. */
  function stepFinds(L: Level, H: Fighter, at: Vec, room: Level["ambushes"][number]["zone"] | null, missing: number, within: boolean) {
    S.keys.forEach((key, i) => {
      if (key.found || !H.alive || Math.hypot(key.x - at.x, key.y - at.y) > 60) return;
      foundKey(i, null);
      ui.share?.({ e: "key", i, by: "" });
    });
    for (const relic of S.relics) {
      if (relic.found || Math.hypot(relic.x - at.x, relic.y - at.y) > 60) continue;
      relic.found = true;
      const { count, rewarded } = collect(relic.kind, L.id), def = RELICS[relic.kind];
      sfx.chime(rewarded);
      play("ring", relic.x, relic.y + 40, toneOf(H), 0.7); S.flashT = Math.max(S.flashT, 6);
      floaters.push({ x: relic.x, y: relic.y - 50, text: `${def.name.toUpperCase()} ${Math.min(count, def.need)} / ${def.need}`, life: 70 });
      if (rewarded) {
        ui.banner(def.plural, "gold"); ui.callout(`All ${def.need} found`, `You have earned ${def.reward}`);
        if (relic.kind === "soul") S.fairy = true;
      } else ui.callout(def.name, `${count} of ${def.need} · ${def.reward}`);
    }
    if (room && missing > 0) {
      if (within) {
        // Turned back at the door, to where it last stood outside.
        Body.setPosition(H.body, outside); Body.setVelocity(H.body, { x: 0, y: 0 });
        if (S.time - knocked > 2) { knocked = S.time; shake(3); ui.callout("The door is locked", `Find the key: ${missing} of ${S.keys.length} pieces still hidden`); }
      } else outside = { x: at.x, y: at.y };
    }
    if (visitor && !visitor.met && Math.hypot(visitor.x - at.x, visitor.y - at.y) < 240) { visitor.met = true; ui.meet?.(); }
  }

  function stepQuest() {
    const L = S.level, H = hero(), at = H.body.position;
    if (!L) return;
    // In the black room the power is always there to be used.
    // spec/app/index.md, "Charging adds three quarters of a point of aura each step, up to full"
    if (S.dark && !H.special && S.match.aura < fullAura) send({ type: "charge", steps: 900 });
    // spec/app/index.md, "Story: Play a level of a campaign"
    // The boss's room: shut until every piece of the key is found, and shut again behind the fighter while the boss stands.
    const room = S.bossRoom, missing = S.keys.filter((key) => !key.found).length, last = L.ambushes.length - 1;
    const inRoom = (p: Vec) => !!room && p.x > room[0] && p.x < room[2] && p.y > room[1] && p.y < room[3];
    // A level the arena hosts has no fighter of its own: the boss's fight is on once any of the group is in its room.
    const within = ghost ? allies.some((F) => F.alive && inRoom(F.body.position)) : inRoom(at);
    if (!ghost) stepFinds(L, H, at, room, missing, within);
    for (const blast of blasts.slice()) if (--blast.wait <= 0) {
      blasts.splice(blasts.indexOf(blast), 1);
      play("boom", blast.x, blast.y, "enemy", 1.5); shake(9); sfx.boom(false);
    }
    const boss = enemies.find((E) => E.boss) ?? null;
    if (boss) bossUp = true;
    // What its fall leaves waits for the last of its blasts.
    else if (bossUp && !blasts.length) {
      bossUp = false;
      // What its fall leaves, by how it was answered (`answer`).
      // spec/app/index.md, "Charging adds three quarters of a point of aura each step, up to full"
      if (answered === "defied" && send({ type: "charge", steps: 900 })) { send({ type: "release" }); floaters.push({ x: at.x, y: at.y - 80, text: "AURA", life: 50 }); sfx.power(); }
      const missed = L.clues.findIndex((_, i) => !S.cluesFound.includes(i));
      if (answered === "reasoned" && missed >= 0) { S.cluesFound.push(missed); ui.clue?.(L.clues[missed].fact, L.clues[missed].text); }
      answered = null;
      ui.fallen?.();
    }
    if (room && boss) {
      if (!fought && within) fought = true;
      // The boss never leaves its room; the fighter cannot, once the fight is on.
      for (const F of fought && !ghost ? [H, boss] : [boss]) {
        // The boss is kept its own half-width, and a wall's thickness, inside the room: its walls do not stop it (`clearWay`).
        const pad = F === H ? 20 : 96, p = F.body.position, x = Math.min(room[2] - pad, Math.max(room[0] + pad, p.x)), y = F === H ? Math.min(room[3], Math.max(room[1] + 20, p.y)) : p.y;
        if (x !== p.x || y !== p.y) { Body.setPosition(F.body, { x, y }); Body.setVelocity(F.body, { x: x !== p.x ? 0 : F.body.velocity.x, y: y !== p.y ? 0 : F.body.velocity.y }); }
      }
    }
    S.locked = !!room && (missing > 0 || (!!boss && fought));
    // In co-op only the host's game springs an ambush, when any of the group walks into it, and tells the others.
    if (!S.coop || S.coop.host) L.ambushes.forEach((ambush, i) => {
      if (i === last && room && missing > 0) return;
      const inside = sides().some((F) => {
        const p = F.body.position, z = ambush.zone;
        return F.alive && (z ? p.x > z[0] && p.x < z[2] && p.y > z[1] && p.y < z[3] : p.x >= ambush.at);
      });
      const foes = crowd(ambush.foes);
      if (ambushed.has(i) || !inside || !send({ type: "ambush", count: foes.length })) return;
      ambushed.add(i);
      ui.share?.({ e: "amb", i });
      foes.forEach((foe, n) => {
        if (!send({ type: "arrive" })) return;
        enemyAt(foe.x, foe.y, !!foe.caster, foe.kind);
        const E = enemies[enemies.length - 1];
        E.final = i === last;
        // Co-op: tougher for each teammate, a boss most of all (docs/coop-plan.md).
        const more = 1 + (n === 0 && E.final && L.guarded ? 0.6 : 0.25) * teammates();
        E.hp = E.maxHp = Math.round(E.hp * more);
        // The first to stand in a guarded level's last room is its boss: four times the size and the health, with attacks of its own.
        if (E.final && n === 0 && L.guarded) {
          Body.scale(E.body, 4, 4); Body.setInertia(E.body, Infinity); Body.setPosition(E.body, { x: foe.x, y: foe.y - 126 });
          Object.assign(E, { big: 4, hp: E.hp * 4, maxHp: E.maxHp * 4, caster: false, cool: 90, tag: bossName, boss: { move: null, t: 0, dir: 1, hit: false } });
          clearWay(E);
          fought = true; shake(6);
          ui.parley?.();
        }
      });
    });
    // What the fighter itself meets is its own game's: a level the arena hosts has none (`haunt`).
    if (!ghost) stepGround(L, H, at);
    S.sealed =!!L.guarded && (!ambushed.has(L.ambushes.length - 1) || S.match.waiting > 0 || enemies.some((E) => E.final));
    if (!ghost && !S.sealed && Math.hypot(L.exit.x - at.x, L.exit.y - at.y) < 64 && send({ type: "clear" })) { ui.banner("Chapter clear", "gold"); sfx.power(); ui.share?.({ e: "clear" }); }
  }

  /** What a fighter of this game's own meets on the ground of a level: a clue, a spring, a hazard, a trap. */
  function stepGround(L: Level, H: Fighter, at: Vec) {
    L.clues.forEach((clue, i) => {
      if (S.cluesFound.includes(i) || Math.hypot(clue.x - at.x, clue.y - at.y) > 70) return;
      S.cluesFound.push(i);
      play("ring", clue.x, clue.y + 40, toneOf(H), 0.5);
      ui.clue?.(clue.fact, clue.text);
    });
    stepPlace(H);
    stepTraps(H);
  }

  /** Whatever the place is, in every mode: a spring throws a fighter that lands on it; a hazard hurts one that touches
   *  it, then lets it get clear. Outside a campaign, a foe knocked into a hazard is hurt by it too. */
  function stepPlace(H: Fighter | null) {
    const L = S.level;
    if (!L || !H?.alive) return;
    const at = H.body.position;
    (L.springs ?? []).forEach((spring, i) => {
      if (Math.abs(spring.x - at.x) > 34 || Math.abs(spring.y - H.body.bounds.max.y) > 26 || H.body.velocity.y < -2) return;
      Body.setVelocity(H.body, { x: H.body.velocity.x, y: -27 });
      H.airJumps = H.airJumpsMax; H.squash = 0.35; S.sprung[i] = S.time;
      sfx.jump(); dust(spring.x, spring.y, 6, 0);
    });
    const into = (F: Fighter) => (L.hazards ?? []).find((hz) => overlaps(hurtBox(F), box(hz.x - hz.w / 2, hz.y - hz.h, hz.x + hz.w / 2, hz.y)));
    if (hazardCool > 0) hazardCool--;
    // A guest of the arena server's run is hurt by a hazard when the server says (arena/run.ts), which sees it there too.
    else if (!(S.coop && !S.coop.host && !S.match.quest)) {
      const hz = into(H);
      if (hz) { const away = Math.sign(at.x - hz.x) || 1; hurt(H, { dmg: hz.dmg, kx: away * 7, ky: -9, from: -away }); hazardCool = 50; }
    }
    if (S.match.quest) return;
    for (const E of enemies) {
      if (E.peer || E.remote || !E.alive || (spiked.get(E) ?? 0) > stepCount) continue;
      const hz = into(E);
      if (hz) { const away = Math.sign(E.body.position.x - hz.x) || 1; hurt(E, { dmg: hz.dmg, kx: away * 7, ky: -9, from: -away }); spiked.set(E, stepCount + 50); }
    }
  }
  /** When each foe can next be hurt by a hazard. */
  const spiked = new WeakMap<Fighter, number>();

  // The traps of a hand-drawn level (traps.ts): only the player's own fighter meets them, in its own game.
  function stepTraps(H: Fighter) {
    const T = S.level?.traps;
    if (!T) return;
    const me = hurtBox(H), at = H.body.position, feet = H.body.bounds.max.y, near = (x: number, y: number) => Math.abs(x - at.x) < 1100 && Math.abs(y - at.y) < 700;
    const strike = (dmg: number, kx: number, ky: number) => { hurt(H, { dmg, kx, ky, from: -Math.sign(kx) || 1 }); hazardCool = 50; };
    // Ice under the fighter's feet: its grip on the ground is mostly gone (stepFighter).
    icy = H.grounded && T.ice.some(([x0, top, x1]) => Math.abs(feet - top) < 8 && at.x > x0 - 10 && at.x < x1 + 10);
    // A gate brings whoever steps into it out of its twin, still moving; the twin waits until they have stepped clear of it.
    if (gateHeld && Math.hypot(at.x - gateHeld.x, feet - gateHeld.y) > 80) gateHeld = null;
    if (!gateHeld) for (const gate of T.gates) {
      const into = [gate.a, gate.b].find((end) => Math.abs(at.x - end.x) < 26 && Math.abs(feet - end.y) < 40);
      if (!into) continue;
      const out = into === gate.a ? gate.b : gate.a;
      dust(at.x, feet, 8, 0); Body.setPosition(H.body, { x: out.x, y: out.y - (feet - at.y) - 2 }); dust(out.x, out.y, 8, 0);
      sfx.vanish(); gateHeld = out;
      break;
    }
    // An eye that sees the fighter as it opens sends a wisp, which turns after them until it touches them or fades.
    const mid = { x: at.x, y: (me.min.y + me.max.y) / 2 };
    T.eyes.forEach((eye, i) => {
      const { sent } = eyeAt(S.time, i);
      if (sent === sentBy[i]) return;
      const first = sentBy[i] === -2;
      sentBy[i] = sent;
      if (first) return;
      if (Math.hypot(mid.x - eye.x, mid.y - eye.y) < EYE_SIGHT && S.traps.wisps.length < 12) { S.traps.wisps.push({ x: eye.x, y: eye.y, vx: 0, vy: 0, life: WISP_LIFE }); if (near(eye.x, eye.y)) sfx.vanish(); }
    });
    S.traps.wisps = S.traps.wisps.filter((w) => {
      const dx = mid.x - w.x, dy = mid.y - w.y, d = Math.hypot(dx, dy) || 1;
      w.vx += (dx / d) * WISP_TURN; w.vy += (dy / d) * WISP_TURN;
      const sp = Math.hypot(w.vx, w.vy);
      if (sp > WISP_SPEED) { w.vx *= WISP_SPEED / sp; w.vy *= WISP_SPEED / sp; }
      w.x += w.vx; w.y += w.vy;
      if (d < 30 && hazardCool === 0) { strike(9, Math.sign(w.vx || 1) * 8, -6); return false; }
      return --w.life > 0;
    });
    // A gust pushes whoever is in its rows toward the way it blows, on the ground or in the air.
    for (const g of T.gusts) {
      const blow = gustAt(S.time, g.phase).blow;
      if (blow > 0 && overlaps(me, box(Math.min(g.x, g.x + g.dir * g.reach), g.y - 64, Math.max(g.x, g.x + g.dir * g.reach), g.y + 64))) Body.translate(H.body, { x: g.dir * GUST_PUSH * blow, y: 0 });
    }
    // A mortar that can see the fighter lobs a shell at where they stand; it bursts where it lands, on whoever is there.
    T.mortars.forEach((m, i) => {
      if (S.time - firedAt[i] < MORTAR_EVERY || Math.abs(at.x - m.x) > MORTAR_RANGE || Math.abs(feet - m.y) > 6 * 64 || !H.grounded) return;
      firedAt[i] = S.time; S.traps.shells.push({ x0: m.x, y0: m.y - 50, x1: at.x, y1: feet, t: 0, T: SHELL_FLIGHT }); if (near(m.x, m.y)) sfx.hit(true);
    });
    S.traps.shells = S.traps.shells.filter((s) => {
      if (++s.t < s.T) return true;
      S.traps.booms.push({ x: s.x1, y: s.y1, t: 0 }); if (near(s.x1, s.y1)) { sfx.zap(); shake(4); } dust(s.x1, s.y1, 14, 0);
      if (hazardCool === 0 && Math.abs(at.x - s.x1) < SHELL_BURST && Math.abs(feet - s.y1) < SHELL_BURST) { hurt(H, { dmg: 12, kx: Math.sign(at.x - s.x1 || 1) * 9, ky: -9, from: Math.sign(at.x - s.x1 || 1) }); hazardCool = 50; }
      return false;
    });
    S.traps.booms = S.traps.booms.filter((b) => ++b.t < 24);
    // A taut binding thread cuts whoever is across it.
    if (hazardCool === 0) for (const t of T.threads) {
      if (!threadAt(S.time, t.phase).taut || !overlaps(me, box(t.x0, t.y - 8, t.x1, t.y + 8))) continue;
      hurt(H, { dmg: 10, kx: 0, ky: at.y < t.y ? -7 : 4, from: 1 }); hazardCool = 50; if (near(at.x, at.y)) sfx.zap(); break;
    }
    // Burning boards hurt whoever stands where the fire is.
    if (hazardCool === 0 && H.grounded) for (const p of T.planks) {
      const f = Math.abs(feet - p.y) < 8 && fireAt(S.time, p);
      if (f && at.x > f.x0 - 10 && at.x < f.x1 + 10) { hurt(H, { dmg: 10, kx: p.dir * 6, ky: -9, from: p.dir }); hazardCool = 50; if (near(at.x, at.y)) sfx.zap(); break; }
    }
    // A belt carries whoever stands on it the way it runs.
    const belt = H.grounded && T.belts.find((b) => Math.abs(feet - b.y) < 8 && at.x > b.x0 && at.x < b.x1);
    if (belt) Body.translate(H.body, { x: belt.dir * BELT_SPEED, y: 0 });
    // A blade-lift rises and sinks; a fighter standing on it goes with it.
    T.lifts.forEach((l, i) => {
      const y = liftAt(S.time, l), moved = y - liftY[i];
      if (Math.abs(feet - liftY[i]) < 8 && Math.abs(at.x - l.x) < l.w / 2 + 10 && H.body.velocity.y >= -1) Body.translate(H.body, { x: 0, y: moved });
      Body.setPosition(lifts[i], { x: l.x, y: y + 11 }); liftY[i] = y;
    });
    // A wagon runs its track; a fighter standing on it is carried the way it went.
    T.wagons.forEach((w, i) => {
      const x = wagonAt(S.time, w), moved = x - wagonX[i];
      if (H.grounded && Math.abs(feet - w.y) < 8 && Math.abs(at.x - wagonX[i]) < w.w / 2 + 10) Body.translate(H.body, { x: moved, y: 0 });
      Body.setPosition(wagons[i], { x, y: w.y + 11 }); wagonX[i] = x;
    });
    // A path of the dead is solid while its set is, and comes back only when nobody is inside it.
    T.spirits.forEach((p, i) => {
      const solid = spiritAt(S.time, p.set).solid;
      if (solid === spiritSolid[i] || (solid && overlaps(me, box(p.x - p.w / 2, p.y - 4, p.x + p.w / 2, p.y + 26)))) return;
      spiritSolid[i] = solid;
      if (solid) Composite.add(world, spirits[i]); else Composite.remove(world, spirits[i]);
    });
    // A seam opens and shuts on its own; it shuts only when nobody is in it, so it never closes on a fighter.
    T.seams.forEach((s, i) => {
      const open = seamAt(S.time, s.phase).open;
      if (open === seamOpen[i] || (!open && overlaps(me, box(s.x - s.w / 2, s.y - 4, s.x + s.w / 2, s.y + 26)))) return;
      seamOpen[i] = open;
      if (open) { Composite.remove(world, seams[i]); if (near(s.x, s.y)) sfx.land(); for (let x = s.x - s.w / 2 + 32; x < s.x + s.w / 2; x += 64) dust(x, s.y + 11, 2, 0); }
      else Composite.add(world, seams[i]);
    });
    // A hidden chamber, found: through a false wall, down through a false floor, or at its cache. The first of a level
    // tells what the level's secret is.
    T.veils.forEach((v, i) => { if (!S.traps.unveiled[i] && overlaps(me, box(v.x, v.y, v.x + 64, v.y + 64))) { S.traps.unveiled[i] = true; sfx.vanish(); } });
    // Inside a hidden chamber, all of it shows: every hidden cell near the one the fighter is in.
    const inside = T.hollows.find((c) => at.x > c.x && at.x < c.x + 64 && mid.y > c.y && mid.y < c.y + 64);
    if (inside) T.hollows.forEach((c, i) => { if (Math.abs(c.x - inside.x) < 8 * 64 && Math.abs(c.y - inside.y) < 3 * 64) S.traps.opened[i] = true; });
    const found = !!inside || S.traps.unveiled.some(Boolean) || T.caches.some((c) => Math.hypot(c.x - at.x, c.y - feet) < 110) || T.crumbles.some(([cx, top, w, hidden]) => hidden && feet > top + 70 && Math.abs(at.x - cx) < w / 2 + 64);
    if (found && !S.traps.told) { S.traps.told = true; ui.callout("A hidden chamber", S.level?.secret ?? "Someone hid this here, and meant it to be found."); }
    // A crumbling ledge holds for half a second once stood on, falls, and grows back when nobody is under it.
    T.crumbles.forEach((c, i) => { if (S.traps.crumbles[i].t >= 0) S.traps.crumbles[i].seen = true; });
    T.crumbles.forEach(([cx, top, w], i) => {
      const st = S.traps.crumbles[i];
      if (st.gone > 0) {
        if (--st.gone > 0) return;
        if (overlaps(me, box(cx - w / 2 - 30, top - 100, cx + w / 2 + 30, top + 600))) { st.gone = 30; return; }
        Composite.add(world, crumbling[i]); dust(cx, top, 4, 0);
        return;
      }
      if (st.t < 0) {
        if (H.grounded && Math.abs(feet - top) < 8 && Math.abs(at.x - cx) < w / 2 + 10) { st.t = 0; sfx.hit(false); }
        return;
      }
      if (++st.t < CRUMBLE_HOLD) return;
      Composite.remove(world, crumbling[i]); st.t = -1; st.gone = CRUMBLE_BACK;
      for (let x = cx - w / 2 + 32; x < cx + w / 2; x += 64) dust(x, top + 11, 3, 0);
      sfx.land();
    });
    // A block waits for a fighter under it, rattles, falls, lies a moment, and is drawn back up.
    T.crushers.forEach((c, i) => {
      const st = S.traps.crushers[i], bottom = c.y + st.y + CRUSH_H;
      if (st.mode === 0) {
        if (--st.t <= 0 && Math.abs(at.x - c.x) < c.w / 2 + 50 && me.min.y > c.y + CRUSH_H - 10 && feet < c.y + CRUSH_H + c.drop + 10) { st.mode = 1; st.t = 24; }
      } else if (st.mode === 1) {
        if (--st.t <= 0) { st.mode = 2; st.v = 2; }
      } else if (st.mode === 2) {
        st.v = Math.min(30, st.v + 1.8); st.y = Math.min(c.drop, st.y + st.v);
        if (st.y >= c.drop) { st.mode = 3; st.t = 55; if (near(c.x, bottom)) { shake(7); sfx.boom(false); } dust(c.x - c.w / 2, c.y + c.drop + CRUSH_H, 5, -1); dust(c.x + c.w / 2, c.y + c.drop + CRUSH_H, 5, 1); }
      } else if (st.mode === 3) {
        if (--st.t <= 0) st.mode = 4;
      } else if ((st.y -= 2.4) <= 0) { st.y = 0; st.mode = 0; st.t = 40; }
      if (st.mode === 2 && hazardCool === 0 && overlaps(me, box(c.x - c.w / 2, c.y + st.y, c.x + c.w / 2, bottom))) strike(22, (Math.sign(at.x - c.x) || 1) * 12, -6);
    });
    // A bell is heard as it tolls.
    T.bells.forEach((b, i) => { const r = bellAt(S.time, b).ring, tolled = r !== null && r < 12; if (tolled && tolling[i] !== Math.floor(S.time / 4) && near(b.x, b.y)) { tolling[i] = Math.floor(S.time / 4); ui.sample?.("shieldHit"); shake(3); } });
    // A slot sounds as it looses, so a bolt from off the screen is heard before it is seen.
    T.bolts.forEach((b, i) => { const { shot } = boltAt(S.time, b); if (loosed[i] !== shot) { if (loosed[i] !== undefined && near(b.x, b.y)) sfx.zap(); loosed[i] = shot; } });
    // A frozen soldier cracks free when a fighter is in front of it, slashes, and settles back into the ice.
    T.frozen.forEach((f, i) => {
      const st = S.traps.frozen[i], ahead = box(Math.min(f.x, f.x + f.dir * FROZEN_SIGHT), f.y - 140, Math.max(f.x, f.x + f.dir * FROZEN_SIGHT), f.y);
      if (st.mode === 0) { if (overlaps(me, ahead)) { st.mode = 1; st.t = 20; if (near(f.x, f.y)) sfx.hit(false); } return; }
      if (--st.t > 0) return;
      if (st.mode === 1) { st.mode = 2; st.t = 10; if (near(f.x, f.y)) sfx.zap(); }
      else if (st.mode === 2) { st.mode = 3; st.t = 80; }
      else st.mode = 0;
    });
    // A lantern passed wakes a shade, which walks the fighter's own path SHADE_LAG steps behind and strikes if it reaches them.
    const L = S.traps, now = ++L.step;
    L.trail.push({ x: at.x, y: mid.y }); if (L.trail.length > SHADE_LAG + 2) L.trail.shift();
    T.lanterns.forEach((l, i) => {
      if (now - L.lanternAt[i] < LANTERN_SLEEP || Math.abs(at.x - l.x) > 40 || Math.abs(feet - l.y) > 70) return;
      L.lanternAt[i] = now; L.shades.push({ born: now, from: i }); sfx.vanish();
    });
    L.shades = L.shades.filter((s) => {
      const age = now - s.born;
      if (age < SHADE_LAG) return true;
      const p = L.trail[0];
      if (p && hazardCool === 0 && Math.hypot(p.x - at.x, p.y - mid.y) < 34) { hurt(H, { dmg: 9, kx: Math.sign(at.x - p.x || 1) * 7, ky: -5, from: Math.sign(at.x - p.x || 1) }); hazardCool = 50; dust(p.x, p.y, 10, 0); return false; }
      return age < SHADE_LAG + SHADE_LIFE;
    });
    // A tide pool slows whoever wades in it, and hurts them now and then while it is over their head.
    const tide = T.tides.find((p) => at.x > p.x0 && at.x < p.x1 && me.max.y > p.y - TIDE_H * tideAt(S.time, p.x0).level && me.max.y < p.y + 12);
    if (tide) Body.setVelocity(H.body, { x: H.body.velocity.x * TIDE_DRAG, y: Math.min(H.body.velocity.y, 7) });
    under = tide && me.min.y > tide.y - TIDE_H * tideAt(S.time, tide.x0).level ? under + 1 : 0;
    if (under >= TIDE_BREATH) { under = 0; hurt(H, { dmg: 5, kx: 0, ky: -3, from: 1 }); if (near(at.x, at.y)) sfx.vanish(); }
    // A grave stirs when someone stands on it; the hands come up after a moment, grab whoever is still there, then sink.
    const onGrave = (g: { x: number; y: number; w: number }) => Math.abs(feet - g.y) < 10 && at.x > g.x - g.w / 2 - 8 && at.x < g.x + g.w / 2 + 8;
    T.graves.forEach((g, i) => {
      const st = S.traps.graves[i];
      if (st.mode === 0) { if (onGrave(g)) { st.mode = 1; st.t = GRAVE_STIR; if (near(g.x, g.y)) sfx.hit(false); } return; }
      if (--st.t > 0) return;
      if (st.mode === 1) {
        st.mode = 2; st.t = GRAVE_GRASP;
        if (near(g.x, g.y)) { sfx.vanish(); dust(g.x, g.y, 10, 0); }
        if (onGrave(g) && hazardCool === 0) { hurt(H, { dmg: 7, kx: 0, ky: 0, stun: GRAVE_GRASP, from: 1 }); Body.setVelocity(H.body, { x: 0, y: 0 }); hazardCool = GRAVE_GRASP + 20; }
      } else if (st.mode === 2) { st.mode = 3; st.t = GRAVE_REST; }
      else st.mode = 0;
    });
    if (hazardCool > 0) return;
    for (const [i, f] of T.frozen.entries()) {
      if (S.traps.frozen[i].mode === 2 && overlaps(me, box(Math.min(f.x, f.x + f.dir * FROZEN_REACH), f.y - 120, Math.max(f.x, f.x + f.dir * FROZEN_REACH), f.y))) return strike(16, f.dir * 12, -7);
    }
    for (const sp of T.spikes) {
      if (spikeAt(S.time, sp.phase).up >= 0.6 && overlaps(me, box(sp.x - sp.w / 2, sp.y - SPIKE_H, sp.x + sp.w / 2, sp.y))) return strike(12, (Math.sign(at.x - sp.x) || 1) * 5, -10);
    }
    for (const fl of T.flames) {
      const { up } = flameAt(S.time, fl.phase);
      if (up >= 0.5 && overlaps(me, box(fl.x - fl.w / 2, fl.y - fl.h * up, fl.x + fl.w / 2, fl.y))) return strike(14, (Math.sign(at.x - fl.x) || 1) * 7, -8);
    }
    // A bell's ring knocks whoever it passes through away from the bell.
    for (const b of T.bells) {
      const r = bellAt(S.time, b).ring;
      if (r === null) continue;
      const mid = { x: (me.min.x + me.max.x) / 2, y: (me.min.y + me.max.y) / 2 }, d = Math.hypot(mid.x - b.x, mid.y - b.y);
      if (Math.abs(d - r) < 26) { const ux = (mid.x - b.x) / (d || 1), uy = (mid.y - b.y) / (d || 1); return strike(10, ux * 15, Math.min(-6, uy * 12)); }
    }
    for (const j of T.jets) {
      if (jetAt(S.time, j.phase).on && overlaps(me, box(Math.min(j.x, j.x + j.dir * j.reach), j.y - 24, Math.max(j.x, j.x + j.dir * j.reach), j.y + 24))) return strike(14, j.dir * 11, -6);
    }
    for (const r of T.rams) {
      const out = ramAt(S.time, r.phase).out * r.reach;
      if (out > 12 && overlaps(me, box(Math.min(r.x, r.x + r.dir * out), r.y - 30, Math.max(r.x, r.x + r.dir * out), r.y + 30))) return strike(16, r.dir * 14, -6);
    }
    for (const b of T.blades) {
      const { tip, dir } = bladeAt(S.time, b);
      const dx = tip.x - Math.max(me.min.x, Math.min(tip.x, me.max.x)), dy = tip.y - Math.max(me.min.y, Math.min(tip.y, me.max.y));
      if (Math.hypot(dx, dy) < BLADE_R + 4) return strike(16, dir * 10, -7);
    }
    T.bolts.forEach((b, i) => {
      const { shot, at: x } = boltAt(S.time, b);
      if (x === null || S.traps.struck[i] === shot || hazardCool > 0) return;
      if (overlaps(me, box(Math.min(x, x - b.dir * 30), b.y - 6, Math.max(x, x - b.dir * 30), b.y + 6))) { S.traps.struck[i] = shot; strike(10, b.dir * 8, -5); }
    });
  }

  // spec/app/index.md, "Falling off the islands costs 25 health and ends flight"
  function plunged() {
    const H = hero();
    if (!H.alive || !send({ type: "plunge" })) return;
    H.special = null;
    if (S.match.duel || (S.coop && !S.coop.host)) ui.fell?.();
    if (!H.alive) { Composite.remove(world, H.body); heroInWorld = false; heroDeadTimer = 120; fallen(); sfx.ko(); }
    else { Body.setPosition(H.body, S.lastSafe); Body.setVelocity(H.body, { x: 0, y: 0 }); H.trail = []; }
  }
  function stepVoid() {
    const H = hero();
    // A played fighter's fall is told by its player's game (arena/run.ts), which sees it.
    if (!steered && !ghost && H.alive && H.body.position.y > S.voidY) plunged();
    for (const E of enemies.slice()) {
      if (!E.peer && !E.remote && E.body.position.y > S.voidY) { Composite.remove(world, E.body); removeEnemy(E); }
    }
    for (let i = props.length - 1; i >= 0; i--) {
      const b = props[i];
      if (b.position.y > S.voidY) {
        Composite.remove(world, b); props.splice(i, 1);
        respawnQueue.push({ at: 90, kind: b.label, size: b.size || b.circleRadius || 18 });
      }
    }
    for (let i = respawnQueue.length - 1; i >= 0; i--) {
      if (--respawnQueue[i].at > 0) continue;
      const r = respawnQueue.splice(i, 1)[0];
      const x = H.body.position.x + (rnd() - 0.5) * 700;
      if (r.kind === "ball") makeBall(x, H.body.position.y - 600, r.size); else makeCrate(x, H.body.position.y - 600, r.size);
    }
  }

  // ---------- effects ----------
  function dust(x: number, y: number, n: number, dir: number) {
    for (let i = 0; i < n; i++) particles.push({ x: x + (rnd() - 0.5) * 16, y, vx: dir * rnd() * 1.5 + (rnd() - 0.5) * 2, vy: -rnd() * 1.5, life: 26, max: 26, size: 3 + rnd() * 3, color: "138,138,134" });
  }
  function sparks(x: number, y: number, dir: number, n: number, red: boolean, color: string | null) {
    for (let i = 0; i < n; i++) {
      const a = (rnd() - 0.5) * 1.6 + (dir > 0 ? 0 : Math.PI), s = 3 + rnd() * 6;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 20, max: 20, size: 2 + rnd() * 2.5, color: color && rnd() < 0.6 ? color : (red && rnd() < 0.6 ? "212,42,30" : "17,17,17"), heavy: true });
    }
  }
  function poof(x: number, y: number, fx: string) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      particles.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 30, vx: Math.cos(a) * 3, vy: Math.sin(a) * 2, life: 20, max: 20, size: 4, color: i % 2 ? "17,17,17" : fx });
    }
    rings.push({ x, y, r: 6, max: 50, life: 10 });
    play("puff", x, y + 40, toneOf(S.hero), 0.9);
  }
  function gather(p: Vec, n: number, rad: number, fx: string) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = rad * (0.6 + rnd() * 0.6);
      particles.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, vx: -Math.cos(a) * d / 14, vy: -Math.sin(a) * d / 14, life: 14, max: 14, size: 2.5, color: fx });
    }
  }
  function auraSpark(F: Fighter) {
    const b = F.body;
    particles.push({ x: b.position.x + (rnd() - 0.5) * 50, y: b.bounds.max.y - rnd() * 20, vx: (rnd() - 0.5) * 0.6, vy: -2 - rnd() * 3, life: 30, max: 30, size: 2 + rnd() * 2, color: rnd() < 0.8 ? ch(F).fx : "17,17,17" });
  }
  function burst(x: number, y: number, r: number, color: string) { bursts.push({ x, y, r, life: 9, max: 9, rot: rnd() * Math.PI, color }); }
  function stepParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.heavy ? 0.3 : -0.02; p.vx *= 0.94;
      if (--p.life <= 0) particles.splice(i, 1);
    }
    for (let i = bursts.length - 1; i >= 0; i--) if (--bursts[i].life <= 0) bursts.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.r += (r.max - r.r) * 0.25; if (--r.life <= 0) rings.splice(i, 1); }
    for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].y -= 1.2; if (--floaters[i].life <= 0) floaters.splice(i, 1); }
    for (let i = sprites.length - 1; i >= 0; i--) { const def = FX[sprites[i].fx]; if (++sprites[i].age >= (def.seconds / def.rate) * 60) sprites.splice(i, 1); }
    if (S.flashT > 0) S.flashT--;
    if (S.red > 0) S.red--;
    if (hero().od > 0 && hero().alive && rnd() < 0.5) auraSpark(hero());
  }

  // spec/app/index.md, "A fight starts from the select screen with full health, 40 aura and nothing else"
  function begin(level: Level | null = null, specials: SpecialDef[] | null = kit, build: Build = skills) {
    S.match = rules.get();
    kit = specials; skills = build; tired = 0; visitor = null; bossUp = false; answered = null; S.dark = false; proving = -1; bossName = null; blasts.length = 0;
    // What was carried and what lay about stay behind: each fight starts with an empty bag.
    S.bag.length = 0; S.chosen = 0; drops.length = 0; S.warded = 0; S.hasted = 0; shown.clear();
    S.down = null; wipeT = 0; heardWorlds.length = 0; worldGaps.length = 0; outbox.orbs.length = outbox.fx.length = outbox.warns.length = 0;
    buildWorld(level);
    // A fight of waves changes its sky each wave, on a stage of its own as on the islands; a level or a duel has its own.
    const waves = !S.match.quest && !S.match.duel;
    S.sky = waves ? SKY_IDS[Math.floor(rnd() * SKY_IDS.length)] : null;
    S.nextSky = waves ? skyAfter(S.sky!) : null;
    dark = 0; S.fade = 0; told = false;
    ambushed.clear(); S.cluesFound.length = 0; S.sprung = []; S.sealed = false; hazardCool = 0;
    // In a duel the fighters start apart, at whichever of the place's starts chance gives each.
    const spawn = level ? (S.match.duel && level.starts ? level.starts[Math.floor(rnd() * level.starts.length)] : level.spawn) : SPAWN;
    rivalWait = 180; guardLeft = GUARD; guardCool = 0; S.guard = 0;
    if (S.match.duel) ui.sample?.("go");
    for (const E of enemies) Composite.remove(world, E.body);
    for (const r of ragdolls) dropRagdoll(r);
    enemies.length = ragdolls.length = orbs.length = effects.length = 0;
    particles.length = bursts.length = floaters.length = rings.length = sprites.length = 0;
    if (S.hero && heroInWorld) Composite.remove(world, S.hero.body);
    const c = CHARS[S.match.fighter];
    S.hero = makeHero(c, spawn);
    // Dressed in the outfit chosen for it (relics.ts).
    S.hero.skin = skinOf(S.match.fighter);
    S.hero.airJumpsMax += skills.jumps; S.hero.airJumps = S.hero.airJumpsMax;
    heroInWorld = true;
    sinceHit = 999;
    waveWait = 70; heroDeadTimer = 0; S.slowMs = 0; hitstop = 0; S.flashT = 0; S.deathMs = 0; S.red = 0; S.punch = 0; streak = 0;
    S.lastSafe = { ...spawn }; start = { ...spawn }; outside = { ...spawn }; fought = false; knocked = -9;
    // Three pieces of the key to the boss's room, hidden afresh each time where the level's other enemies wait:
    // places a fighter on foot is known to reach. Each is well apart from the others where the level allows.
    S.bossRoom = level?.guarded ? level.ambushes[level.ambushes.length - 1]?.zone ?? null : null; S.locked = false; S.keys = [];
    if (level && S.bossRoom) {
      const spots = level.ambushes.slice(0, -1).flatMap((ambush) => ambush.foes.map((foe) => ({ x: foe.x, y: foe.y - 10 })));
      // In co-op every game of the group hides them in the same places: chance seeded by the level.
      const roll = S.coop ? seeded(level.id) : rnd;
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(roll() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      for (const apart of [900, 300, 0]) for (const spot of spots) {
        if (S.keys.length < 3 && S.keys.every((key) => Math.hypot(key.x - spot.x, key.y - spot.y) > apart && (key.x !== spot.x || key.y !== spot.y))) S.keys.push({ ...spot, found: false });
      }
      ui.keys?.(0, S.keys.length);
    }
    // spec/app/saga.md, "Story: Play five campaigns"
    // A Puzzle Piece, a Soul Stone Fragment and a Thread of the Gods, each in a place a fighter on foot reaches, away
    // from the key and from each other; only those of this level not yet found.
    S.relics = [];
    if (level?.hero) {
      const spots = level.ambushes.flatMap((ambush, i) => (S.bossRoom && i === level.ambushes.length - 1 ? [] : ambush.foes.map((foe) => ({ x: foe.x, y: foe.y - 10 }))));
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      const taken = (spot: Vec, apart: number) => [...S.keys, ...S.relics].some((at) => Math.hypot(at.x - spot.x, at.y - spot.y) < Math.max(apart, 1));
      for (const kind of RELIC_KINDS.filter((kind) => !isFound(kind, level.id))) {
        for (const apart of [600, 250, 0]) { const spot = spots.find((at) => !taken(at, apart)); if (spot) { S.relics.push({ kind, x: spot.x + 40, y: spot.y, found: false }); break; } }
      }
    }
    S.fairy = earned("soul"); S.sparkle = !!outfitOf(S.match.fighter).sparkle;
    // The guide waits a few steps ahead of where a level of rooms starts, on the same floor.
    S.guide = level?.talk?.length ? { x: spawn.x + 130, y: spawn.y + 44 } : null; S.talking = false;
    clearInput();
    S.fights++;
    // The fighter pops in: squashed small, then springing up to its height.
    S.hero.squash = -0.6;
    ui.duck?.(false);
    updatePose(S.hero);
    ui.callout(c.name, c.title);
    // A little after the name: what this level still hides besides the key, if anything (relics.ts).
    const hidden = S.relics.map((relic) => RELICS[relic.kind].name);
    if (hidden.length) later(150, () => { if (S.relics.some((relic) => !relic.found)) ui.callout("Hidden here", hidden.join(" · ")); });
  }

  // spec/app/index.md, "A fight is on while the play screen is showing, the move list is closed and the level is not yet cleared"
  let acc = 0;
  function frame(realDt: number) {
    S.match = rules.get();
    const H = S.hero;
    // While the guide talks the level waits; only the clock that moves cloaks and leaves runs on.
    if (S.talking && S.match.screen === "Play") { S.time += realDt / 1000; return; }
    if (S.match.screen === "Play" && !S.match.paused && !S.match.cleared && H) {
      if (S.slowMs > 0) S.slowMs -= realDt;
      if (S.deathMs > 0) S.deathMs -= realDt;
      // An impact's punch on the zoom dies away at five a second.
      S.punch *= Math.exp((-5 * realDt) / 1000);
      acc += realDt * (S.deathMs > 0 ? 0.4 : S.slowMs > 0 ? 0.3 : 1);
      while (acc >= STEP) {
        acc -= STEP; S.time += STEP / 1000; stepCount++;
        sinceHit++; sinceKo++;
        if (hitstop > 0) { hitstop--; continue; }
        // A fighter its player's game plays elsewhere does nothing of itself here, and guards when that game says.
        const I = steered ? still() : heroIntent();
        // The guard: held on the ground, it takes most of a blow and all of its push, until it has taken too much.
        // A broken guard is down for three seconds; one let go mends itself.
        const guarding = steered ? steered.guard && H.alive && guardCool <= 0 : input.guard && H.alive && H.grounded && !H.atk && !H.special && H.stun <= 0 && guardCool <= 0;
        if (guarding && S.guard === 0) ui.sample?.("shield");
        if (guarding) { Object.assign(I, { dir: 0, P: false, K: false, X: false, jumpPressed: false, dash: false, fly: false, charge: false, special: -1 }); S.guard = Math.max(0.05, guardLeft / GUARD); }
        else { S.guard = 0; guardLeft = Math.min(GUARD, guardLeft + 0.15); }
        if (guardCool > 0) guardCool--;
        if (input.itemPressed) { input.itemPressed = false; useItem(); }
        if (S.warded > 0) S.warded--;
        if (S.hasted > 0) S.hasted--;
        stepDrops();
        if (H.alive && !ghost) { if (steered) followPuppet(H, steered); else stepFighter(H, I); }
        // In a level of rooms an enemy far from the fighter waits where it is, until the fighter (or, in co-op, any of
        // the group) comes its way. A co-op stand-in is not stepped: the host's game moves it.
        const near = (E: Fighter) => sides().some((F) => Math.abs(E.body.position.x - F.body.position.x) < 2400 && Math.abs(E.body.position.y - F.body.position.y) < 1500);
        for (const E of enemies.slice()) if (E.alive && !E.peer && !E.remote && (!S.level?.bounds || near(E))) stepFighter(E, enemyIntent(E));
        followPeers();
        Engine.update(engine, STEP);
        if (H.alive) updatePose(H);
        for (const E of enemies) updatePose(E);
        for (const E of allies) updatePose(E);
        // A played fighter's blows are its player's game's, told to the server (arena/run.ts).
        if (H.alive && !steered && !ghost) { resolveHits(H); stomp(H); }
        for (const E of enemies.slice()) if (E.alive && !E.peer && !E.remote) resolveHits(E);
        stepOrbs();
        for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].step()) effects.splice(i, 1);
        stepRagdolls(); stepVoid(); stepWaves(); stepParticles();
        S.shake = Math.max(0, S.shake - 1.2);
      }
    } else {
      acc = 0;
      if (S.match.screen !== "Play") { S.time += realDt / 1000; Engine.update(engine, STEP); }
    }
  }

  // spec/app/index.md, "Story: Fight other players"
  // Every player's game runs its own fighter. The others are stand-ins here: placed where their games say they
  // are, showing the frame their games show, and struck only by telling their games so.
  // In co-op they are teammates (docs/coop-plan.md): kept apart from the enemies, so that no blow of a player's can
  // reach them, and gone for by the enemies as this fighter is (`sides`).
  const heard = new Map<string, Peer>();
  function peers(list: Peer[], into: Fighter[] = S.coop ? allies : enemies) {
    heard.clear();
    for (const p of list) heard.set(p.id, p);
    for (const E of into.slice()) {
      if (!E.peer || heard.has(E.peer.id)) continue;
      Composite.remove(world, E.body); into.splice(into.indexOf(E), 1);
    }
    for (const p of list) {
      let E = into.find((each) => each.peer?.id === p.id);
      if (!E || E.char !== CHARS[p.fighter]) {
        if (E) { Composite.remove(world, E.body); into.splice(into.indexOf(E), 1); }
        E = makeFighter(p.x, p.y, false, healthOf(p.fighter), CHARS[p.fighter]);
        into.push(E);
      }
      // In the outfit its player chose.
      E.skin = skinOf(p.fighter, OUTFITS.find((each) => each.id === p.outfit) ?? OUTFITS[0]);
      // Its knockout's puff comes from its own game, like every other effect of its.
      if (E.alive && !p.alive) sfx.ko();
      // Breaking into Overdrive: the ring goes out from it here as it does there.
      if (p.over && E.od === 0 && E.peer) { rings.push({ x: p.x, y: p.y, r: 20, max: 200, life: 24 }); S.flashT = Math.max(S.flashT, 8); sfx.power(); }
      // Which special, counted through every fighter's, since a player may carry another fighter's (versus.ts).
      const sp = p.special, def = sp ? CHARS.flatMap((c) => c.specials)[sp.slot] : undefined;
      // A special under way: drawn from what its player's game says, never stepped here.
      E.special = sp && def ? { def, kind: SK[def.kind], p: def.p ?? {}, t: sp.t, dur: SK[def.kind].dur, ang: sp.ang, c: sp.c } : null;
      E.peer = { id: p.id, name: p.name, lives: p.lives, guard: p.guard, at: p.at };
      E.alive = p.alive; E.hp = p.hp; E.maxHp = Math.max(E.maxHp, p.hp); E.facing = p.facing; E.od = p.over ? 1 : 0; E.charging = p.glow && !p.over;
    }
  }
  // spec/app/index.md, "Story: Play a level of a campaign"
  function answer(how: "defied" | "reasoned") {
    const boss = enemies.find((E) => E.boss);
    if (!boss) return;
    answered = how;
    if (how === "defied") boss.pow *= 1.4; else { boss.maxHp = Math.round(boss.maxHp / 2); boss.hp = Math.min(boss.hp, boss.maxHp); }
  }
  function trial(slot: number) { S.dark = true; proving = slot; }
  // spec/app/saga.md, "Story: Change the world"
  function gift() {
    const key = S.keys.find((each) => !each.found);
    if (key) { key.found = true; ui.keys?.(S.keys.filter((each) => each.found).length, S.keys.length); }
  }
  // spec/app/saga.md, "Story: Play five campaigns"
  function visit(who: Peer) {
    peers([who], enemies);
    const E = enemies.find((each) => each.peer?.id === who.id);
    if (E) { E.shade = true; visitor = { x: who.x, y: who.y, met: false }; }
  }
  /** Sets each stand-in where its player's game last said it was, each step, so that nothing here moves it. */
  function followPeers() {
    followRemote();
    for (const E of [...enemies, ...allies]) {
      const p = E.peer && heard.get(E.peer.id);
      if (!p) continue;
      Body.setPosition(E.body, { x: p.x, y: p.y }); Body.setVelocity(E.body, { x: p.vx, y: p.vy });
    }
  }
  function struck(_by: string, blow: Hurt) {
    const H = S.hero;
    // A fighter in the middle of a special cannot be hit, here as against the waves.
    if (!H || !H.alive || H.special || !(S.match.duel || S.coop)) return;
    hurt(H, blow);
    sfx.hit(!!blow.heavy);
  }
  // spec/app/bout.md, "Story: Fight for the pot"
  /** The arena server keeps a duel's health: a standing fighter's is brought to what it says, as a blow without a push
   *  where it says less (a fighter it says is down goes down), or as healing where it says more. */
  function heldTo(hp: number) {
    const H = S.hero;
    if (!H || !H.alive || !(S.match.duel || S.coop) || hp === S.match.hp) return;
    if (hp > S.match.hp) { send({ type: "heal", amount: Math.min(100, hp - S.match.hp) }); return; }
    send({ type: "suffer", damage: S.match.hp - Math.max(0, hp), heavy: false });
    if (!S.match.alive) knockOutHero({ x: 0, y: -6 });
  }
  const fx = (sprite: Omit<Sprite, "age">) => { sprites.push({ ...sprite, age: 0 }); };
  function shot(o: Shot) {
    orbs.push({ ...o, dmg: 0, hero: false, home: false, pierce: false, cd: new Map(), trail: [], spin: 0, ghost: true });
  }


  // ---------- a level the arena server hosts (arena/level.ts) ----------
  /** This game hosts a level for a group and has no fighter of its own in it (`haunt`). */
  let ghost = false;
  /** How many teammates a level's enemies are made tougher for: the others beside the host's own fighter, as many as
   *  in the host's game when a fighter of the group hosted it. */
  const teammates = () => (ghost ? Math.max(0, allies.length - 1) : allies.length);
  function haunt() {
    ghost = true;
    if (S.hero && heroInWorld) { Composite.remove(world, S.hero.body); heroInWorld = false; }
  }

  // ---------- a run the arena server plays (arena/run.ts) ----------
  /** Where the fighter's player's game last said it was, while that game plays it. */
  let steered: Peer | null = null;
  const still = (): Intent => ({ dir: 0, run: false, jumpHeld: false, jumpPressed: false, down: false, P: false, K: false, X: false, special: -1 });
  /** Each step: the fighter where its player's game last said, facing as it said, in the special it said. */
  function followPuppet(H: Fighter, p: Peer) {
    Body.setPosition(H.body, { x: p.x, y: p.y }); Body.setVelocity(H.body, { x: p.vx, y: p.vy });
    H.facing = p.facing; H.atk = null;
    const sp = p.special, def = sp ? CHARS.flatMap((c) => c.specials)[sp.slot] : undefined;
    H.special = sp && def ? { def, kind: SK[def.kind], p: def.p ?? {}, t: sp.t, dur: SK[def.kind].dur, ang: sp.ang, c: sp.c } : null;
  }

  // ---------- co-op (docs/coop-plan.md) ----------
  // The host's game runs the level's enemies and tells the others where they are about twelve times a second
  // (`world`); the others keep stand-ins for them, drawn a little in the past, between the two words either side of
  // the moment drawn (`followRemote`), so that they move smoothly however the words come. A blow on a stand-in is told
  // to the host's game, which takes it (`hitFoe`).
  let byOther = false;
  /** The host's words of the world as they came, by this game's clock: the last three. */
  const heardWorlds: { at: number; foes: Map<number, FoeWord> }[] = [];
  /** How far in the past stand-ins are drawn, in milliseconds: as far as the gaps between the host's words need, so
   *  that there is nearly always a word on each side of the moment drawn (eased towards it, so time never jumps); and
   *  how long one may go on as it was going once nothing newer has come. */
  const WORLD_LEAST = 60, WORLD_MOST = 240, WORLD_GUESS = 150;
  let worldBehind = 110, worldDrawn = 0;
  const worldGaps: number[] = [];
  function coop(part: { host: boolean } | null) {
    const was = S.coop;
    S.coop = part;
    if (!part) { peers([], allies); return; }
    // The host gone, this game takes the level over: its stand-ins become its enemies, and fight on from where they are.
    if (part.host && was && !was.host) {
      for (const E of enemies) if (E.remote) {
        Object.assign(E, { remote: false, shown: null, cool: 40, artCool: 180 + rnd() * 240, stun: 0 });
        uids = Math.max(uids, E.uid);
      }
      heardWorlds.length = 0;
    }
  }
  function worldWord(): World {
    const foes: FoeWord[] = [];
    for (const E of enemies) {
      if (!E.alive || E.peer || E.remote) continue;
      const p = E.body.position, v = E.body.velocity, at = E.cast ? castFrame(E, E.cast, S.time) : { anim: "", frame: 0 };
      foes.push([E.uid, E.cast ?? "", Math.round(p.x), Math.round(p.y), Math.round(v.x * 10) / 10, Math.round(v.y * 10) / 10, E.facing, Math.round(E.hp), Math.round(E.maxHp), E.big,
        (E.boss ? 1 : 0) | (E.final ? 2 : 0) | (E.caster ? 4 : 0) | (E.flash > 0 ? 8 : 0), at.anim, Math.round(at.frame * 10) / 10, E.boss ? E.tag ?? "" : ""]);
    }
    const said: World = { foes, orbs: outbox.orbs.splice(0), fx: outbox.fx.splice(0), warns: outbox.warns.splice(0) };
    return said;
  }
  function heardWorld(w: World, at: number) {
    // A level's group, or a paid run's guest, which has no level of rooms (arena/run.ts).
    if (!S.coop || S.coop.host) return;
    const foes = new Map(w.foes.map((f) => [f[0], f]));
    const was = heardWorlds[heardWorlds.length - 1];
    if (was) { worldGaps.push(at - was.at); if (worldGaps.length > 40) worldGaps.shift(); }
    heardWorlds.push({ at, foes });
    if (heardWorlds.length > 3) heardWorlds.shift();
    for (const o of w.orbs) shot(o);
    for (const s of w.fx) fx(s);
    for (const each of w.warns) { if ("ring" in each) rings.push({ ...each.ring }); else floaters.push({ ...each.name }); }
    // New stand-ins for enemies not seen before; and those the host no longer has have fallen.
    for (const f of w.foes) if (!enemies.some((E) => E.remote && E.uid === f[0])) standIn(f);
    for (const E of enemies.slice()) if (E.remote && !foes.has(E.uid)) fellThere(E);
    for (const E of enemies) {
      const f = E.remote ? foes.get(E.uid) : undefined;
      if (!f) continue;
      E.hp = f[7]; E.maxHp = f[8]; E.facing = f[6]; E.final = !!(f[10] & 2);
      if (f[10] & 8) E.flash = Math.max(E.flash, 2);
      E.shown = f[11] ? { anim: f[11], frame: f[12] } : null;
      if (E.boss && f[13]) E.tag = f[13];
    }
  }
  /** A stand-in for the host's enemy `f`: drawn as it is, a boss as a boss. */
  function standIn(f: FoeWord) {
    const [uid, cast, x, y, , , , hp, maxHp, big, flags] = f;
    enemyAt(x, y, !!(flags & 4), (cast || undefined) as CastId | undefined);
    const E = enemies[enemies.length - 1];
    Object.assign(E, { uid, remote: true, hp, maxHp, final: !!(flags & 2), artCool: Infinity });
    if (flags & 1 && big > 1) {
      Body.scale(E.body, big, big); Body.setInertia(E.body, Infinity);
      Object.assign(E, { big, caster: false, tag: f[13] || bossName, boss: { move: null, t: 0, dir: 1, hit: false } });
      shake(6);
    }
    play("puff", x, E.body.bounds.max.y, "enemy", E.big > 1 ? 2 : 0.8);
  }
  /** One the host's game says has fallen: it falls here as it would have, and leaves what a fallen foe leaves. */
  function fellThere(E: Fighter) {
    if (!E.alive) return;
    leaveWorld(E, { x: E.body.velocity.x * 1.5, y: -6 });
    E.alive = false;
    enemies.splice(enemies.indexOf(E), 1);
    streak = sinceKo < COMBO_STEPS ? streak + 1 : 1; sinceKo = 0;
    floaters.push({ x: E.body.position.x, y: E.body.position.y - 90, text: "K.O.", life: 36, red: true });
    play("puff", E.body.position.x, E.body.bounds.max.y, "enemy");
    if (E.boss) fall(E);
    leave(E);
  }
  /** Each step: every stand-in where the host's game had it a moment ago, eased between the two words either side. */
  function followRemote() {
    if (!S.coop || S.coop.host || !heardWorlds.length) return;
    const now = performance.now(), sorted = [...worldGaps].sort((p, q) => p - q);
    const want = Math.max(WORLD_LEAST, Math.min(WORLD_MOST, (sorted[Math.floor(sorted.length * 0.9)] ?? 100) + 20));
    worldBehind += (want - worldBehind) * Math.min(1, Math.min(100, now - (worldDrawn || now)) / 1500); worldDrawn = now;
    const when = now - worldBehind;
    let i = heardWorlds.length - 1;
    while (i > 0 && heardWorlds[i].at > when) i--;
    const a = heardWorlds[i], b = heardWorlds[i + 1];
    for (const E of enemies) {
      if (!E.remote) continue;
      const fa = a.foes.get(E.uid), fb = b?.foes.get(E.uid);
      if (!fa && !fb) continue;
      let x: number, y: number, vx: number, vy: number;
      if (fa && fb) {
        const k = Math.max(0, Math.min(1, (when - a.at) / Math.max(1, b.at - a.at)));
        x = fa[2] + (fb[2] - fa[2]) * k; y = fa[3] + (fb[3] - fa[3]) * k; vx = fb[4]; vy = fb[5];
      } else {
        // Past the last word: on as it was going, for a moment.
        const f = (fb ?? fa)!, ahead = Math.max(0, Math.min(WORLD_GUESS, when - (fb ? b.at : a.at))) / (1000 / 60);
        x = f[2] + f[4] * ahead; y = f[3] + f[5] * ahead; vx = f[4]; vy = f[5];
      }
      Body.setPosition(E.body, { x, y }); Body.setVelocity(E.body, { x: vx, y: vy });
    }
  }
  function hitFoe(uid: number, blow: Hurt) {
    const E = enemies.find((each) => each.uid === uid && !each.remote && !each.peer);
    if (!E || !E.alive || !S.coop?.host) return;
    byOther = true;
    try { hurt(E, blow); } finally { byOther = false; }
  }
  function shared(e: Shared, from: string) {
    if (!S.coop || !S.level) return;
    if (e.e === "amb") ambushed.add(e.i);
    else if (e.e === "key") foundKey(e.i, heard.get(from)?.name ?? "A teammate");
    else if (e.e === "clear" && !S.match.cleared) {
      // The group is out: one down is carried out with it, on its feet.
      if (!S.match.alive && (send({ type: "revive" }) || send({ type: "bargain" }))) { S.down = null; Composite.add(world, hero().body); heroInWorld = true; }
      if (send({ type: "clear" })) { ui.banner("Chapter clear", "gold"); sfx.power(); }
      else ui.teamClear?.();
    }
  }

  const talk = (on: boolean) => {
    S.talking = on; clearInput();
    // The fighter arrives squashed small and springs up to its height: held still, it stands at its height.
    if (on && S.hero) { S.hero.squash = 0; S.hero.squashV = 0; }
  };

  return { scene: S, press, release, clearInput, toggleRun: () => (input.run = !input.run), begin, frame, talk, again, bargain, answer, title: (boss: string | null) => { bossName = boss; }, trial, specials: () => { const own = CHARS[S.match.fighter].specials; return kit ? [...kit.slice(0, 3), ...own.slice(3)] : own; }, gift, visit, peers: (list: Peer[]) => peers(list), struck, heldTo, puppet: (word: Peer | null) => { steered = word; }, plunge: plunged, haunt, shot, fx, coop, world: worldWord, heardWorld, hitFoe, shared };
}

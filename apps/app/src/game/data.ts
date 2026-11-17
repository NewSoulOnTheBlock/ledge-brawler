// spec/app/index.md, "Story: Choose a fighter"
// The roster, poses and input tables of the arena. Health, aura costs and flight drain are the spec's;
// what is here is how each fighter looks, moves and hits.

import { SPRITES } from "./sprites.ts";

export interface Vec { x: number; y: number }
export type Joint = "hip" | "shoulder" | "head" | "elbowF" | "fistF" | "elbowB" | "fistB" | "kneeF" | "footF" | "kneeB" | "footB";
export type Skeleton = Record<Joint, Vec>;
/** [torso, head, armF.upper, armF.lower, armB.upper, armB.lower, legF.upper, legF.lower, legB.upper, legB.lower], in radians. */
export type Pose = number[];
export type Key = [number, Pose];

export const STANCE: Pose = [0.08, -0.05, 0.55, 1.9, 0.25, 2.1, 0.28, -0.12, -0.22, -0.05];
export const TUCK: Pose = [0.35, 0.2, 1.3, 2.2, 0.9, 2.2, 1.7, -2.5, 1.45, -2.4];
export const STUN: Pose = [-0.45, 0.35, -0.5, 0.9, -1.3, 0.6, 0.35, -0.5, -0.25, -0.2];
export const AIR_FALL: Pose = [0.1, 0, 1.9, 0.3, -1.4, 0.3, 0.5, -0.9, -0.15, -0.3];
export const AIR_RISE: Pose = [0.15, 0, 2.4, 0.4, -0.9, 0.6, 1.1, -1.5, -0.25, -0.9];
export const JAB_S: Pose = [0.22, -0.1, 1.5, 0.04, 0.3, 2.2, 0.45, -0.3, -0.45, -0.1];
export const CROSS_S: Pose = [0.34, -0.12, 0.35, 2.0, 1.5, 0.04, 0.5, -0.35, -0.5, -0.1];
export const KICK_X: Pose = [-0.38, 0.1, 0.9, 1.7, -0.3, 1.6, 1.66, -0.02, -0.18, -0.05];
export const CHARGE: Pose = [-0.12, -0.2, 0.35, 0.5, -0.35, 0.6, 0.45, -0.25, -0.45, -0.15];
export const FLY_MOVE: Pose = [1.15, -0.95, 2.95, 0.05, 0.4, 0.3, -1.2, -0.2, -1.45, -0.5];
export const FLY_HOVER: Pose = [0.05, 0, 0.9, 2.0, 0.6, 2.1, 0.15, -0.35, -0.1, -0.6];
export const BEAM_CHARGE: Pose = [-0.05, 0.1, -0.9, 1.9, -0.8, 1.8, 0.45, -0.35, -0.5, -0.1];
export const BEAM_FIRE: Pose = [0.2, -0.05, 1.55, 0.02, 1.5, 0.05, 0.55, -0.3, -0.55, -0.1];
export const VOLLEY_A: Pose = [0.1, 0, 1.5, 0.02, 0.2, 2.1, 0.6, -1.0, -0.2, -0.8];
export const VOLLEY_B: Pose = [0.1, 0, 0.2, 2.1, 1.5, 0.02, 0.6, -1.0, -0.2, -0.8];
export const NOVA_GATHER: Pose = [0.4, 0.3, 0.9, 2.3, 0.7, 2.3, 0.9, -1.6, 0.5, -1.4];
export const NOVA_RELEASE: Pose = [-0.2, -0.3, 2.6, 0.1, -2.6, -0.1, 0.7, 0, -0.7, 0];
export const SLAM_UP: Pose = [-0.1, -0.3, 2.9, 0.2, 2.8, 0.2, 0.4, -0.3, -0.4, -0.2];
export const SLAM_DOWN: Pose = [0.75, 0.3, 1.0, 0.2, 0.9, 0.2, 1.1, -1.8, -0.3, -1.2];
export const RAISE: Pose = [0, -0.4, 3.0, 0.05, 0.4, 1.6, 0.3, -0.15, -0.3, -0.1];
/** Both hands on a wall, knees drawn up. */
export const CLIMB: Pose = [0.12, -0.15, 2.5, 0.4, 2.0, 0.8, 1.2, -1.7, 0.5, -1.3];
export const BOTH_UP: Pose = [0, -0.4, 2.7, 0.1, -2.7, -0.1, 0.3, -0.15, -0.3, -0.1];
/** A ground pose with its legs tucked for the air. */
export const airify = (p: Pose): Pose => [p[0], p[1], p[2], p[3], p[4], p[5], 0.6, -1.2, -0.2, -0.8];

export const smooth = (t: number) => t * t * (3 - 2 * t);

/** The pose at `t` (0 to 1) along keyframes, eased between each pair. */
export function sampleKeys(keys: Key[], t: number): Pose {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i];
      const k = smooth((t - t0) / Math.max(1e-6, t1 - t0));
      return a.map((v, j) => v + (b[j] - v) * k);
    }
  }
  return keys[keys.length - 1][1];
}

const LEN = { torso: 30, neck: 16, upper: 16, lower: 16, thigh: 20, shin: 21 };

/** Forward kinematics: the joints of `pose` in world space, hips at (hx, hy), facing `f`. */
export function skeleton(pose: Pose, hx: number, hy: number, f: number): Skeleton {
  const up = (a: number, len: number) => ({ x: Math.sin(a) * f * len, y: -Math.cos(a) * len });
  const down = (a: number, len: number) => ({ x: Math.sin(a) * f * len, y: Math.cos(a) * len });
  const add = (p: Vec, v: Vec) => ({ x: p.x + v.x, y: p.y + v.y });
  const hip = { x: hx, y: hy };
  const shoulder = add(hip, up(pose[0], LEN.torso));
  const head = add(hip, up(pose[0] + pose[1], LEN.torso + LEN.neck));
  const elbowF = add(shoulder, down(pose[2], LEN.upper)), fistF = add(elbowF, down(pose[2] + pose[3], LEN.lower));
  const elbowB = add(shoulder, down(pose[4], LEN.upper)), fistB = add(elbowB, down(pose[4] + pose[5], LEN.lower));
  const kneeF = add(hip, down(pose[6], LEN.thigh)), footF = add(kneeF, down(pose[6] + pose[7], LEN.shin));
  const kneeB = add(hip, down(pose[8], LEN.thigh)), footB = add(kneeB, down(pose[8] + pose[9], LEN.shin));
  return { hip, shoulder, head, elbowF, fistF, elbowB, fistB, kneeF, footF, kneeB, footB };
}

export const SLOTS = ["three", "whirl", "launch", "storm", "sweep", "hammer", "elbow", "vanish", "juggle", "sky"] as const;
export type Slot = (typeof SLOTS)[number];

/** A key or a hold, as the move list shows it. */
export type Input = string[];
export const SLOT_INPUTS: Record<Slot, Input> = {
  three: ["J", "J", "J"], whirl: ["K", "K", "K"], launch: ["J", "J", "K"], storm: ["K", "J", "J"],
  sweep: ["hold", "S", "+", "K"], hammer: ["in air, hold", "S", "+", "J"], elbow: ["→", "→", "J"], vanish: ["←", "→", "K"],
  juggle: ["in air", "J", "J", "K"], sky: ["→", "↓", "→", "J"],
};
export const SPECIAL_INPUTS: Input[] = [["↓", "→", "L", "or", "1"], ["←", "→", "L", "or", "2"], ["↓", "↓", "L", "or", "3"], ["→", "↓", "L", "or", "4"], ["→", "→", "L", "or", "5"], ["→", "↓", "→", "L", "or", "6"]];
export const SPECIAL_SHORT = ["↓→L", "←→L", "↓↓L", "→↓L", "→→L", "→↓→L"];
/** What can be carried in the bag and used in a fight (sim.ts, `useItem`). */
export type ItemId = "draught" | "vial" | "bomb" | "ward" | "haste" | "scroll";
export interface ItemDef {
  name: string; says: string;
  /** How often it is what a fallen foe leaves, against the others. */
  weight: number;
  /** Its picture (sprites.ts). */
  icon: string[]; colours: Record<string, string>;
}
export const ITEMS: Record<ItemId, ItemDef> = {
  draught: { name: "Healing Draught", says: "35 health back", weight: 5, ...SPRITES.draught },
  vial: { name: "Aura Vial", says: "50 aura", weight: 4, ...SPRITES.vial },
  haste: { name: "Haste Tonic", says: "Faster for eight seconds", weight: 3, ...SPRITES.haste },
  bomb: { name: "Fire Bomb", says: "Thrown, and bursts", weight: 4, ...SPRITES.bomb },
  ward: { name: "Ward Charm", says: "No harm for five seconds", weight: 2, ...SPRITES.ward },
  scroll: { name: "Storm Scroll", says: "Lightning on every foe near", weight: 2, ...SPRITES.scroll },
};
/** Words in an `Input` that are not keys. */
export const WORDS = new Set(["hold", "in air", "in air, hold", "+", "or"]);

export const GROUND_CHAIN: Record<string, string> = { P: "jab", PP: "cross", PPP: "@three", K: "kick", KK: "roundhouse", KKK: "@whirl", PPK: "@launch", KP: "jab", KPP: "@storm" };
export const AIR_CHAIN: Record<string, string> = { P: "airjab", PP: "aircross", PPK: "@juggle", K: "airkick" };

/** What `discover` of the spec counts: the ten combos, the three specials, then the four powers. */
export const FOUND = { special: SLOTS.length, blast: 13, fly: 14, charge: 15, overdrive: 16 };
/** Combos and specials: what the HUD counts as moves. */
export const MOVES_TO_FIND = 13;

export type Element = "ink" | "fire" | "water" | "volt" | "leaf";

/**
 * The pixel effects of ./pixelfx the arena plays: how many seconds of the effect to show, how fast to run it, how
 * many world pixels one of its pixels covers, and how far in to start.
 */
export const FX = {
  boom: { id: "explosions/plasma-explosion", seconds: 1.7, rate: 1.5, scale: 2 },
  ring: { id: "arcane/mana-burst", seconds: 1.8, rate: 1.4, scale: 3 },
  surge: { id: "explosions/implosion", seconds: 1.65, rate: 1.2, scale: 3 },
  puff: { id: "spawn/poof", seconds: 1.6, rate: 1.7, scale: 2.2 },
  slam: { id: "impacts/ground-slam", seconds: 3.2, rate: 2, scale: 2 },
  flame: { id: "fire/flame-pillar", seconds: 5, rate: 2.4, scale: 2, skip: 0.35 },
  zap: { id: "lightning/zap-hit", seconds: 0.9, rate: 1, scale: 2.5 },
  crit: { id: "impacts/crit-hit", seconds: 0.9, rate: 1.2, scale: 1.8 },
  spark: { id: "impacts/hit-spark", seconds: 0.5, rate: 1, scale: 1.8 },
  thorns: { id: "nature/thorns", seconds: 2.4, rate: 1.5, scale: 2.6 },
  quake: { id: "nature/quake", seconds: 3.1, rate: 1.6, scale: 2.6 },
  whirl: { id: "water/whirlpool", seconds: 1.3, rate: 1, scale: 4 },
  // The greater arts'. `hit` is when, in the effect's own seconds, its blow lands (sim.ts, `land`); a loop plays
  // for `seconds` of its own time.
  smite: { id: "holy/smite", seconds: 2.8, rate: 1.6, scale: 1.6, hit: 0.54 },
  holyPillar: { id: "holy/holy-pillar", seconds: 3.5, rate: 1.5, scale: 1.6, hit: 0.3 },
  runeCircle: { id: "arcane/rune-circle", seconds: 1.6, rate: 1, scale: 1.4 },
  timeStop: { id: "arcane/time-stop", seconds: 3.6, rate: 1.6, scale: 2.4 },
  eclipse: { id: "shadow/eclipse", seconds: 2.1, rate: 1, scale: 2.2 },
  blackHole: { id: "shadow/black-hole", seconds: 1.9, rate: 1, scale: 2 },
  bigBoom: { id: "explosions/big-explosion", seconds: 7.2, rate: 3, scale: 1.5 },
  nuke: { id: "explosions/nuke", seconds: 9, rate: 2.6, scale: 1.8 },
  meteor: { id: "fire/meteor", seconds: 5, rate: 2.2, scale: 1.3, hit: 0.62 },
  fireTornado: { id: "fire/fire-tornado", seconds: 3.3, rate: 1, scale: 2.3 },
  iceLance: { id: "ice/ice-lance", seconds: 1.3, rate: 1, scale: 1.1 },
  freeze: { id: "ice/freeze", seconds: 4, rate: 2, scale: 1.1 },
  frostNova: { id: "ice/frost-nova", seconds: 3.4, rate: 1.4, scale: 2.4, hit: 0.42 },
  blizzard: { id: "ice/blizzard-vortex", seconds: 2.2, rate: 1, scale: 3.4 },
  shatter: { id: "ice/ice-shatter", seconds: 2.8, rate: 1.6, scale: 1.4 },
  waveCrash: { id: "water/wave-crash", seconds: 3.2, rate: 2, scale: 1.8 },
  chain: { id: "lightning/chain-lightning", seconds: 1.8, rate: 1.4, scale: 1.4 },
  plasma: { id: "lightning/plasma-ball", seconds: 4.6, rate: 1, scale: 2.2 },
  stormCloud: { id: "lightning/storm-cloud", seconds: 2.6, rate: 1, scale: 2.4 },
  strike: { id: "lightning/lightning-strike", seconds: 3, rate: 2, scale: 1.3 },
  thunderclap: { id: "lightning/thunderclap", seconds: 1.9, rate: 1.2, scale: 1.8 },
  roots: { id: "nature/root-snare", seconds: 2.7, rate: 1.2, scale: 1.6 },
  earthSpike: { id: "nature/earth-spike", seconds: 3.4, rate: 1.4, scale: 1.3, hit: 0.34 },
  poison: { id: "nature/poison-cloud", seconds: 4.2, rate: 1, scale: 2.2 },
  spores: { id: "nature/spore-burst", seconds: 3.2, rate: 1.4, scale: 2 },
  leafStorm: { id: "nature/leaf-storm", seconds: 2.2, rate: 1, scale: 3 },
  bloom: { id: "nature/healing-bloom", seconds: 3.3, rate: 1.2, scale: 2.2 },
} as const;
export type FxName = keyof typeof FX;
export type Tone = Element | "enemy";
/** The pixelfx colour ramp of each element; enemies hit in blood red. */
export const FX_PALETTE: Record<Tone, string> = { fire: "fire", volt: "arcane", water: "water", leaf: "leaf", ink: "gold", enemy: "blood" };
/** Which of the Seeker's palettes a fighter wears, and for the Void palette, a cloak colour and a glow to turn it to. */
export interface Skin { palette: "Void" | "Bone" | "Ember" | "Frost"; tint?: [string, string] }
/** Enemies wear bone; a caster is darker, with red eyes. */
export const ENEMY_SKIN: Skin = { palette: "Bone" };
export const CASTER_SKIN: Skin = { palette: "Void", tint: ["#4d4d4a", "#d42a1e"] };
export interface SpecialDef { name: string; cost: number; kind: string; p?: Record<string, number | string> }
export interface Char {
  id: string; name: string; title: string; color: string; aura: string; fx: string; orb: string; element: Element; skin: Skin;
  spd: number; pow: number; airJumps: number;
  /** How it comes down (sim.ts, stepFighter): the pull added on the way down, as a multiple of plain gravity, and the
   *  fastest it falls, in pixels a step. Every fighter falls lighter than gravity alone would let a brawler; the
   *  heaviest drops, the lightest drifts. */
  fall: { pull: number; most: number };
  blast: { r: number; speed: number; dmg: number };
  /** Power, speed, health and energy, each out of five. */
  rate: [number, number, number, number];
  blurb: string;
  slots: Record<Slot, [string, string]>;
  specials: SpecialDef[];
}

/** In the order of the spec's fighters: `fighter` 0 is Ink. */
export const CHARS: Char[] = [
  { id: "ink", name: "Ink", title: "The Balanced Fist", color: "#111111", aura: "#f2b200", fx: "242,178,0", orb: "#ffd54a", element: "ink", skin: { palette: "Void", tint: ["#111111", "#f2b200"] },
    spd: 1, pow: 1, airJumps: 1, fall: { pull: 1.2, most: 13 }, blast: { r: 9, speed: 12.5, dmg: 9 }, rate: [3, 3, 3, 3],
    blurb: "Even at everything. Clean hits fill aura faster than anyone else.",
    slots: { three: ["hook", "Three-Step Strike"], whirl: ["tornado", "Whirlwind"], launch: ["knee", "Launcher Rush"], storm: ["flurry", "Storm Fists"], sweep: ["sweep", "Ground Sweep"], hammer: ["hammer", "Hammer Drop"], elbow: ["elbow", "Dash Elbow"], vanish: ["vanish", "Vanish Strike"], juggle: ["spike", "Air Juggle"], sky: ["skyward", "Skyward Fist"] },
    specials: [{ name: "Horizon Beam", cost: 50, kind: "beam", p: { width: 30, dmg: 5, sweep: 0, len: 1600, tick: 4 } }, { name: "Meteor Volley", cost: 40, kind: "volley", p: { mode: "aimed" } }, { name: "Nova Burst", cost: 60, kind: "nova", p: { radius: 280, dmg: 26 } },
      { name: "Rune Guillotine", cost: 70, kind: "guillotine" }, { name: "Black Sun", cost: 80, kind: "blacksun" }, { name: "Verdict", cost: 100, kind: "verdict" }] },
  { id: "ember", name: "Ember", title: "The Furnace", color: "#d42a1e", aura: "#ff7a1a", fx: "255,122,26", orb: "#ff8a3d", element: "fire", skin: { palette: "Ember" },
    spd: 0.88, pow: 1.3, airJumps: 1, fall: { pull: 1.6, most: 15 }, blast: { r: 13, speed: 9, dmg: 14 }, rate: [5, 2, 5, 2],
    blurb: "Slow, heavy and hard to put down. Every hit leaves enemies burning.",
    slots: { three: ["haymaker", "Furnace Haymaker"], whirl: ["tornado", "Flame Wheel"], launch: ["knee", "Magma Knee"], storm: ["cinder", "Cinder Barrage"], sweep: ["quakestomp", "Quake Stomp"], hammer: ["meteordrop", "Meteor Drop"], elbow: ["bullcharge", "Bull Charge"], vanish: ["lariat", "Iron Lariat"], juggle: ["spike", "Ash Spike"], sky: ["skyward", "Rising Flame"] },
    specials: [{ name: "Inferno Pillars", cost: 50, kind: "pillars" }, { name: "Magma Orb", cost: 40, kind: "bigorb" }, { name: "Eruption", cost: 60, kind: "quake" },
      { name: "Meteor Fall", cost: 70, kind: "meteors" }, { name: "Fire Tornado", cost: 80, kind: "firestorm" }, { name: "Furnace Heart", cost: 100, kind: "furnace" }] },
  { id: "tide", name: "Tide", title: "The Undertow", color: "#1f6fd1", aura: "#36c5f0", fx: "54,197,240", orb: "#7fdcff", element: "water", skin: { palette: "Frost" },
    spd: 1.25, pow: 0.9, airJumps: 2, fall: { pull: 0.9, most: 11.5 }, blast: { r: 8, speed: 17, dmg: 8 }, rate: [2, 5, 2, 3],
    blurb: "The fastest feet on the ledge. Two flips, long dashes, and hits that shove.",
    slots: { three: ["hook", "Breaker Fist"], whirl: ["riptidespin", "Riptide Spin"], launch: ["knee", "Surf Knee"], storm: ["torrent", "Torrent"], sweep: ["undertow", "Undertow"], hammer: ["hammer", "Tidal Crash"], elbow: ["slipstream", "Slipstream"], vanish: ["ripplestep", "Ripple Step"], juggle: ["spike", "Wave Spike"], sky: ["skyward", "Geyser Fist"] },
    specials: [{ name: "Phantom Rush", cost: 50, kind: "rush" }, { name: "Riptide Discs", cost: 40, kind: "discs" }, { name: "Whirlpool", cost: 60, kind: "vortex" },
      { name: "Glacier Lances", cost: 70, kind: "lances" }, { name: "Tidal Wave", cost: 80, kind: "tidal" }, { name: "Absolute Zero", cost: 100, kind: "zero" }] },
  { id: "volt", name: "Volt", title: "The Live Wire", color: "#7b3fe4", aura: "#c58cff", fx: "176,120,255", orb: "#d6b3ff", element: "volt", skin: { palette: "Void" },
    spd: 1.05, pow: 0.95, airJumps: 1, fall: { pull: 1.3, most: 13.5 }, blast: { r: 9, speed: 14, dmg: 9 }, rate: [3, 3, 2, 5],
    blurb: "Half-price blasts and a crackling charge. Every hit stuns a little longer.",
    slots: { three: ["shockpalm", "Shock Palm"], whirl: ["coilkick", "Coil Kick"], launch: ["knee", "Static Lift"], storm: ["flurry", "Spark Fists"], sweep: ["sweep", "Ground Current"], hammer: ["hammer", "Thunder Drop"], elbow: ["railelbow", "Rail Elbow"], vanish: ["vanish", "Blink Kick"], juggle: ["boltspike", "Bolt Spike"], sky: ["skyward", "Thunder Rise"] },
    specials: [{ name: "Arc Lance", cost: 50, kind: "beam", p: { width: 12, dmg: 4, sweep: 0.4, len: 1900, tick: 2 } }, { name: "Spark Fan", cost: 40, kind: "volley", p: { mode: "fan" } }, { name: "Storm Call", cost: 60, kind: "storm" },
      { name: "Chain Lightning", cost: 70, kind: "chain" }, { name: "Ball Lightning", cost: 80, kind: "plasma" }, { name: "Thunder God", cost: 100, kind: "thundergod" }] },
  { id: "moss", name: "Moss", title: "The Drifting Leaf", color: "#2f9e44", aura: "#8ce99a", fx: "81,207,102", orb: "#b2f2bb", element: "leaf", skin: { palette: "Void", tint: ["#2f9e44", "#8ce99a"] },
    spd: 1.1, pow: 0.95, airJumps: 3, fall: { pull: 0.45, most: 8.5 }, blast: { r: 9, speed: 11, dmg: 9 }, rate: [2, 4, 3, 4],
    blurb: "Lives in the air. Three flips, cheap flight, and hits that leave enemies floating.",
    slots: { three: ["hook", "Vine Uppercut"], whirl: ["leafcyclone", "Leaf Cyclone"], launch: ["knee", "Sprout Knee"], storm: ["petalstorm", "Petal Storm"], sweep: ["vinetrip", "Vine Trip"], hammer: ["hammer", "Falling Oak"], elbow: ["elbow", "Gale Dash"], vanish: ["vanish", "Leaf Step"], juggle: ["galejuggle", "Gale Juggle"], sky: ["skyward", "Sky Seed"] },
    specials: [{ name: "Gale Cyclone", cost: 50, kind: "cyclone" }, { name: "Thorn Rain", cost: 40, kind: "rain" }, { name: "Twin Echo", cost: 60, kind: "echo" },
      { name: "Root Prison", cost: 70, kind: "roots" }, { name: "Spore Bloom", cost: 80, kind: "spores" }, { name: "World Tree", cost: 100, kind: "worldtree" }] },
];


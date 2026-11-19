// spec/app/index.md, "Story: Choose a fighter"
// How a fighter is drawn: the Hooded Seeker (character art by Primitive Pixels), in the palette data.ts gives each
// fighter. The pack has no kick and no charge: those two are made from his frames in Aseprite (art/seeker/make.lua).
// Every move on a fighter's move list has an animation of its own, choreographed from his frames in Aseprite
// (art/seeker/moves.lua) and listed in seeker/moves/moves.json.
// Where a fighter is and what it hits are sim.ts's.
import type { Skin } from "./data.ts";
import type { Fighter } from "./sim.ts";

type Ctx = CanvasRenderingContext2D;
interface Anim { file: string; w: number; h: number; frames: number; feet: [number, number] }
/** Frame sizes, counts and feet points as the pack's animation guide gives them. */
const ANIMS = {
  idle: { file: "Idle_30x30_24f", w: 30, h: 30, frames: 24, feet: [15, 28] },
  run: { file: "Run_30x30_10f", w: 30, h: 30, frames: 10, feet: [17, 28] },
  jump: { file: "JumpFall_30x30_28f", w: 30, h: 30, frames: 28, feet: [16, 28] },
  flip: { file: "DoubleJump_55x80_14f", w: 55, h: 80, frames: 14, feet: [26, 51] },
  dash: { file: "Dash_30x30_5f", w: 30, h: 30, frames: 5, feet: [18, 26] },
  slide: { file: "WallSlide_30x30_5f", w: 30, h: 30, frames: 5, feet: [14, 28] },
  climb: { file: "Climb_30x30_9f", w: 30, h: 30, frames: 9, feet: [15, 28] },
  swing: { file: "Attack1_90x50_8f", w: 90, h: 50, frames: 8, feet: [16, 38] },
  backswing: { file: "Attack2_90x50_5f", w: 90, h: 50, frames: 5, feet: [18, 43] },
  lunge: { file: "Attack3_200x50_10f", w: 200, h: 50, frames: 10, feet: [102, 43] },
  airSwing: { file: "JumpAttack_90x50_9f", w: 90, h: 50, frames: 9, feet: [19, 44] },
  upSwing: { file: "UpAttack_55x80_8f", w: 55, h: 80, frames: 8, feet: [23, 78] },
  downSwing: { file: "DownAttack_55x80_7f", w: 55, h: 80, frames: 7, feet: [21, 42] },
  heavy: { file: "HeavyAttack_117x80_11f", w: 117, h: 80, frames: 11, feet: [33, 72] },
  bow: { file: "Bow_55x80_22f", w: 55, h: 80, frames: 22, feet: [25, 53] },
  cast: { file: "Cast_40x40_11f", w: 40, h: 40, frames: 11, feet: [19, 33] },
  hurt: { file: "Hurt_55x80_9f", w: 55, h: 80, frames: 9, feet: [26, 52] },
  knockback: { file: "HurtKnockback_55x80_9f", w: 55, h: 80, frames: 9, feet: [40, 52] },
  death: { file: "Death_40x50_20f", w: 40, h: 50, frames: 20, feet: [20, 48] },
  kick: { file: "Kick_44x30_6f", w: 44, h: 30, frames: 6, feet: [15, 28] },
  charge: { file: "Charge_34x38_8f", w: 34, h: 38, frames: 8, feet: [17, 36] },
  // Made in Aseprite too (art/seeker/make.lua). Its "feet" put his hands on the lip of the ledge he hangs from: the
  // body hangs beside the corner (sim.ts, `stepHang`), and the figure is drawn over the corner, gripping it.
  hang: { file: "Hang_30x38_8f", w: 30, h: 38, frames: 8, feet: [8.5, 25.6] },
} satisfies Record<string, Anim>;
export type AnimName = keyof typeof ANIMS;
/** A move's own animation: its sheet under seeker/moves, and how long each frame shows. */
interface MoveAnim { name: string; file: string; w: number; h: number; frames: number; feet: [number, number]; ms: number[] }
const MOVES = Object.values(import.meta.glob<Record<string, MoveAnim>>("./seeker/moves/moves.json", { eager: true, import: "default" }))[0] ?? {};
/** A frame of one of the Seeker's animations, or of the move animation `move` ("ink/hook"). */
export type Frame = { anim: AnimName; frame: number } | { move: string; frame: number };
/** A fighter's look: its skin, and whether its dash is spent, which pales it until it lands. */
export interface Look { skin: Skin; spent?: boolean }

/** World pixels to a sprite pixel: the Seeker stands 24 tall, a fighter's body 84. */
export const SCALE = 3.5;
const DEATH_MS = [100, 80, 80, 80, 100, 80, 70, 70, 70, 70, 70, 80, 80, 80, 80, 80, 80, 80, 80, 900];

const urls = import.meta.glob<string>("./seeker/**/*.png", { eager: true, query: "?url", import: "default" });
const sources = new Map<string, HTMLImageElement>();
const sheets = new Map<string, HTMLCanvasElement>();

/** The animation a frame belongs to, and where its sheet is for a palette. */
const animOf = (at: Frame): Anim => ("move" in at ? MOVES[at.move] : ANIMS[at.anim]);
const pathOf = (at: Frame, palette: string) => ("move" in at ? `./seeker/moves/${MOVES[at.move].file}.png` : `./seeker/${palette}/Seeker_${palette}_${ANIMS[at.anim].file}.png`);

function source(at: Frame, palette: string) {
  const key = pathOf(at, palette);
  let image = sources.get(key);
  if (!image) { image = new Image(); image.src = urls[key]; sources.set(key, image); }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** Loads every sheet of every palette, so that no animation is missing the first time it is needed. */
export function loadFigures(): Promise<unknown> {
  return Promise.all(Object.keys(urls).map((key) => {
    let image = sources.get(key);
    if (!image) { image = new Image(); image.src = urls[key]; sources.set(key, image); }
    return image.decode().catch(() => undefined);
  }));
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The sheet of `name` for `look`: its palette as drawn, or the Void palette's purples and greens turned to the skin's tint. */
function sheet(at: Frame, look: Look): HTMLCanvasElement | null {
  const { skin } = look, key = `${pathOf(at, skin.palette)}|${skin.tint?.join()}|${look.spent ? 1 : 0}`;
  const made = sheets.get(key);
  if (made) return made;
  const image = source(at, skin.palette);
  if (!image) return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  if (skin.tint || look.spent) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), d = pixels.data;
    let cloak = skin.tint ? rgb(skin.tint[0]) : null;
    const glow = skin.tint ? rgb(skin.tint[1]) : null;
    // An ink-black cloak keeps enough grey for its folds to show.
    if (cloak && Math.max(...cloak) < 60) cloak = [62, 62, 68];
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (cloak && glow) {
        if (b > g + 10 && r > g) {
          const light = Math.max(r, g, b) / 149, shade = 0.3 + 0.8 * Math.min(1, light), white = Math.max(0, light - 1);
          for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, cloak[k] * shade + (255 - cloak[k] * shade) * white);
        } else if (g > r + 15 && g >= b) {
          const light = g / 255, white = Math.max(0, (r - 100) / 155);
          for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, glow[k] * Math.min(1, light / 0.75) * (1 - white) + 255 * white);
        }
      }
      // Paled: everything but the black of the body fades towards the paper.
      if (look.spent && Math.max(d[i], d[i + 1], d[i + 2]) > 40) for (let k = 0; k < 3; k++) d[i + k] += (235 - d[i + k]) * 0.55;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  sheets.set(key, canvas);
  return canvas;
}

/** Draws one frame with its feet point at (x, y), facing `facing`; `stretch` pulls it taller and thinner, or below 0 squashes it. */
export function drawFigure(ctx: Ctx, look: Look, at: Frame, x: number, y: number, facing: number, alpha = 1, scale = SCALE, stretch = 0) {
  const a = animOf(at), image = sheet(at, look);
  if (!image) return;
  const frame = Math.max(0, Math.min(a.frames - 1, Math.floor(at.frame)));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale((facing < 0 ? -scale : scale) * (1 - stretch * 0.6), scale * (1 + stretch));
  ctx.drawImage(image, frame * a.w, 0, a.w, a.h, -a.feet[0], -a.feet[1], a.w, a.h);
  ctx.restore();
}

/** Which of the Seeker's attacks stands for each move; a move not listed is a first swing. */
const MOVE_ANIM: Record<string, AnimName> = {
  cross: "backswing", aircross: "backswing", vanish: "backswing", ripplestep: "backswing",
  hook: "heavy", haymaker: "heavy", lariat: "heavy",
  elbow: "lunge", bullcharge: "lunge", slipstream: "lunge", railelbow: "lunge",
  knee: "upSwing", skyward: "upSwing",
  hammer: "downSwing", meteordrop: "downSwing", spike: "downSwing", boltspike: "downSwing", galejuggle: "downSwing", quakestomp: "downSwing",
  airkick: "airSwing",
  kick: "kick", roundhouse: "kick", sweep: "kick", undertow: "kick", vinetrip: "kick",
  tornado: "flip", riptidespin: "flip", coilkick: "flip", leafcyclone: "flip",
  blast: "cast", shockpalm: "cast",
};
/** Moves that hit again and again: both hands, one swing after the other. */
const FLURRIES = new Set(["flurry", "cinder", "torrent", "petalstorm"]);
/** What each kind of special is played as; a kind not listed is cast. */
const SPECIAL_ANIM: Record<string, AnimName> = { nova: "heavy", pillars: "heavy", quake: "heavy", rain: "bow", rush: "backswing" };

/** The frame of the move animation `move` that is `t` of the way through it (0 to 1), if there is one. */
function moveFrame(move: string, t: number): Frame | null {
  const m = MOVES[move];
  if (!m) return null;
  let total = 0;
  for (const ms of m.ms) total += ms;
  let frame = 0;
  for (let left = Math.max(0, Math.min(0.999, t)) * total; frame < m.frames - 1 && left >= m.ms[frame]; frame++) left -= m.ms[frame];
  return { move, frame };
}
/** Overdrive's flourish plays over its first seventy steps of nine hundred. */
const FLOURISH = 70;

/** The frame that shows what `F` is doing at `time` seconds. */
/** The animations a blow is struck in (`MOVE_ANIM`, and the swings and the bow of `frameOf`): what the arena server
 *  takes as a fighter in the middle of an attack, whose blow may land (arena/arena.ts). */
const STRIKING = new Set<AnimName>([...Object.values(MOVE_ANIM), "swing", "backswing", "bow"]);
export const striking = (at: Frame) => "move" in at || STRIKING.has(at.anim);

export function frameOf(F: Fighter, time: number): Frame {
  const vx = F.body.velocity.x, vy = F.body.velocity.y, id = F.char?.id;
  // A fighter with a move list plays each move's own animation.
  if (id && F.stun <= 0) {
    const own = F.atk ? moveFrame(`${id}/${F.atk.name}`, F.atk.t / F.atk.def.dur)
      : F.special ? moveFrame(`${id}/${F.special.p.mode === "fan" ? "fan" : F.special.def.kind}`, F.special.t / F.special.dur)
      : F.od > 900 - FLOURISH ? moveFrame(`${id}/overdrive`, (900 - F.od) / FLOURISH)
      : F.charging ? moveFrame(`${id}/charging`, (time * 1.8) % 1)
      : F.dash ? moveFrame(`${id}/dashing`, (time * 2.5) % 1)
      : null;
    if (own) return own;
  }
  if (F.stun > 0) return { anim: Math.abs(vx) > 2.5 ? "knockback" : "hurt", frame: 8 - Math.min(8, F.stun / 3) };
  // Hanging from a ledge: the catch (a jolt up, a drop past), then a slow sway, as the frames were timed in Aseprite.
  if (F.hang) return { anim: "hang", frame: F.hang.t < 4 ? 0 : F.hang.t < 9 ? 1 : 2 + (Math.floor((F.hang.t - 9) / 9) % 6) };
  if (F.atk) {
    const t = F.atk.t / F.atk.def.dur;
    if (FLURRIES.has(F.atk.name)) return Math.floor(time * 9) % 2 ? { anim: "swing", frame: 2 + ((time * 36) % 3) } : { anim: "backswing", frame: 1 + ((time * 36) % 2) };
    const anim = MOVE_ANIM[F.atk.name] ?? "swing";
    // A spin turns for as long as the move lasts; any other attack plays through once.
    // The heavy swing is joined after its long wind-up, which the move itself has no time for.
    return { anim, frame: anim === "flip" ? (t * 28) % 14 : anim === "heavy" ? 3 + t * 8 : t * ANIMS[anim].frames };
  }
  if (F.special) {
    const t = F.special.t / F.special.dur, kind = F.special.def.kind;
    if (kind === "volley" && F.special.p.mode !== "fan") return { anim: "bow", frame: 9 + ((time * 14) % 6) };
    const anim = SPECIAL_ANIM[kind] ?? "cast";
    // Gathered through the first third, held at the release for as long as the special keeps going.
    if (anim === "heavy") return { anim, frame: t < 0.3 ? (t / 0.3) * 4 : 5 + ((t - 0.3) / 0.7) * 6 };
    if (anim === "bow") return { anim, frame: t < 0.15 ? (t / 0.15) * 9 : 9 + ((time * 14) % 6) };
    if (anim === "backswing") return { anim, frame: (time * 16) % 5 };
    return { anim, frame: t < 0.3 ? (t / 0.3) * 8 : t < 0.9 ? 8 : 9 + ((t - 0.9) / 0.1) * 2 };
  }
  if (F.charging) return { anim: "charge", frame: (time * 14) % 8 };
  if (F.dash) return { anim: "dash", frame: (time * 25) % 5 };
  if (F.climb) return vy > 0.5 ? { anim: "slide", frame: (time * 10) % 5 } : { anim: "climb", frame: vy < -0.5 ? (time * 12) % 9 : 0 };
  if (F.spin > 0) return { anim: "flip", frame: F.spin * 14 };
  if (F.flying) return { anim: "jump", frame: Math.abs(vx) > 2.5 ? 8 : 13 + ((time * 6) % 2) };
  if (!F.grounded) {
    if (vy < -2) return { anim: "jump", frame: 1 + (1 - Math.min(1, -vy / 17)) * 11 };
    return vy <= 2 ? { anim: "jump", frame: 13 + ((time * 8) % 2) } : { anim: "jump", frame: 15 + ((time * 25) % 11) };
  }
  if (Math.abs(vx) > 0.6) return { anim: "run", frame: (F.runPhase * 1.5) % 10 };
  return { anim: "idle", frame: (time * 10) % 24 };
}

/** Which way the figure is drawn: on a wall he slides facing away from it, as the pack draws him. */
export const turnOf = (F: Fighter) => (F.climb && F.body.velocity.y > 0.5 ? -F.facing : F.facing);

/** The death animation `ms` milliseconds in, held on its last frame. */
export function deathFrame(ms: number): Frame {
  let frame = 0;
  for (let left = ms; frame < DEATH_MS.length - 1 && left > DEATH_MS[frame]; frame++) left -= DEATH_MS[frame];
  return { anim: "death", frame };
}

/** A card's showpiece: two swings, an upward cut, a cast, then a few strides. */
export function showFrame(t: number): Frame {
  const beat = (t * 1.1) % 5, part = beat % 1;
  const anims: AnimName[] = ["swing", "backswing", "upSwing", "cast", "run"];
  const anim = anims[Math.floor(beat)];
  return { anim, frame: part * ANIMS[anim].frames };
}

// spec/app/index.md, "Story: Play a level of a campaign"
// The enemies a level can place besides the Seeker's bone-pale brawlers: characters from the art packs
// (art/packs/README.md), each one grid of frames cut by art/packs/build.py (and foes.py) and listed in packs/cast.json.
// What an enemy does is sim.ts's; here are only its numbers, how it fights, which frame shows it, and drawing that frame.
import type { FoeFxName } from "./foefx.ts";
import type { Fighter } from "./sim.ts";

type Ctx = CanvasRenderingContext2D;
interface Anim { start: number; frames: number; fps: number }
interface Cast { file: string; w: number; h: number; cols: number; feet: [number, number]; scale: number; faces: number; anims: Record<string, Anim> }
export type CastId = "samurai" | "knight" | "sickle" | "hallokin" | "huntress" | "shadeflit" | "boss"
  // Each of these belongs to one level only (levels.ts, a brief's `own`), and the spirit to the Undead Executioner.
  | "nightborne" | "fireworm" | "stormhead" | "mudguard" | "sprout" | "toaster" | "droid" | "botwheel" | "golem" | "executioner" | "wizard" | "ronin" | "spirit";

/** How a kind fights between its specials, when not hand to hand as a brawler does: `shoot` keeps its distance and
 *  fires a shot of its own (foefx.ts); `reach` strikes from `reach` away, with a blade, spear, vine or fist; `ram`
 *  drives into the fighter. */
export type Way = { kind: "shoot"; look: FoeFxName; pop: FoeFxName; speed: number } | { kind: "reach"; reach: number } | { kind: "ram" };

const CAST = Object.values(import.meta.glob<Record<CastId, Cast>>("./packs/cast.json", { eager: true, import: "default" }))[0];
const urls = import.meta.glob<string>("./packs/cast/*.png", { eager: true, query: "?url", import: "default" });
const images = new Map<CastId, HTMLImageElement>();

function image(id: CastId) {
  let made = images.get(id);
  if (!made) { made = new Image(); made.src = urls[`./packs/cast/${CAST[id].file}`]; images.set(id, made); }
  return made;
}
/** Loads every character, so that none is missing the first time it is met. */
export const loadCast = (): Promise<unknown> => Promise.all((Object.keys(CAST) as CastId[]).map((id) => image(id).decode().catch(() => undefined)));

/** How much bigger than a fighter every enemy stands, so that what comes for the fighter looms over it (sim.ts,
 *  `enemyAt`). A level's boss is four times a fighter whatever this is. */
export const ENEMY_SIZE = 1.6;

/** How a kind of enemy differs from a brawler: its health, speed and blows as multiples, and how it is named when it falls.
 *  `regular`: how it stands apart when it is an ordinary enemy, not a level's boss: its size and its own speed. */
export const FOES: Record<CastId, { hp: number; spd: number; pow: number; boss?: boolean; regular?: { size: number; spd: number }; way?: Way }> = {
  shadeflit: { hp: 0.7, spd: 1.3, pow: 0.8 },
  hallokin: { hp: 0.9, spd: 1.2, pow: 0.9 },
  sickle: { hp: 1, spd: 1.15, pow: 1 },
  samurai: { hp: 1.2, spd: 1.1, pow: 1.1 },
  // The knight in the ranks: twice a fighter's size, and slow with it.
  knight: { hp: 1.8, spd: 0.8, pow: 1.3, regular: { size: 2, spd: 0.55 } },
  huntress: { hp: 3.2, spd: 1.25, pow: 1.4 },
  boss: { hp: 9, spd: 0.75, pow: 1.9, boss: true },
  nightborne: { hp: 2.4, spd: 1.35, pow: 1.4, way: { kind: "reach", reach: 95 } },
  fireworm: { hp: 1.6, spd: 0.6, pow: 1.2, way: { kind: "shoot", look: "fireball", pop: "fireBurst", speed: 8 } },
  stormhead: { hp: 2, spd: 0.7, pow: 1.3, way: { kind: "shoot", look: "bolt", pop: "boltHit", speed: 9.5 } },
  mudguard: { hp: 1.1, spd: 1, pow: 1.1, way: { kind: "reach", reach: 115 } },
  sprout: { hp: 0.9, spd: 0.8, pow: 1, way: { kind: "reach", reach: 150 } },
  toaster: { hp: 0.8, spd: 1.2, pow: 0.9, way: { kind: "shoot", look: "holyBall", pop: "holyPop", speed: 11 } },
  droid: { hp: 0.9, spd: 1, pow: 1, way: { kind: "reach", reach: 140 } },
  botwheel: { hp: 1.4, spd: 1.45, pow: 1.2, way: { kind: "ram" } },
  golem: { hp: 4, spd: 0.45, pow: 1.6, way: { kind: "reach", reach: 125 } },
  executioner: { hp: 3, spd: 0.8, pow: 1.5, way: { kind: "reach", reach: 135 } },
  wizard: { hp: 2.2, spd: 0.75, pow: 1.4, way: { kind: "reach", reach: 175 } },
  ronin: { hp: 1.8, spd: 1.3, pow: 1.4, way: { kind: "reach", reach: 120 } },
  spirit: { hp: 0.35, spd: 1.5, pow: 0.6 },
};

/** Each kind of enemy's own special, used in the campaign's levels only (sim.ts, `foeArt`), and stronger with each
 *  chapter: chapter 1 is `tier` 0, chapter 5 is 4. Every one is warned of before it lands (`tell` steps, shorter as
 *  the tier rises), and a blow that staggers the enemy while it is warning cancels it. */
export type ArtKind = "iaido" | "quake" | "crescent" | "hexfire" | "shadowStep" | "arrowRain" | "eruption"
  | "nightRend" | "fireFountain" | "thunderhead" | "spearRush" | "rootSnare" | "overheat" | "arcField" | "gasDash" | "laser" | "summon" | "haunting" | "moonCut";
export const ARTS: Partial<Record<CastId, { kind: ArtKind; name: string }>> = {
  samurai: { kind: "iaido", name: "Iaido" },
  knight: { kind: "quake", name: "Earthbreaker" },
  sickle: { kind: "crescent", name: "Reaping Crescent" },
  hallokin: { kind: "hexfire", name: "Hexfire" },
  shadeflit: { kind: "shadowStep", name: "Shadow Step" },
  huntress: { kind: "arrowRain", name: "Arrow Rain" },
  boss: { kind: "eruption", name: "Dark Eruption" },
  nightborne: { kind: "nightRend", name: "Night Rend" },
  fireworm: { kind: "fireFountain", name: "Fire Fountain" },
  stormhead: { kind: "thunderhead", name: "Thunderhead" },
  mudguard: { kind: "spearRush", name: "Spear Rush" },
  sprout: { kind: "rootSnare", name: "Root Snare" },
  toaster: { kind: "overheat", name: "Overheat" },
  droid: { kind: "arcField", name: "Arc Field" },
  botwheel: { kind: "gasDash", name: "Gas Dash" },
  golem: { kind: "laser", name: "Core Laser" },
  executioner: { kind: "summon", name: "Summon the Spared" },
  wizard: { kind: "haunting", name: "Haunting" },
  ronin: { kind: "moonCut", name: "Moon Cut" },
};
/** At tier `k` (0 to 4): damage ×(1 + 0.3k); warning of 54 − 7k steps; between two uses (520 − 60k) to (720 − 60k) steps;
 *  how many of a level's enemies may be using theirs at once (1, 1, 2, 2, 3); and how many shots, strikes or pillars a
 *  special with several makes (`count`, by kind). */
export const artPower = (k: number) => ({ dmg: 1 + 0.3 * k, tell: 54 - 7 * k, rest: 520 - 60 * k, together: 1 + Math.floor(k / 2) });
export const artCount = (kind: ArtKind, k: number) =>
  kind === "crescent" ? 1 + Math.floor(k / 2) : kind === "hexfire" ? 1 + Math.floor((k + 1) / 2) : kind === "arrowRain" ? 3 + k : kind === "eruption" ? 1 + k : kind === "iaido" || kind === "quake" ? (k >= 3 ? 2 : 1)
  : kind === "fireFountain" ? 3 + k : kind === "thunderhead" || kind === "nightRend" || kind === "arcField" ? 2 + Math.floor(k / 2) : kind === "summon" || kind === "haunting" ? 2 + Math.floor(k / 2) : 1;

/** The first of `names` the character has. Every character has "idle". */
const have = (id: CastId, ...names: string[]) => names.find((name) => name in CAST[id].anims) ?? "idle";

/** The animation that shows what `F` is doing at `time` seconds, and how far through it. */
export function castFrame(F: Fighter, id: CastId, time: number): { anim: string; frame: number } {
  const vx = F.body.velocity.x, vy = F.body.velocity.y;
  const loop = (anim: string) => ({ anim, frame: (time * CAST[id].anims[anim].fps) % CAST[id].anims[anim].frames });
  // A co-op stand-in for the host's enemy: the frame the host's game draws it in.
  if (F.shown && F.shown.anim in CAST[id].anims) return F.shown;
  if (F.stun > 0) return { anim: have(id, "hit"), frame: 0 };
  // A boss in the middle of one of its own attacks.
  if (F.boss?.move) { const anim = have(id, F.boss.move === "volley" ? "attack2" : "attack", "attack", "run"); return { anim, frame: Math.min(0.999, F.boss.t / 77) * CAST[id].anims[anim].frames }; }
  // Its own special (sim.ts, `foeArt`), in the animation drawn for it where it has one.
  if (F.art && "special" in CAST[id].anims) return loop("special");
  if (F.atk) {
    const anim = have(id, /kick|sweep|round/.test(F.atk.name) ? "attack2" : "attack", "attack", "run");
    return { anim, frame: Math.min(0.999, F.atk.t / F.atk.def.dur) * CAST[id].anims[anim].frames };
  }
  if (!F.grounded) return loop(have(id, vy < 0 ? "jump" : "fall", "jump", "run"));
  return loop(Math.abs(vx) > 0.6 ? have(id, "run") : "idle");
}

/** The falling of a character `ms` milliseconds after its knockout: its death played once and held, or its last hurt. */
export function castDeath(id: CastId, ms: number): { anim: string; frame: number } {
  const anim = have(id, "death", "hit"), a = CAST[id].anims[anim];
  return { anim, frame: Math.min(a.frames - 1, (ms / 1000) * a.fps) };
}

/** Draws one frame with its feet at (x, y), facing `facing`, `size` times its own scale. */
export function drawCast(ctx: Ctx, id: CastId, at: { anim: string; frame: number }, x: number, y: number, facing: number, alpha = 1, stretch = 0, size = 1) {
  const c = CAST[id], a = c.anims[at.anim], sheet = image(id);
  if (!sheet.complete || sheet.naturalWidth === 0) return;
  const i = a.start + Math.max(0, Math.min(a.frames - 1, Math.floor(at.frame))), k = c.scale * size;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale((facing * c.faces < 0 ? -k : k) * (1 - stretch * 0.6), k * (1 + stretch));
  ctx.drawImage(sheet, (i % c.cols) * c.w, Math.floor(i / c.cols) * c.h, c.w, c.h, -c.feet[0], -c.feet[1], c.w, c.h);
  ctx.restore();
}

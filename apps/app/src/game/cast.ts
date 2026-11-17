// spec/app/index.md, "Story: Play a level of a campaign"
// The enemies a level can place besides the Seeker's bone-pale brawlers: seven characters from the art packs
// (art/packs/README.md), each one grid of frames cut by art/packs/build.py and listed in packs/cast.json.
// What an enemy does is sim.ts's; this is only which frame shows it, and drawing that frame.
import type { Fighter } from "./sim.ts";

type Ctx = CanvasRenderingContext2D;
interface Anim { start: number; frames: number; fps: number }
interface Cast { file: string; w: number; h: number; cols: number; feet: [number, number]; scale: number; faces: number; anims: Record<string, Anim> }
export type CastId = "samurai" | "knight" | "sickle" | "hallokin" | "huntress" | "shadeflit" | "boss";

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

/** How a kind of enemy differs from a brawler: its health, speed and blows as multiples, and how it is named when it falls. */
export const FOES: Record<CastId, { hp: number; spd: number; pow: number; boss?: boolean }> = {
  shadeflit: { hp: 0.7, spd: 1.3, pow: 0.8 },
  hallokin: { hp: 0.9, spd: 1.2, pow: 0.9 },
  sickle: { hp: 1, spd: 1.15, pow: 1 },
  samurai: { hp: 1.2, spd: 1.1, pow: 1.1 },
  knight: { hp: 1.8, spd: 0.8, pow: 1.3 },
  huntress: { hp: 3.2, spd: 1.25, pow: 1.4 },
  boss: { hp: 9, spd: 0.75, pow: 1.9, boss: true },
};

/** Each kind of enemy's own special, used in the campaign's levels only (sim.ts, `foeArt`), and stronger with each
 *  chapter: chapter 1 is `tier` 0, chapter 5 is 4. Every one is warned of before it lands (`tell` steps, shorter as
 *  the tier rises), and a blow that staggers the enemy while it is warning cancels it. */
export type ArtKind = "iaido" | "quake" | "crescent" | "hexfire" | "shadowStep" | "arrowRain" | "eruption";
export const ARTS: Record<CastId, { kind: ArtKind; name: string }> = {
  samurai: { kind: "iaido", name: "Iaido" },
  knight: { kind: "quake", name: "Earthbreaker" },
  sickle: { kind: "crescent", name: "Reaping Crescent" },
  hallokin: { kind: "hexfire", name: "Hexfire" },
  shadeflit: { kind: "shadowStep", name: "Shadow Step" },
  huntress: { kind: "arrowRain", name: "Arrow Rain" },
  boss: { kind: "eruption", name: "Dark Eruption" },
};
/** At tier `k` (0 to 4): damage ×(1 + 0.3k); warning of 54 − 7k steps; between two uses (520 − 60k) to (720 − 60k) steps;
 *  how many of a level's enemies may be using theirs at once (1, 1, 2, 2, 3); and how many shots, strikes or pillars a
 *  special with several makes (`count`, by kind). */
export const artPower = (k: number) => ({ dmg: 1 + 0.3 * k, tell: 54 - 7 * k, rest: 520 - 60 * k, together: 1 + Math.floor(k / 2) });
export const artCount = (kind: ArtKind, k: number) =>
  kind === "crescent" ? 1 + Math.floor(k / 2) : kind === "hexfire" ? 1 + Math.floor((k + 1) / 2) : kind === "arrowRain" ? 3 + k : kind === "eruption" ? 1 + k : kind === "iaido" || kind === "quake" ? (k >= 3 ? 2 : 1) : 1;

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

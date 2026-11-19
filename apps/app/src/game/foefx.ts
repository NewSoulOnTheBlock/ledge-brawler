// spec/app/index.md, "Story: Play a level of a campaign"
// The enemies' own attack effects: frames drawn by hand in the VFX packs (art/packs/foefx.py cuts them into strips,
// listed in packs/foefx.json), played as they were drawn. A fighter's specials are pixelfx (effects.ts); nothing here
// is ever a fighter's, so an enemy's attack is never mistaken for one.
import type { Sprite } from "./sim.ts";

interface Strip { w: number; h: number; frames: number; loop?: number }
const STRIPS = Object.values(import.meta.glob<Record<FoeFxName, Strip>>("./packs/foefx.json", { eager: true, import: "default" }))[0];
const urls = import.meta.glob<string>("./packs/foefx/*.png", { eager: true, query: "?url", import: "default" });

/** How each plays: frames a second, how many world pixels one of its pixels covers, and whether it stands on the ground
 *  at (x, y) or is centred there. A strip that loops is a shot's look (`Orb.look`) and is never played on its own. */
export const FOE_FX = {
  skull: { fps: 14, scale: 2.2, on: "middle" },
  skullPop: { fps: 14, scale: 2.6, on: "middle" },
  ghost: { fps: 16, scale: 2.4, on: "ground" },
  dome: { fps: 16, scale: 3, on: "ground" },
  blast: { fps: 18, scale: 4, on: "middle" },
  holyBall: { fps: 16, scale: 2, on: "middle" },
  holyPop: { fps: 16, scale: 3, on: "middle" },
  shard: { fps: 16, scale: 1.8, on: "middle" },
  shardPop: { fps: 18, scale: 2.4, on: "middle" },
  spikes: { fps: 30, scale: 2.6, on: "ground" },
  bolt: { fps: 16, scale: 2, on: "middle" },
  boltHit: { fps: 16, scale: 2.6, on: "middle" },
  slash: { fps: 30, scale: 2.6, on: "middle" },
  splash: { fps: 18, scale: 2.6, on: "ground" },
  skyStrike: { fps: 18, scale: 5, on: "ground" },
  waterBall: { fps: 16, scale: 1.2, on: "middle" },
  waterPop: { fps: 18, scale: 1.8, on: "middle" },
  geyser: { fps: 16, scale: 2.2, on: "ground" },
  // The enemies' own shots, from their packs (art/packs/foefx.py): the Fire Worm's, the Golem's fist and its laser,
  // whose beam starts 52 of its 300 pixels in and a third of the way down (sim.ts, the "laser" art).
  fireball: { fps: 14, scale: 1.6, on: "middle" },
  fireBurst: { fps: 16, scale: 2.2, on: "middle" },
  fist: { fps: 12, scale: 0.8, on: "middle" },
  laser: { fps: 12, scale: 2.4, on: "middle" },
} as const satisfies Record<string, { fps: number; scale: number; on: "ground" | "middle" }>;
export type FoeFxName = keyof typeof FOE_FX;

export const isFoeFx = (name: string): name is FoeFxName => name in FOE_FX;

const images = new Map<FoeFxName, HTMLImageElement>();
function image(name: FoeFxName) {
  let made = images.get(name);
  if (!made) { made = new Image(); made.src = urls[`./packs/foefx/${name}.png`]; images.set(name, made); }
  return made;
}
/** Loads every strip, so that none is missing the first time it plays. */
export const loadFoeFx = (): Promise<unknown> => Promise.all((Object.keys(FOE_FX) as FoeFxName[]).map((name) => image(name).decode().catch(() => undefined)));

/** How many steps of the arena (sixty a second) a strip plays for, once through. */
export const foeSteps = (name: FoeFxName) => Math.ceil((STRIPS[name].frames / FOE_FX[name].fps) * 60);

/** Frame `i` of a strip at (x, y): turned by `angle`, mirrored by `flip`, sized `k` times its own scale. */
function frame(ctx: CanvasRenderingContext2D, name: FoeFxName, i: number, x: number, y: number, k: number, flip: boolean, angle = 0) {
  const strip = STRIPS[name], img = image(name), own = FOE_FX[name];
  if (!img.complete || !img.naturalWidth) return;
  const s = own.scale * k, w = strip.w * s, h = strip.h * s;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle); if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, i * strip.w, 0, strip.w, strip.h, -w / 2, own.on === "ground" ? -h : -h / 2, w, h);
  ctx.restore();
}

/** A played effect (sim.ts, `play`) as it is `s.age` steps in. */
export function drawFoeFx(ctx: CanvasRenderingContext2D, s: Sprite & { fx: FoeFxName }) {
  const i = Math.min(STRIPS[s.fx].frames - 1, Math.floor((s.age / 60) * FOE_FX[s.fx].fps));
  frame(ctx, s.fx, i, s.x, s.y, s.scale, s.flip);
}

/** A shot drawn as its strip, pointing the way it flies, its loop played over and over after the frames before it. */
export function drawFoeShot(ctx: CanvasRenderingContext2D, name: FoeFxName, x: number, y: number, vx: number, vy: number, time: number) {
  const strip = STRIPS[name], from = strip.loop ?? 0, n = strip.frames - from;
  const i = from + (Math.floor(time * FOE_FX[name].fps) % n);
  frame(ctx, name, i, x, y, 1, false, Math.atan2(vy, vx));
}

// spec/app/index.md, "Story: Play a level of a campaign"
// What a level's place is drawn with: the tile pieces, plants and gate from the art packs (art/packs/README.md),
// cut by art/packs/build.py and listed in packs/places.json and packs/plants.json. Where things are is levels.ts's.
type Ctx = CanvasRenderingContext2D;
/** A piece of art: its file, and where in it the piece sits when the file is an atlas of many (art/scenery/make.cjs). */
interface Piece { file: string; w: number; h: number; x?: number; y?: number }
interface Plant { file: string; w: number; h: number; cols: number; frames: number; fps: number; root: [number, number] }
export type ThemeId = "shadow" | "mossy" | "fields" | "cove" | "village" | "duel" | "cavern" | "frost" | "shrine" | "ruin" | "fungal" | "ember";

const PLACES = Object.values(import.meta.glob<Record<string, Record<string, Piece>>>("./packs/places.json", { eager: true, import: "default" }))[0];
const PLANTS = Object.values(import.meta.glob<Record<string, Plant>>("./packs/plants.json", { eager: true, import: "default" }))[0];
/** The scenery of the campaign themes, drawn in code for this game (art/scenery/make.cjs): each piece with how it is drawn and lit. */
export interface SceneryMeta extends Piece { k: number; light?: [dx: number, dy: number, r: number, rgb: string]; flicker?: boolean; sway?: boolean; under?: boolean; wall?: boolean; fg?: boolean; far?: number; alpha?: number; frames?: number; tile?: boolean; shaft?: string; smoke?: boolean; drip?: boolean }
export const SCENERY = Object.values(import.meta.glob<Record<string, SceneryMeta>>("./packs/scenery/scenery.json", { eager: true, import: "default" }))[0];
PLACES.scenery = SCENERY;
const urls = import.meta.glob<string>("./packs/{mossy,shadow,fields,gate,plants,cove,village,cavern,frost,shrine,ruin,fungal,ember,scenery}/*.{png,webp}", { eager: true, query: "?url", import: "default" });
const images = new Map<string, HTMLImageElement>();

export function image(path: string) {
  let made = images.get(path);
  if (!made) { made = new Image(); made.src = urls[`./packs/${path}`]; images.set(path, made); }
  return made.complete && made.naturalWidth > 0 ? made : null;
}
/** Loads the pieces of the sets named (the folders under packs/), or of every set; the rest load when first drawn. */
export function loadPlaces(sets?: string[]): Promise<unknown> {
  return Promise.all(Object.keys(urls).filter((key) => !sets || sets.some((set) => key.startsWith(`./packs/${set}/`))).map((key) => {
    const path = key.slice("./packs/".length);
    image(path);
    return images.get(path)!.decode().catch(() => undefined);
  }));
}

/** How a theme draws: its colours, whether its art is pixel art, and the piece each kind of slab wears. */
interface Skin { piece: string; k: number; top: number; over: number }
export interface Theme {
  set: string; pixel: boolean; sky: [string, string]; fog: string; solid: string; ink: string;
  /** How large a piece of decor is drawn unless it says, and how faint what stands behind the fighters is. */
  k: number; dim: number;
  ground: Skin; ledge: Skin; wall: Skin;
  /** A slab is dressed no deeper than it is: only the top of its piece shows, so a ledge is a thin line to stand on. */
  thin?: boolean;
}
export const THEMES: Record<ThemeId, Theme> = {
  // Blackspire: near-black stone under a bruised sky.
  shadow: { set: "shadow", pixel: true, k: 2.2, dim: 0.5, sky: ["#3a3044", "#7a6678"], fog: "20,15,22", solid: "#150f16", ink: "#e9e2ee",
    ground: { piece: "plank", k: 2.4, top: 4, over: 6 }, ledge: { piece: "strip", k: 2.4, top: 2, over: 4 }, wall: { piece: "pillar", k: 2.4, top: 2, over: 4 } },
  // The Drowned Wilds: moss over black earth.
  mossy: { set: "mossy", pixel: false, k: 0.5, dim: 1, sky: ["#06120f", "#12332a"], fog: "4,12,10", solid: "#020403", ink: "#d9f5df",
    ground: { piece: "longest", k: 0.62, top: 58, over: 26 }, ledge: { piece: "plank", k: 0.4, top: 62, over: 18 }, wall: { piece: "pillar", k: 0.5, top: 40, over: 26 } },
  // The villages of the northern road at dusk: purple earth under teal grass.
  village: { set: "village", pixel: true, k: 4, dim: 1, sky: ["#2a2540", "#6d5a7a"], fog: "24,18,34", solid: "#2b1f2e", ink: "#e6dcef",
    ground: { piece: "ground", k: 4, top: 1, over: 0 }, ledge: { piece: "bridge", k: 2.2, top: 9, over: 4 }, wall: { piece: "wall", k: 4, top: 1, over: 0 } },
  // The cove of the duels: one grassy rock over a bright sea.
  cove: { set: "cove", pixel: true, k: 3, dim: 1, sky: ["#bfeef5", "#58cfe0"], fog: "14,140,160", solid: "#463c3f", ink: "#10343a",
    ground: { piece: "platform", k: 3, top: 2, over: 2 }, ledge: { piece: "platform", k: 1.2, top: 2, over: 2 }, wall: { piece: "platform", k: 3, top: 2, over: 2 } },
  // Where duels are fought: the cove's grass and rock, cut thin, under whatever sky the match has drawn.
  duel: { set: "cove", pixel: true, k: 3, dim: 1, thin: true, sky: ["#1b2233", "#3b4a66"], fog: "16,20,30", solid: "#463c3f", ink: "#f2efe6",
    ground: { piece: "platform", k: 2.4, top: 2, over: 1 }, ledge: { piece: "platform", k: 2.4, top: 2, over: 1 }, wall: { piece: "platform", k: 2.4, top: 2, over: 1 } },
  // The fields at night: dark earth, red planks and lantern trees.
  fields: { set: "fields", pixel: true, k: 4, dim: 1, sky: ["#1d3a5f", "#3c6ea5"], fog: "9,20,31", solid: "#09141f", ink: "#f0d9b5",
    ground: { piece: "ground", k: 4, top: 3, over: 0 }, ledge: { piece: "plank", k: 4, top: 1, over: 4 }, wall: { piece: "ground", k: 4, top: 3, over: 0 } },
  // Strawberry Jam themes: six tilesets from the Celeste community mod, each a distinct mood.
  // Cavern: mosscairn's grey stone caves beneath the earth.
  cavern: { set: "cavern", pixel: true, k: 2.4, dim: 0.6, sky: ["#2a2338", "#4a3f5a"], fog: "32,23,49", solid: "#120b1a", ink: "#d5cde0",
    ground: { piece: "ground", k: 2.4, top: 4, over: 6 }, ledge: { piece: "ledge", k: 2.4, top: 2, over: 4 }, wall: { piece: "wall", k: 2.4, top: 2, over: 4 } },
  // Frost: Ice's pale stone under a frozen sky.
  frost: { set: "frost", pixel: true, k: 2.4, dim: 0.7, sky: ["#2e3e4e", "#6e8e9e"], fog: "40,55,70", solid: "#1a2a36", ink: "#e4eff5",
    ground: { piece: "ground", k: 2.4, top: 4, over: 6 }, ledge: { piece: "ledge", k: 2.4, top: 2, over: 4 }, wall: { piece: "wall", k: 2.4, top: 2, over: 4 } },
  // Shrine: vamp's crimson-purple sanctum.
  shrine: { set: "shrine", pixel: true, k: 2.4, dim: 0.6, sky: ["#3a1830", "#6a3a50"], fog: "55,20,45", solid: "#200e1a", ink: "#f0d8e6",
    ground: { piece: "ground", k: 2.4, top: 4, over: 6 }, ledge: { piece: "ledge", k: 2.4, top: 2, over: 4 }, wall: { piece: "wall", k: 2.4, top: 2, over: 4 } },
  // Ruin: Grandmaster's grey stone ruins.
  ruin: { set: "ruin", pixel: true, k: 2.4, dim: 0.7, sky: ["#383838", "#686868"], fog: "44,44,44", solid: "#1c1c1c", ink: "#e0dcd4",
    ground: { piece: "ground", k: 2.4, top: 4, over: 6 }, ledge: { piece: "ledge", k: 2.4, top: 2, over: 4 }, wall: { piece: "wall", k: 2.4, top: 2, over: 4 } },
  // Fungal: Cabob's bioluminescent blue-purple caves.
  fungal: { set: "fungal", pixel: true, k: 2.4, dim: 0.5, sky: ["#1a2858", "#3a4888"], fog: "30,40,90", solid: "#0e1638", ink: "#d0c0f8",
    ground: { piece: "ground", k: 2.4, top: 4, over: 6 }, ledge: { piece: "ledge", k: 2.4, top: 2, over: 4 }, wall: { piece: "wall", k: 2.4, top: 2, over: 4 } },
  // Ember: mosscairn's red-hot volcanic stone.
  ember: { set: "ember", pixel: true, k: 2.4, dim: 0.6, sky: ["#3a1820", "#6a3040"], fog: "50,22,30", solid: "#1e0a10", ink: "#f5c0a0",
    ground: { piece: "ground", k: 2.4, top: 4, over: 6 }, ledge: { piece: "ledge", k: 2.4, top: 2, over: 4 }, wall: { piece: "wall", k: 2.4, top: 2, over: 4 } },
};

/** One of a piece's `frames` equal frames side by side, drawn to fill a box of the view. */
export function drawFrame(ctx: Ctx, set: string, name: string, frame: number, frames: number, x: number, y: number, w: number, h: number) {
  const p = pieceOf(set, name), img = p && image(p.file);
  if (!p || !img) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, (p.x ?? 0) + (Math.floor(frame) % frames) * (p.w / frames), p.y ?? 0, p.w / frames, p.h, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}

export const pieceOf = (set: string, name: string): Piece | undefined => PLACES[set]?.[name];

/** Draws a piece `k` times its size with its bottom middle at (x, y); `skew` leans its top sideways (wind, a passing fighter). */
export function drawPiece(ctx: Ctx, set: string, name: string, x: number, y: number, k: number, pixel: boolean, flip = false, alpha = 1, skew = 0) {
  const p = pieceOf(set, name), img = p && image(p.file);
  if (!p || !img) return;
  ctx.save();
  ctx.imageSmoothingEnabled = !pixel; ctx.globalAlpha = alpha;
  ctx.translate(x, y); if (skew) ctx.transform(1, 0, skew, 1, 0, 0); ctx.scale(flip ? -k : k, k);
  ctx.drawImage(img, p.x ?? 0, p.y ?? 0, p.w, p.h, -p.w / 2, -p.h, p.w, p.h);
  ctx.restore();
}

/**
 * Dresses a slab (its top-left corner, width and height) in a piece: the piece's ends at the slab's ends and its
 * middle repeated between them. `skin.top` is how far below the piece's top edge its walkable surface is, and
 * `skin.over` how far it hangs past each end, both in the piece's own pixels.
 */
export function drawSlab(ctx: Ctx, theme: Theme, kind: "ground" | "ledge" | "wall", x: number, y: number, w: number, h: number) {
  const skin = theme[kind], p = pieceOf(theme.set, skin.piece), img = p && image(p.file);
  ctx.fillStyle = theme.solid;
  if (!p || !img) { ctx.fillRect(x, y, w, h); return; }
  const k = skin.k, left = x - skin.over * k, full = w + 2 * skin.over * k, top = y - skin.top * k;
  ctx.save();
  ctx.imageSmoothingEnabled = !theme.pixel;
  if (theme.thin) {
    // Rock the size of the slab, and over it the top of the piece: grass along a ledge, a tuft on a post.
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(x, y + h - 3, w, 3);
    ctx.beginPath(); ctx.rect(x - 4, y - skin.top * k - 2, w + 8, Math.min(h, 12) + skin.top * k + 2); ctx.clip();
    const part = Math.min(p.w, Math.max(8, w / k));
    for (let at = x; at < x + w; at += p.w * k) ctx.drawImage(img, 8, 0, Math.min(part, (x + w - at) / k), p.h, at, top, Math.min(part, (x + w - at) / k) * k, p.h * k);
  } else if (kind === "wall") {
    // A wall is the piece stretched to its height; anything taller than the piece is filled in behind.
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.drawImage(img, left, top, full, h + 2 * skin.top * k);
  } else if (full <= p.w * k * 1.15) ctx.drawImage(img, left, top, full, p.h * k);
  else {
    const cap = p.w * 0.3, mid = p.w - 2 * cap, right = left + full - cap * k;
    ctx.drawImage(img, 0, 0, cap, p.h, left, top, cap * k, p.h * k);
    for (let at = left + cap * k; at < right - 0.5; at += mid * k) {
      const part = Math.min(mid, (right - at) / k);
      ctx.drawImage(img, cap, 0, part, p.h, at, top, part * k + 0.5, p.h * k);
    }
    ctx.drawImage(img, p.w - cap, 0, cap, p.h, right, top, cap * k, p.h * k);
  }
  ctx.restore();
}

/** Dresses the top of rock from (x, y) for `w` in the theme's ground: only its surface, a little above and below the line. */
export function drawTop(ctx: Ctx, theme: Theme, x: number, y: number, w: number) {
  const skin = theme.ground;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - skin.over * skin.k - 2, y - skin.top * skin.k - 60, w + 2 * skin.over * skin.k + 4, 60 + skin.top * skin.k + 46); ctx.clip();
  drawSlab(ctx, theme, "ground", x, y, w, 40);
  ctx.restore();
}

/** A row of the village's spikes along the floor from `x` for `w`, standing on `y`. */
export function drawSpikes(ctx: Ctx, x: number, y: number, w: number) {
  const p = pieceOf("village", "spikes"), img = p && image(p.file);
  if (!p || !img) return;
  const k = 4;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let at = x; at < x + w - 1; at += p.w * k) { const part = Math.min(p.w, (x + w - at) / k); ctx.drawImage(img, 0, 0, part, p.h, at, y - p.h * k, part * k, p.h * k); }
  ctx.restore();
}

/** Draws a plant `k` times its size growing from (x, y); `t` is the time into its animation, in seconds. */
export function drawPlant(ctx: Ctx, name: string, x: number, y: number, k: number, t: number, loop = true, flip = false) {
  const p = PLANTS[name], img = p && image(`plants/${p.file}`);
  if (!p || !img) return;
  const f = loop ? Math.floor(t * p.fps) % p.frames : Math.min(p.frames - 1, Math.floor(Math.max(0, t) * p.fps));
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.translate(x, y); ctx.scale(flip ? -k : k, k);
  ctx.drawImage(img, (f % p.cols) * p.w, Math.floor(f / p.cols) * p.h, p.w, p.h, -p.root[0], -p.root[1], p.w, p.h);
  ctx.restore();
}

/** Fills the view with a piece repeated sideways, as tall as the view, slid `shift` screen pixels to the left. */
export function drawBackdrop(ctx: Ctx, set: string, name: string, shift: number, viewW: number, viewH: number) {
  const p = pieceOf(set, name), img = p && image(p.file);
  if (!p || !img) return;
  const k = viewH / p.h, w = p.w * k;
  ctx.imageSmoothingEnabled = false;
  for (let x = -(((shift % w) + w) % w); x < viewW; x += w) ctx.drawImage(img, Math.floor(x), 0, Math.ceil(w) + 1, viewH);
  ctx.imageSmoothingEnabled = true;
}

// spec/app/index.md, "Story: Play a level of a campaign"
// What is behind a level: a sky of several layers from the art packs (art/packs/README.md), the farthest first, each
// repeated sideways and slid at its own rate as the view moves, so that the place has distance. A sky is loaded
// when the first level under it is drawn.
type Ctx = CanvasRenderingContext2D;
interface Sky { pixel: boolean; layers: { file: string; w: number; h: number }[] }
export type SkyId = "dawn" | "demonwoods" | "nightforest" | "wastelands" | "corridors" | "underwater" | "street" | "skyline" | "synth" | "duskA" | "duskB" | "duskC" | "forest" | "hills";

const SKIES = Object.values(import.meta.glob<Record<SkyId, Sky>>("./packs/sky.json", { eager: true, import: "default" }))[0];
/** The skies that are dark enough for light lettering over them; the rest want dark. */
const DARK = new Set<SkyId>(["dawn", "demonwoods", "wastelands", "corridors", "underwater", "street", "skyline", "synth", "duskC", "forest", "nightforest"]);
export const skyIsDark = (id: SkyId) => DARK.has(id);
/** Every sky there is, in a fixed order. */
export const SKY_IDS = Object.keys(SKIES).sort() as SkyId[];
const urls = import.meta.glob<string>("./packs/sky/*/*.{png,webp}", { eager: true, query: "?url", import: "default" });
const images = new Map<string, HTMLImageElement>();

const layerImage = (file: string) => {
  let img = images.get(file);
  if (!img) { img = new Image(); img.src = urls[`./packs/sky/${file}`]; images.set(file, img); }
  return img;
};
/** Loads every layer of the sky `id`. */
export const loadSky = (id: SkyId): Promise<unknown> => Promise.all(SKIES[id].layers.map((layer) => layerImage(layer.file).decode().catch(() => undefined)));

/** Draws the sky `id` over the whole view, for a view whose left edge is `camX` and top `camY` in the level, at `scale`. */
export function drawSky(ctx: Ctx, id: SkyId, camX: number, camY: number, scale: number, viewW: number, viewH: number) {
  const sky = SKIES[id];
  ctx.imageSmoothingEnabled = !sky.pixel;
  sky.layers.forEach((layer, i) => {
    const img = layerImage(layer.file);
    if (!img.complete || img.naturalWidth === 0) return;
    // Each layer is as tall as the view and a little more, so that it can also sink a little as the view climbs.
    const near = sky.layers.length > 1 ? i / (sky.layers.length - 1) : 0, k = (viewH * 1.12) / layer.h, w = layer.w * k;
    const slide = camX * scale * (0.02 + 0.2 * near), sink = Math.max(-viewH * 0.12, Math.min(0, -viewH * 0.06 - camY * scale * 0.012 * (0.3 + near)));
    for (let x = -(((slide % w) + w) % w); x < viewW; x += w) ctx.drawImage(img, Math.floor(x), Math.floor(sink), Math.ceil(w) + 1, Math.ceil(layer.h * k));
  });
  ctx.imageSmoothingEnabled = true;
}

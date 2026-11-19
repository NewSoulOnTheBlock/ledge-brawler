// spec/app/index.md, "Story: Play a level of a campaign"
// How a campaign level's place lives, over what levels.ts lays out and places.ts draws: its sky tinted toward its
// theme, far silhouettes and smoke, rock with grain and edges, lava in the seams and snow on the ground, weather and
// small creatures under one wind, light and dark, and a grade over the whole view. Only looked at: nothing here
// changes the match. The urns break and the icicles fall for the eye alone.
import type { Decor, Level } from "./levels.ts";
import { LOCALE } from "./locale.ts";
import { SCENERY, type SceneryMeta, type Theme, type ThemeId, drawPiece, image } from "./places.ts";

type Ctx = CanvasRenderingContext2D;
/** What the scenery needs to know of a frame: the view in the world, the time, and the player's fighter. */
export interface View {
  camX: number; camY: number; scale: number; w: number; h: number; dpr: number; time: number; dt: number;
  hero: { x: number; y: number; facing: number; striking: boolean } | null;
}
type Weather = "embers" | "snow" | "dust" | "spores";
interface Mood {
  weather: Weather; dark: number; tint: string; grade: string; vignette: number; wind: number;
  critter?: "bat" | "crow"; fireflies?: boolean; seams?: boolean; snow?: boolean; shimmer?: boolean; frost?: boolean; far?: string[];
}
/** Each campaign theme's weather, darkness, colours and far things. */
const MOOD: Partial<Record<ThemeId, Mood>> = {
  cavern: { weather: "dust", dark: 0.42, tint: "70,55,110", grade: "50,36,90", vignette: 0.5, wind: 0.2, critter: "bat" },
  frost: { weather: "snow", dark: 0.18, tint: "130,175,215", grade: "160,205,235", vignette: 0.3, wind: 1, critter: "crow", snow: true, frost: true },
  shrine: { weather: "dust", dark: 0.36, tint: "130,40,90", grade: "120,30,80", vignette: 0.45, wind: 0.3 },
  ruin: { weather: "dust", dark: 0.3, tint: "95,95,108", grade: "80,80,95", vignette: 0.45, wind: 0.5, critter: "crow" },
  fungal: { weather: "spores", dark: 0.5, tint: "50,70,170", grade: "30,40,120", vignette: 0.5, wind: 0.35, fireflies: true },
  ember: { weather: "embers", dark: 0.28, tint: "170,55,40", grade: "130,35,20", vignette: 0.45, wind: 0.6, seams: true, shimmer: true, far: ["spires", "basalt"] },
};
/** What a level's story stands on its horizon, over its theme's far things. */
const FAR: Record<string, { far?: string[]; smoke?: boolean; water?: boolean }> = {
  "forbidden-2": { far: ["rooftops"] }, "forbidden-5": { far: ["cart"] }, "ember-1": { smoke: true }, "exile-1": { far: ["belltower"] },
  "exile-5": { far: ["belltower"] }, "exile-4": { far: ["frozenHost"] }, "hollow-4": { far: ["drownedTowers"], water: true }, "architect-4": { far: ["rooftops"], smoke: true },
};
const WEATHER: Record<Weather, [string, string]> = { snow: ["#f0f8ff", "#f0f8ff"], embers: ["#ff7a32", "#ffd250"], dust: ["#ebe1d2", "#ebe1d2"], spores: ["#78e6ff", "#ff82e6"] };
const hash = (x: number, y: number, s = 1) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 2246822519 | 0)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const meta = (d: Decor): SceneryMeta | undefined => ("piece" in d && d.set === "scenery" ? SCENERY[d.piece] : undefined);
export const moodOf = (id?: ThemeId) => (id ? MOOD[id] : undefined);

/** One gust-carrying wind for a level: grass, banners, snow, embers and smoke all lean with it. */
export const wind = (t: number, x = 0) => Math.sin(t * 0.37 + x * 0.0011) * 0.6 + Math.sin(t * 1.3 + x * 0.004) * 0.25 + Math.max(0, Math.sin(t * 0.13)) ** 6 * 0.9;

interface Bit { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; tone: number; kind: number }
interface Critter { x: number; y: number; home: [number, number]; flee: number; vx: number; vy: number; gone: number }
interface Fall { x: number; y: number; vy: number; floor: number; done: boolean }

/** A soft round glow of one colour, drawn once and stamped wherever a light is: far cheaper than a gradient a frame. */
const glows = new Map<string, HTMLCanvasElement>();
function glow(rgb: string, a: number) {
  const key = rgb + a; let c = glows.get(key);
  if (!c) { c = document.createElement("canvas"); c.width = c.height = 64; const g2 = c.getContext("2d")!, g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); g2.fillStyle = g; g2.fillRect(0, 0, 64, 64); glows.set(key, c); }
  return c;
}
/** A view-sized overlay drawn once per size and mood: the vignette, and frost at the edges for the cold. */
let edge: { key: string; c: HTMLCanvasElement } | null = null;
function edges(w: number, h: number, mood: Mood) {
  const key = `${w}x${h}${mood.vignette}${mood.frost}`;
  if (edge?.key === key) return edge.c;
  const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); const g2 = c.getContext("2d")!;
  if (mood.frost) { const g = g2.createRadialGradient(w / 2, h / 2, h * 0.55, w / 2, h / 2, h * 1.05); g.addColorStop(0, "rgba(220,240,255,0)"); g.addColorStop(1, "rgba(220,240,255,0.32)"); g2.fillStyle = g; g2.fillRect(0, 0, w, h);
    g2.fillStyle = "rgba(240,250,255,0.5)"; for (let k = 0; k < 90; k++) { const a = hash(k, 1, 5) * Math.PI * 2, rr = h * (0.62 + 0.4 * hash(k, 2, 5)), X = w / 2 + Math.cos(a) * rr * 1.5, Y = h / 2 + Math.sin(a) * rr; if (X > -4 && X < w && Y > -4 && Y < h) g2.fillRect(X, Y, 2, 2); } }
  const vg = g2.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${mood.vignette})`); g2.fillStyle = vg; g2.fillRect(0, 0, w, h);
  edge = { key, c }; return c;
}

export function createScenery() {
  let level: Level | null = null, mood: Mood | undefined, themeId: ThemeId | undefined;
  let bits: Bit[] = [], critters: Critter[] = [], drips: Bit[] = [], shards: Bit[] = [], breath: Bit[] = [];
  const hidden = new Set<number>(), falls = new Map<number, Fall & { back: number }>();
  let back: HTMLCanvasElement | null = null, dark: HTMLCanvasElement | null = null, lctx: CanvasRenderingContext2D | null = null, pattern: CanvasPattern | null = null, breathAt = 0;
  /** What in a level gives light, sheds smoke, drips or breaks: found once when the level is taken up, so a frame only looks through short lists. */
  type Lamp = { x: number; y: number; r: number; rgb: string; flicker: boolean; i: number };
  let lamps: Lamp[] = [], shafts: [Decor, SceneryMeta][] = [], smokers: [Decor, SceneryMeta, number][] = [], drippers: [Decor, SceneryMeta, number][] = [], urns: [Decor, number][] = [], moths: [Decor, number, number][] = [];
  const inView = (x: number, y: number, v: View, pad: number) => x > v.camX - pad && x < v.camX + v.w / v.scale + pad && y > v.camY - pad && y < v.camY + v.h / v.scale + pad;
  const floorUnder = (x: number, y: number) => { let best = Infinity; for (const [tx, ty, tw] of level?.tops ?? []) if (x >= tx && x <= tx + tw && ty > y && ty < best) best = ty; return best; };

  /** Takes up a level (or none): its weather, creatures and what has broken are its own. */
  function enter(L: Level | null) {
    if (L === level) return;
    // A level of its own may have its own weather over its theme's (locale.ts): snow on a winter road built of ruins.
    level = L; themeId = L?.theme; mood = moodOf(themeId); const own = L && LOCALE[L.id]?.weather; if (mood && own) mood = { ...mood, weather: own }; bits = []; drips = []; shards = []; breath = []; hidden.clear(); falls.clear(); pattern = null;
    critters = []; lamps = []; shafts = []; smokers = []; drippers = []; urns = []; moths = [];
    (L?.decor ?? []).forEach((d, i) => { const m = meta(d), lantern = "piece" in d && d.piece.startsWith("lantern");
      const l = m?.light ?? (lantern ? [0, -50, 150, "255,190,110"] as const : undefined), k = m?.k ?? 4, top = m?.under ? m.h * m.k : 0;
      if (l) lamps.push({ x: d.x + l[0] * k, y: d.y + top + l[1] * k, r: l[2], rgb: l[3], flicker: !!m?.flicker, i });
      if (m && (m.shaft || (d as { piece: string }).piece === "barred")) shafts.push([d, m]);
      if (m && (m.smoke || (m.flicker && !m.wall))) smokers.push([d, m, i]);
      if (m?.under && "piece" in d && (d.piece.startsWith("stalactite") || d.piece.startsWith("icicle"))) drippers.push([d, m, i]);
      if ("piece" in d && d.piece.startsWith("urn-")) urns.push([d, i]);
      if (lantern || m?.flicker || (moodOf(L?.theme)?.fireflies && m?.light)) moths.push([d, i, m ? m.h * m.k * 0.7 : 60]); });
    if (L && moodOf(L.theme)?.seams) for (const [x, y, w] of L.tops ?? []) for (let k = 0; k < w / 192; k++) lamps.push({ x: x + 40 + k * 192, y: y + 10, r: 70, rgb: "255,110,40", flicker: false, i: -1 });
    if (L && mood?.critter) (L.tops ?? []).forEach(([x, y, w], i) => { if (w >= 4 * 64 && hash(i, 3, 7) < 0.35) { const cx = x + w * (0.25 + 0.5 * hash(i, 4, 7)), cy = mood!.critter === "bat" ? y - 150 - hash(i, 5, 7) * 60 : y - 4; critters.push({ x: cx, y: cy, home: [cx, cy], flee: 0, vx: 0, vy: 0, gone: 0 }); } });
  }

  /** Behind everything, in the view's own pixels: the sky leaned toward the theme, far things, smoke and the haze. */
  function backdrop(out: Ctx, v: View) {
    if (!mood || !level) return;
    // Drawn at half the view's size and scaled up once: all of it is soft air or far, flat shapes, so nothing is lost,
    // and it costs a quarter as much as the full-size passes it replaces.
    const bw = Math.ceil(v.w / 2), bh = Math.ceil(v.h / 2);
    back ??= document.createElement("canvas");
    if (back.width !== bw || back.height !== bh) { back.width = bw; back.height = bh; }
    const ctx = back.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, bw, bh); ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.2; ctx.fillStyle = `rgb(${mood.tint})`; ctx.fillRect(0, 0, v.w, v.h); ctx.globalAlpha = 1;
    const far = [...(mood.far ?? []), ...(FAR[level.id]?.far ?? []), ...(LOCALE[level.id]?.far ?? [])];
    for (const name of far) {
      const p = SCENERY[name], img = p && image(p.file); if (!p || !img) continue;
      const par = p.far ?? 0.25, k = p.k * v.scale * 0.8, pw = p.w * k, gap = pw * (name === "frozenHost" || name === "cart" ? 1.6 : 1.15);
      const base = v.h * 0.98 - clamp(v.camY * v.scale * par * 0.05, -v.h * 0.1, v.h * 0.1);
      ctx.globalAlpha = (p.alpha ?? 1) * 0.75; ctx.imageSmoothingEnabled = false;
      for (let x = -(((v.camX * v.scale * par) % gap) + gap) % gap - gap; x < v.w + gap; x += gap) ctx.drawImage(img, p.x ?? 0, p.y ?? 0, p.w, p.h, Math.round(x), Math.round(base - p.h * k), Math.round(pw), Math.round(p.h * k));
    }
    ctx.globalAlpha = 1;
    // Smoke from a burning town: puffs rising off the horizon, leaning with the wind.
    if (FAR[level.id]?.smoke) for (let c = 0; c < 4; c++) {
      const sx = ((c * 0.27 + 0.1) * v.w * 1.6 - v.camX * v.scale * 0.08) % (v.w * 1.6), cx = sx < -100 ? sx + v.w * 1.6 : sx;
      for (let k = 0; k < 14; k++) { const u = ((v.time * 0.05 + k / 14 + c * 0.13) % 1), r = (10 + u * 60) * v.scale * 0.5;
        ctx.fillStyle = `rgba(${u < 0.15 ? "120,60,40" : "40,30,34"},${0.35 * (1 - u)})`; ctx.beginPath(); ctx.arc(cx + wind(v.time) * u * 120 + Math.sin(k * 2.1) * 10, v.h * 0.82 - u * v.h * 0.75, r, 0, Math.PI * 2); ctx.fill(); }
    }
    // A drowned city: flood water across the bottom of the view, glinting, with the old tide marks above it.
    if (FAR[level.id]?.water) { const top = v.h * 0.8; ctx.fillStyle = "rgba(30,60,120,0.55)"; ctx.fillRect(0, top, v.w, v.h - top);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(160,210,255,${0.12 - k * 0.025})`; ctx.fillRect(0, top - 18 - k * 22, v.w, 2); }
      for (let k = 0; k < 40; k++) { const x = ((hash(k, 1, 2) * v.w * 1.5 - v.camX * v.scale * 0.2 + v.time * 12 * (k % 2 ? 1 : -1)) % (v.w * 1.5) + v.w * 1.5) % (v.w * 1.5);
        ctx.fillStyle = "rgba(190,230,255,0.35)"; ctx.fillRect(x, top + 4 + hash(k, 2, 2) * (v.h - top - 8), 6 + hash(k, 3, 2) * 18, 1); } }
    // Haze: the theme's air thickening toward the horizon, so the far things sit back.
    const g = ctx.createLinearGradient(0, v.h * 0.45, 0, v.h); g.addColorStop(0, `rgba(${mood.grade},0)`); g.addColorStop(1, `rgba(${mood.grade},0.35)`);
    ctx.fillStyle = g; ctx.fillRect(0, v.h * 0.45, v.w, v.h * 0.55);
    ctx.restore();
    out.save(); out.imageSmoothingEnabled = true; out.drawImage(back, 0, 0, bw * 2, bh * 2); out.restore();
  }

  /** Solid rock in the theme's stone, with a lit top-left edge and a shadowed underside, so it reads as stone, not a hole. */
  /** Rock: the theme's fill, set back from what is walked on, with lit and shaded edges unless `edges` is false (a patch
   *  that has to vanish into the rock round it, as a hidden chamber's does). */
  function fill(ctx: Ctx, T: Theme, x: number, y: number, w: number, h: number, edges = true) {
    const img = themeId && image(`scenery/fill-${themeId}.png`);
    if (!img) { ctx.fillStyle = T.solid; ctx.fillRect(x - 0.5, y - 0.5, w + 1, h + 1); return; }
    if (!pattern) { pattern = ctx.createPattern(img, "repeat"); pattern?.setTransform(new DOMMatrix().scale(3)); }
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = pattern ?? T.solid; ctx.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x, y, w, h);                       // rock sits back from what is walked on
    if (edges) {
      ctx.fillStyle = "rgba(255,255,255,0.09)"; ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y, 3, h);
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(x, y + h - 6, w, 6); ctx.fillRect(x + w - 3, y, 3, h);
    }
    ctx.restore();
  }

  /** Over the dressed tops of the rock: lava glowing in the seams, or snow lying on it. */
  function ground(ctx: Ctx, v: View, onScreen: (x0: number, y0: number, x1: number, y1: number) => boolean) {
    if (!mood || !level) return;
    for (const [x, y, w] of level.tops ?? []) {
      if (!onScreen(x, y - 20, x + w, y + 30)) continue;
      if (mood.seams) for (let k = 0; k < w / 48; k++) { const sx = x + 10 + k * 48 + hash(k, x, 2) * 20, glow = 0.55 + 0.45 * Math.sin(v.time * 2 + k * 1.7);
        ctx.fillStyle = `rgba(255,${Math.round(90 + 80 * glow)},40,${0.55 + 0.4 * glow})`; ctx.fillRect(sx, y + 10 + hash(k, y, 3) * 8, 10 + hash(k, 5, x) * 14, 2); ctx.fillRect(sx + 6, y + 12 + hash(k, y, 3) * 8, 2, 4); }
      if (mood.snow) { ctx.fillStyle = "#e8f2f8"; for (let sx = x; sx < x + w; sx += 6) { const hgt = 3 + Math.round(2 * Math.sin(sx * 0.07) + hash(sx, y, 4) * 2); ctx.fillRect(sx, y - hgt, 6, hgt + 1); }
        ctx.fillStyle = "#b8d0e0"; ctx.fillRect(x, y, w, 2);
        for (const end of [x, x + w - 30]) { ctx.fillStyle = "#e8f2f8"; ctx.beginPath(); ctx.ellipse(end + 15, y, 22, 9, 0, Math.PI, 0); ctx.fill(); } }
      // Where a walk ends against a wall the corner is in shadow, and a few stones have gathered in it.
      for (const [end, dir] of [[x, 1], [x + w, -1]] as const) { for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(0,0,0,${0.1 - k * 0.022})`; ctx.fillRect(dir > 0 ? end : end - 40 + k * 10, y - 60, 40 - k * 10, 62); }
        ctx.fillStyle = "rgba(20,14,20,0.9)"; for (let k = 0; k < 3; k++) ctx.fillRect(end + dir * (3 + k * 7) - (dir < 0 ? 6 : 0), y - 4 - (k === 1 ? 2 : 0), 6 - k, 4 + (k === 1 ? 2 : 0)); }
    }
    // A thin ledge is held up: an iron bracket under each end, braced back to nothing the eye has to see.
    for (const [cx, cy, w, h, kind] of level.slabs) { if (kind !== "ledge" || !onScreen(cx - w / 2, cy - h, cx + w / 2, cy + 40)) continue;
      for (const bx of [cx - w / 2 + 14, cx + w / 2 - 14]) { ctx.fillStyle = "#2a2630"; ctx.beginPath(); ctx.moveTo(bx - 8, cy + h / 2); ctx.lineTo(bx + 8, cy + h / 2); ctx.lineTo(bx, cy + h / 2 + 22); ctx.fill();
        ctx.fillStyle = "#4a4452"; ctx.fillRect(bx - 8, cy + h / 2, 16, 3); ctx.fillStyle = "#151218"; ctx.fillRect(bx - 1, cy + h / 2 + 4, 2, 2); } }
  }

  /** The back wall of a room, where no sky shows through it: the theme's rock, faint, in place of a flat colour. */
  function backWall(ctx: Ctx, T: Theme, x: number, y: number, w: number, h: number, alpha: number) {
    const img = themeId && image(`scenery/fill-${themeId}.png`);
    if (!img) { ctx.fillStyle = T.solid; ctx.globalAlpha = alpha; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; return; }
    if (!pattern) { pattern = ctx.createPattern(img, "repeat"); pattern?.setTransform(new DOMMatrix().scale(3)); }
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha * 0.7; ctx.fillStyle = pattern ?? T.solid; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = alpha * 0.55; ctx.fillStyle = T.solid; ctx.fillRect(x, y, w, h); ctx.restore();
  }

  /** How a dressed piece leans: grass and banners in the wind, and grass pushed aside by a fighter walking through it. */
  function skew(d: Decor, v: View) {
    const m = meta(d); if (!m?.sway) return 0;
    let s = wind(v.time, d.x) * (m.wall ? 0.05 : 0.12) * (mood?.wind ?? 0.5);
    if (v.hero && !m.under && !m.wall && Math.abs(v.hero.y - d.y) < 80) { const dx = d.x - v.hero.x; if (Math.abs(dx) < 50) s += Math.sign(dx || 1) * (1 - Math.abs(dx) / 50) * 0.45; }
    return s;
  }
  /** A hanger's top is where it hangs: it is drawn down from there. */
  const hangs = (d: Decor) => (meta(d)?.under ? (SCENERY[(d as { piece: string }).piece].h * SCENERY[(d as { piece: string }).piece].k) : 0);
  /** Whether a piece is gone for now: a broken urn, an icicle that has fallen and not grown back. */
  const gone = (i: number) => hidden.has(i);

  /** Weather, drips, falling icicles, broken urns, creatures and breath: moved by `dt` and drawn in the world. */
  function ambient(ctx: Ctx, v: View) {
    if (!mood || !level) return;
    const dt = Math.min(0.05, v.dt), x0 = v.camX - 100, y0 = v.camY - 100, x1 = v.camX + v.w / v.scale + 100, y1 = v.camY + v.h / v.scale + 100, W = wind(v.time);
    // Weather: a fixed number of bits kept inside the view.
    const want = mood.weather === "snow" ? 160 : mood.weather === "dust" ? 70 : 90;
    while (bits.length < want) bits.push(spawn(x0, y0, x1, y1, bits.length < want / 2));
    for (const b of bits) {
      b.age += dt;
      if (mood.weather === "snow") { b.vx = W * 40 * b.size; b.vy = 25 + 22 * b.size; }
      else if (mood.weather === "embers") { b.vx = W * 30 + Math.sin(b.age * 3 + b.tone * 9) * 15; }
      else b.vx = W * 10 + Math.sin(b.age + b.tone * 7) * 6;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.age > b.life || b.x < x0 - 50 || b.x > x1 + 50 || b.y < y0 - 80 || b.y > y1 + 80) Object.assign(b, spawn(x0, y0, x1, y1, false));
      const a = Math.min(1, b.age * 2, (b.life - b.age) * 2), blink = mood.weather === "spores" ? 0.5 + 0.5 * Math.sin(v.time * 3 + b.tone * 20) : 1;
      ctx.globalAlpha = a * blink * (mood.weather === "dust" ? 0.35 : mood.weather === "embers" ? 1 : 0.8);
      ctx.fillStyle = WEATHER[mood.weather][b.kind && mood.weather === "spores" ? 1 : b.tone > 0.5 && mood.weather === "embers" ? 1 : 0];
      ctx.fillRect(b.x, b.y, b.size * 2.4, b.size * 2.4);
    }
    ctx.globalAlpha = 1;
    // Fireflies in the fungal dark, moths about every light of a lantern, candle or torch.
    ctx.fillStyle = mood.fireflies ? "#c8ff8c" : "#f0e6c8";
    for (const [d, i, up] of moths) { if (!inView(d.x, d.y, v, 80)) continue;
      for (let k = 0; k < 3; k++) { const a = v.time * (1.3 + k * 0.4) + i + k * 2.1, r = 18 + k * 9; ctx.globalAlpha = mood.fireflies ? 0.5 + 0.5 * Math.sin(v.time * 5 + k + i) : 0.8; ctx.fillRect(d.x + Math.cos(a) * r, d.y - up + Math.sin(a * 1.7) * r * 0.5, 2, 2); } }
    ctx.globalAlpha = 1;
    // Drips from stalactites and icicles, rippling where they land; an icicle falls when a fighter passes under it.
    for (const [d, m, i] of drippers) {
      if (!inView(d.x, d.y, v, 200)) continue;
      const tipY = d.y + m.h * m.k, floor = floorUnder(d.x, tipY), ph = (v.time * 0.35 + hash(i, 1, 3)) % 1;
      if (floor < Infinity && !hidden.has(i)) { const fallY = tipY + ph * ph * (floor - tipY) * 1.2;
        if (fallY < floor) { ctx.fillStyle = mood.snow ? "rgba(200,235,255,0.8)" : "rgba(150,180,220,0.7)"; ctx.fillRect(d.x - 1, fallY, 2, 4); }
        else { const r = (fallY - floor) / (floor - tipY + 1) * 30; ctx.strokeStyle = `rgba(160,200,230,${clamp(0.6 - r / 40)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(d.x, floor - 1, 4 + r, 1.5 + r * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); } }
      if (m.drip && v.hero && !falls.has(i) && Math.abs(v.hero.x - d.x) < 40 && v.hero.y > tipY && hash(i, 9, 2) < 0.5) { hidden.add(i); falls.set(i, { x: d.x, y: d.y, vy: 0, floor, done: false, back: v.time + 9 }); }
    }
    for (const [i, f] of falls) {
      if (!f.done) { f.vy += 1400 * dt; f.y += f.vy * dt; const p = SCENERY[(level.decor![i] as { piece: string }).piece];
        drawPiece(ctx, "scenery", (level.decor![i] as { piece: string }).piece, f.x, f.y + p.h * p.k, p.k, true);
        if (f.y + p.h * p.k >= f.floor) { f.done = true; for (let k = 0; k < 8; k++) shards.push({ x: f.x, y: f.floor - 4, vx: (hash(k, i, 1) - 0.5) * 260, vy: -80 - hash(k, i, 2) * 160, life: 0.7, age: 0, size: 1.5, tone: 0.9, kind: 0 }); } }
      else if (v.time > f.back) { falls.delete(i); hidden.delete(i); }
    }
    // An urn breaks when a fighter strikes beside it: shards, and a little of what was in it.
    if (v.hero?.striking) for (const [d, i] of urns) if (!hidden.has(i) && Math.abs(v.hero.x - d.x) < 56 && Math.abs(v.hero.y - d.y) < 70) {
      hidden.add(i); for (let k = 0; k < 12; k++) shards.push({ x: d.x, y: d.y - 18, vx: (hash(k, i, 4) - 0.5) * 300, vy: -120 - hash(k, i, 5) * 200, life: 0.9, age: 0, size: 2, tone: k % 3 ? 0.3 : 1, kind: 1 }); }
    shards = shards.filter((s) => (s.age += dt) < s.life);
    for (const s of shards) { s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; ctx.fillStyle = s.kind ? (s.tone > 0.5 ? `rgba(255,220,120,${1 - s.age / s.life})` : "rgba(90,70,60,0.9)") : "rgba(210,240,255,0.9)"; ctx.fillRect(s.x, s.y, s.size * 2, s.size * 2); }
    // Creatures: perched until a fighter comes near, then away, and back a while later.
    const sheet = mood.critter && SCENERY[mood.critter], cimg = sheet && image(sheet.file);
    for (const c of critters) {
      if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) { c.x = c.home[0]; c.y = c.home[1]; c.flee = 0; } continue; }
      if (!c.flee && v.hero && Math.hypot(v.hero.x - c.x, v.hero.y - c.y) < 170) { c.flee = 0.01; c.vx = Math.sign(c.x - v.hero.x || 1) * (120 + hash(c.home[0], 1, 1) * 80); c.vy = -160; }
      if (c.flee) { c.flee += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy -= 40 * dt; if (c.flee > 3) c.gone = 20; }
      if (!cimg || !sheet || c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
      const f = c.flee ? Math.floor(v.time * 12) % 2 : mood.critter === "bat" ? Math.floor(v.time * 6) % 2 : 0, k = 3, bob = c.flee ? 0 : Math.sin(v.time * 2 + c.home[0]) * (mood.critter === "bat" ? 6 : 0);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(c.x, c.y + bob); if (c.vx < 0) ctx.scale(-1, 1);
      ctx.drawImage(cimg, (sheet.x ?? 0) + f * 11, sheet.y ?? 0, 11, 7, -16, -21, 11 * k, 7 * k); ctx.restore();
    }
    // Incense: a thin wisp curling up off every censer and candle in view, bending with the wind.
    ctx.fillStyle = "#dcd2dc";
    for (const [d, m, i] of smokers) { if (!inView(d.x, d.y, v, 100)) continue;
      const top = m.under ? d.y + m.h * m.k * 0.8 : d.y - m.h * m.k;
      for (let k = 0; k < 6; k++) { const u = ((v.time * 0.25 + k / 6 + hash(i, 2, 1)) % 1); ctx.globalAlpha = 0.22 * (1 - u);
        ctx.fillRect(d.x + Math.sin(u * 7 + i) * 6 * u + W * 30 * u * u, top - u * 90, 2 + u * 3, 2 + u * 3); } }
    ctx.globalAlpha = 1;
    // Heat over fire: a few wavering lines rising off each grate (cheap; the view itself is never copied).
    if (mood.shimmer) { ctx.strokeStyle = "rgba(255,200,150,0.18)"; ctx.lineWidth = 2;
      for (const f of level.traps?.flames ?? []) { if (!inView(f.x, f.y, v, 100)) continue;
        for (let k = 0; k < 4; k++) { const u = (v.time * 0.6 + k / 4) % 1, x = f.x - f.w / 2 + (k + 0.5) * f.w / 4, y = f.y - f.h * 0.6 - u * 80; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(v.time * 6 + k) * 6, y - 12, x, y - 24); ctx.stroke(); } } }
    // Breath in the cold: a small cloud from the fighter's mouth now and then.
    if (mood.frost && v.hero) { if (v.time > breathAt) { breathAt = v.time + 1.2; for (let k = 0; k < 5; k++) breath.push({ x: v.hero.x + v.hero.facing * 14, y: v.hero.y - 34, vx: v.hero.facing * (20 + k * 6), vy: -8 - k * 2, life: 1, age: 0, size: 2 + k * 0.6, tone: 0, kind: 0 }); } }
    breath = breath.filter((b) => (b.age += dt) < b.life);
    for (const b of breath) { b.x += b.vx * dt; b.y += b.vy * dt; ctx.fillStyle = `rgba(235,245,255,${0.45 * (1 - b.age)})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.size + b.age * 6, 0, Math.PI * 2); ctx.fill(); }
  }
  function spawn(x0: number, y0: number, x1: number, y1: number, anywhere: boolean): Bit {
    const r = Math.random, w = mood?.weather, x = x0 + r() * (x1 - x0);
    const y = anywhere ? y0 + r() * (y1 - y0) : w === "snow" ? y0 - 20 : w === "embers" || w === "spores" ? y1 + 20 : y0 + r() * (y1 - y0);
    return { x, y, vx: 0, vy: w === "embers" ? -40 - r() * 50 : w === "spores" ? -12 - r() * 18 : w === "snow" ? 40 : (r() - 0.5) * 8, life: w === "dust" ? 4 + r() * 4 : 8 + r() * 6, age: anywhere ? r() * 3 : 0, size: 0.6 + r() * (w === "snow" ? 1.2 : 0.8), tone: r(), kind: r() < 0.35 ? 1 : 0 };
  }

  /** Over the whole view: the dark with every light cut out of it, the glow of each light, shafts through windows,
   * shimmer over fire, frost at the edges, and the theme's grade. `lights` adds what the level's traps and marks give off. */
  function light(ctx: Ctx, v: View, lights: [x: number, y: number, r: number, rgb: string][]) {
    if (!mood || !level) return;
    const sx = (x: number) => (x - v.camX) * v.scale, sy = (y: number) => (y - v.camY) * v.scale, all = [...lights];
    for (const l of lamps) { if (l.i >= 0 && hidden.has(l.i)) continue; if (!inView(l.x, l.y, v, l.r)) continue;
      all.push([l.x, l.y, l.r * (l.flicker ? 0.85 + 0.15 * Math.sin(v.time * 13 + l.i) * Math.sin(v.time * 7.3 + l.i * 2) : 1), l.rgb]); }
    const cx = v.w / 2, cy = v.h / 2, on = all.filter(([x, y, r]) => sx(x) > -r * v.scale && sx(x) < v.w + r * v.scale && sy(y) > -r * v.scale && sy(y) < v.h + r * v.scale);
    if (on.length > 24) on.sort((a, b) => (sx(a[0]) - cx) ** 2 + (sy(a[1]) - cy) ** 2 - (sx(b[0]) - cx) ** 2 - (sy(b[1]) - cy) ** 2).length = 24;
    ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    // The dark, at a third of the size (it is soft, so nothing is lost), with the lights cut out.
    const D = 3, lw = Math.ceil(v.w / D), lh = Math.ceil(v.h / D);
    if (!dark) { dark = document.createElement("canvas"); lctx = dark.getContext("2d"); }
    if (!lctx) { ctx.restore(); return; }
    if (dark.width !== lw || dark.height !== lh) { dark.width = lw; dark.height = lh; }
    lctx.globalCompositeOperation = "source-over"; lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = `rgba(${mood.grade},1)`; lctx.globalAlpha = mood.dark + 0.07; lctx.fillRect(0, 0, lw, lh); lctx.globalAlpha = 1;
    lctx.drawImage(edges(lw, lh, mood), 0, 0);                                    // the vignette, and frost for the cold
    lctx.globalCompositeOperation = "destination-out";
    const cut = glow("0,0,0", 1); for (const [x, y, r] of on) { const R = r * v.scale / D; lctx.drawImage(cut, sx(x) / D - R, sy(y) / D - R, 2 * R, 2 * R); }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(dark, 0, 0, v.w, v.h);
    // Each light's own colour, added.
    ctx.globalCompositeOperation = "lighter";
    for (const [x, y, r, rgb] of on) { const R = r * v.scale * 0.6; ctx.drawImage(glow(rgb, 0.28), sx(x) - R, sy(y) - R, 2 * R, 2 * R); }
    // Shafts of light through stained glass and barred windows, with dust turning in them.
    for (const [d, m] of shafts) { if (!inView(d.x, d.y, v, 300)) continue;
      const X = sx(d.x), Y = sy(d.y - m.h * m.k * 0.5), L = 260 * v.scale, Wd = m.w * m.k * v.scale * 0.8; if (X < -L || X > v.w + L || Y < -L || Y > v.h) continue;
      const g = ctx.createLinearGradient(X, Y, X + L * 0.5, Y + L); g.addColorStop(0, `rgba(${m.shaft ?? "230,220,190"},0.16)`); g.addColorStop(1, `rgba(${m.shaft ?? "230,220,190"},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X - Wd / 2, Y); ctx.lineTo(X + Wd / 2, Y); ctx.lineTo(X + Wd / 2 + L * 0.5, Y + L); ctx.lineTo(X - Wd / 2 + L * 0.35, Y + L); ctx.fill();
      for (let k = 0; k < 6; k++) { const u = (v.time * 0.05 + k / 6) % 1; ctx.fillStyle = `rgba(255,245,220,${0.5 * Math.sin(u * Math.PI)})`; ctx.fillRect(X + u * L * 0.42 + Math.sin(v.time + k) * 8, Y + u * L, 2, 2); } }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  return { enter, backdrop, fill, backWall, ground, skew, hangs, gone, ambient, light, meta, moodOf: () => mood };
}

// spec/app/index.md, "Story: Fight the waves"
// The arena's pixel effects, played live from pixelfx (./pixelfx, MIT: Patch and Hugo Duprez): each is code that
// paints a small frame, so one effect serves every fighter in that fighter's own colours.
import { FX, FX_PALETTE } from "./data.ts";
import { type FxFrame, type FxInstance, type FxModule, PAL, clearFrame, composite, createFrame, createFx } from "./pixelfx/core/index.js";
import type { Sprite } from "./sim.ts";

const modules = import.meta.glob<FxModule>("./pixelfx/fx/*/*.js", { eager: true });
interface Live { fx: FxInstance; frame: FxFrame; canvas: HTMLCanvasElement; pixels: ImageData; t: number; stopped: boolean }
const playing = new WeakMap<Sprite, Live>();

/** How many pixels painting `s` afresh costs: each of its frame's pixels is worked out in code. */
export function effectArea(s: Sprite) { const [w, h] = modules[`./pixelfx/fx/${FX[s.fx].id}.js`].meta.size; return w * h; }

/** Draws `s` as it is `s.age` steps in, its origin at (s.x, s.y); or, not `fresh`, as it was last painted. */
export function drawEffect(ctx: CanvasRenderingContext2D, s: Sprite, fresh = true) {
  const def = FX[s.fx], mod = modules[`./pixelfx/fx/${def.id}.js`];
  const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin, px = s.flip ? w - ox : ox;
  let live = playing.get(s);
  if (!live) {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const fx = createFx(mod, { x: px, y: oy, flip: s.flip, palette: PAL[FX_PALETTE[s.tone]], seed: (Math.floor(s.x * 7 + s.y * 13) & 1023) + 1, light: 0.7 });
    live = { fx, frame: createFrame(w, h), canvas, pixels: new ImageData(w, h), t: 0, stopped: false };
    playing.set(s, live);
  }
  const at = ("skip" in def ? def.skip : 0) + (s.age / 60) * def.rate;
  if (!fresh && live.t > 0) { const k = def.scale * s.scale; ctx.imageSmoothingEnabled = false; ctx.drawImage(live.canvas, s.x - px * k, s.y - oy * k, w * k, h * k); ctx.imageSmoothingEnabled = true; return; }
  if (at > live.t) { live.fx.update(at - live.t); live.t = at; }
  // A loop is let go a little before its time is up, so that it fades instead of vanishing.
  if (mod.meta.loop && !live.stopped && s.age / 60 > def.seconds / def.rate - 0.3) { live.fx.stop(); live.stopped = true; }
  clearFrame(live.frame);
  live.fx.draw(live.frame);
  composite(live.frame, live.pixels.data, null, 0.8);
  live.canvas.getContext("2d")!.putImageData(live.pixels, 0, 0);
  const k = def.scale * s.scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(live.canvas, s.x - px * k, s.y - oy * k, w * k, h * k);
  ctx.imageSmoothingEnabled = true;
}

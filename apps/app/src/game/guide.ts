// spec/app/index.md, "Story: Play a level of a campaign"
// The guide: the Reaper (art/packs/README.md), who meets the fighter where a level starts and says what the
// chapter is. What he says is the level's (levels.ts); this is only drawing him.
const urls = import.meta.glob<string>("./packs/guide/*.png", { eager: true, query: "?url", import: "default" });
let sheet: HTMLImageElement | undefined;
/** With his scythe he stands 33 pixels tall in a cell of 48, his feet at its 40th row; here he is drawn as tall as a fighter. */
const CELL = 48, FRAMES = 5, FEET = [23, 40], SCALE = 3;

/** Draws him with his feet at (x, y), facing `facing`, as much there as `alpha`; `time` in seconds moves his cloak. */
export function drawGuide(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, alpha: number, time: number) {
  if (!sheet) { sheet = new Image(); sheet.src = urls["./packs/guide/idle.png"]; }
  if (!sheet.complete || sheet.naturalWidth === 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  // He does not quite stand on the ground.
  ctx.translate(x, y - 6 - Math.sin(time * 2.2) * 4);
  ctx.scale(facing < 0 ? -SCALE : SCALE, SCALE);
  ctx.drawImage(sheet, (Math.floor(time * 7) % FRAMES) * CELL, 0, CELL, CELL, -FEET[0], -FEET[1], CELL, CELL);
  ctx.restore();
}

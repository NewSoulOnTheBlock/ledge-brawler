// 2. Blotling body, drawn from shapes at any radius (large / medium / small)
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
const { ink, gold } = require("./wraith.cjs");                // same Ink faction palette
const BODY = P.hueRamp(4, { hue: 250, sat: 0.16, light: [0.07, 0.36], shift: 20 }), GLOSS = P.col(P.hsl(225, 0.14, 0.62)), GLINT = P.col(P.hsl(55, 1, 0.94));
const EYE = [gold[2], gold[3], P.col(P.hsl(50, 1, 0.6)), P.col(P.hsl(54, 1, 0.74))];
// look: {eye: 0..1 open, px: pupil x shift, blink}
const blot = (r, look = {}) => {
  const W = Math.ceil(2 * r) + 9, H = Math.ceil(2 * r) + Math.max(3, Math.round(r * 0.45)) + 2, b = new P.Buf(W, H);
  const cx = W / 2, cy = r + 1, inBody = (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r + 0.3 * r;
  // legs (behind body)
  const legH = Math.max(2, Math.round(r * 0.4)), legW = Math.max(2, Math.round(r * 0.35));
  for (const s of [-1, 1]) { const lx = Math.round(cx + s * r * 0.42 - legW / 2);
    for (let y = 0; y < legH; y++) for (let x = 0; x < legW; x++) b.pset(lx + x, Math.round(cy + r * 0.75) + y, y === legH - 1 || x === 0 || x === legW - 1 ? ink[0] : ink[1]);
    if (r > 4) b.pset(lx + (s < 0 ? 0 : legW - 1), Math.round(cy + r * 0.75) + legH - 1, gold[1]); }
  // body: lit from the top left, dark outline, gold reflection on the lower right rim, gloss spot
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inBody(x, y)) continue;
    const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r, edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);
    const lit = Math.max(0, -0.6 * nx - 0.8 * ny);
    let c = BODY[P.band(0.1 + 0.62 * lit, 4, x, y, 0.25)];
    if (edge) c = nx * 0.7 + ny * 0.7 > 0.75 ? gold[1] : ink[0];
    else if ((nx + 0.42) ** 2 + (ny + 0.58) ** 2 < 0.02 + 0.5 / (r * r)) c = GLOSS;
    b.pset(x, y, c); }
  // gold flecks
  if (r > 4) [[0.55, -0.35], [0.3, 0.55], [-0.6, 0.3], [0.6, 0.2]].forEach(([fx, fy]) => b.pset(Math.round(cx + fx * r), Math.round(cy + fy * r), gold[2]));
  // eye
  const re = r * 0.52, ex = cx - r * 0.05 + (look.px || 0), ey = cy - r * 0.12, open = look.eye ?? 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - ex, dy = (y + 0.5 - ey) / Math.max(0.15, open); if (dx * dx + dy * dy > re * re + 0.2) continue;
    const e = dx * dx + dy * dy > (re - 1) ** 2, lit = Math.max(0, (-0.5 * dx - 0.7 * dy) / re + 0.4);
    let c = e ? gold[1] : EYE[Math.min(3, P.band(lit, 4, x, y, 0.2))];
    if (Math.abs(dx) < 0.6 && Math.abs(dy) < re * 0.72 && open > 0.4) c = ink[0];
    b.pset(x, y, c); }
  if (open > 0.6 && r > 3) b.pset(Math.round(ex - re * 0.45), Math.round(ey - re * 0.45), GLINT);
  // arms with gold claws
  const ay = Math.round(cy + r * 0.25), aw = Math.max(1, Math.round(r * 0.22)), ah = Math.max(2, Math.round(r * 0.45));
  for (const s of [-1, 1]) { const ax = s < 0 ? Math.round(cx - r) - aw + 1 : Math.round(cx + r) - 1;
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw + 1; x++) b.pset(ax + x, ay + y, x === (s < 0 ? 0 : aw) ? ink[0] : ink[1]);
    for (let x = 0; x < aw + 1; x++) b.pset(ax + x, ay + ah, gold[x % 2 ? 1 : 2]); }
  return b;
};
module.exports = { blot, ink, gold };
if (require.main === module) {
  const hero = P.crop(P.load("../../apps/app/src/game/seeker/Ember/Seeker_Ember_Idle_30x30_24f.png"), 0, 0, 30, 30);
  const L = blot(9), M = blot(6), S = blot(4);
  P.save(P.sheet([{ buf: P.load("work/blot-cut.png"), label: "ref", fit: 200 }, { buf: L, label: "large", scale: 8 }, { buf: M, label: "medium", scale: 8 }, { buf: S, label: "small", scale: 8 },
    { buf: hero, label: "hero 1x", scale: 1 }, { buf: L, label: "1x", scale: 1 }, { buf: M, label: "1x", scale: 1 }, { buf: S, label: "1x", scale: 1 }], { cols: 4 }), "work/blot-view.png");
}

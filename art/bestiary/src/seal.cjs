// 3. Seal-Bearer parts: upper body, legs, wax-seal tower shield, sword. Faces right.
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js"), grid = require("./grid.cjs");
const { gold } = require("./wraith.cjs");
const arm = P.hueRamp(4, { hue: 235, sat: 0.14, light: [0.06, 0.38], shift: 20 });
const wax = P.hueRamp(6, { hue: 40, sat: 0.86, light: [0.2, 0.74], shift: 22 });
const INK = P.col(P.hsl(250, 0.3, 0.05)), STEEL = P.col(P.hsl(215, 0.12, 0.7)), EYE = P.col(P.hsl(50, 1, 0.62));
const L = { K: arm[0], a: arm[1], b: arm[2], c: arm[3], o: gold[0], G: gold[1], g: gold[2], y: gold[3], Y: EYE };
const upper = grid([
"..........KKKK..........",
".........KbccbK.........",
"........KbccbbaK........",
"........KbbbbaaK........",
"........KaKKKKKK........",
"........KaKYKKYK........",
"........KaaKKKKK........",
".........KaGGaaK........",
"...KKKK...KKKKK.........",
"..KbccbKKKaaaaaKK.......",
".KbcGcbbKaabbaaaaK......",
".KbcccbGKabbcbaaaaK.....",
".KGbbbbGKabbcbbaaaK.....",
"..KGGGGKKaabbbbaaaaK....",
"...KaaKKaaabbbbaaaaK....",
"...KaaKKaaaabbaaaaaK....",
"...KbaKKKaaaaaaaaaKK....",
"...KbaK.KKoGGGGGoKK.....",
"...KbaK.KaoGyyGoaK......",
"...KGGK.KaaoGGoaaK......",
"...KyyK.KaaaaaaaaK......",
"...KKKK.KaaKaaKaaK......",
"........KaKKaKKaK.......",
"........KK..K..KK.......",
], L);
const leg = grid(["KaaK.", "KabK.", "KGGK.", "KabK.", "KabK.", "KaaK.", "KaabK", "KKKKK"], L);
// wax-seal tower shield: lumpy rounded slab, raised ring, stamped sigil, ink-leaking cracks
const SIGIL = ["....o....", "...ooo...", "..o.o.o..", ".o..o..o.", "ooooooooo", ".o..o..o.", "..o.o.o..", "...ooo...", "....o....", "...o.o...", "..o...o.."];
const CRACKS = [[[3, 4], [5, 9], [3, 14], [6, 20]], [[16, 7], [13, 12], [15, 18], [12, 26]], [[6, 26], [9, 30]]];
const shield = (crack = 1, chip = 0) => {
  const W = 19, H = 33, b = new P.Buf(W, H), cx = 9, cy = 16, a = 9, bb = 16;
  const lump = (x, y) => 0.06 * Math.sin(x * 2.1 + y * 0.7) + 0.05 * Math.sin(y * 1.3);
  const inS = (x, y) => Math.abs((x + 0.5 - cx) / a) ** 2.6 + Math.abs((y + 0.5 - cy) / bb) ** 2.6 <= 1 + lump(x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inS(x, y)) continue;
    const nx = (x + 0.5 - cx) / a, ny = (y + 0.5 - cy) / bb, edge = !inS(x - 1, y) || !inS(x + 1, y) || !inS(x, y - 1) || !inS(x, y + 1);
    const rr = Math.abs(nx) ** 2.6 + Math.abs(ny) ** 2.6, ring = rr > 0.5 && rr < 0.68;
    const lit = 0.5 - 0.35 * nx - 0.3 * ny + (ring ? 0.25 : 0) - (rr > 0.68 && rr < 0.8 ? 0.15 : 0);
    b.pset(x, y, edge ? wax[0] : wax[1 + P.band(Math.max(0, Math.min(1, lit)), 5, x, y, 0.2)]); }
  SIGIL.forEach((r, j) => [...r].forEach((c, i) => { if (c !== "o") return; b.pset(5 + i, 10 + j, wax[0]); if (SIGIL[j + 1]?.[i + 1] !== "o") b.pset(6 + i, 11 + j, wax[5]); }));
  CRACKS.slice(0, crack + 1).forEach(pl => { for (let k = 0; k < pl.length - 1; k++) { const [x0, y0] = pl[k], [x1, y1] = pl[k + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let t = 0; t <= n; t++) { const x = Math.round(x0 + (x1 - x0) * t / n), y = Math.round(y0 + (y1 - y0) * t / n); if (inS(x, y)) b.pset(x, y, INK); } } });
  for (let k = 0; k < chip; k++) b.px[(2 + k) * W + (13 - (k % 2))] = 0;
  return b;
  function A_ok(bf, x, y) { return x >= 0 && y >= 0 && x < W && y < H && (bf.px[y * W + x] >>> 24); }
};
// crack mouths where ink leaks (bottom of each crack)
const LEAKS = [[6, 20], [12, 26], [9, 30]];
const sword = (b, hx, hy, len = 9) => { b.pset(hx, hy, gold[2]); b.pset(hx - 1, hy, gold[1]); b.pset(hx + 1, hy, gold[1]);
  for (let k = 1; k <= len; k++) { const x = hx - Math.round(k * 0.35), y = hy + k; b.pset(x, y, k === len ? arm[3] : STEEL); if (k < len) b.pset(x + 1, y, arm[2]); } };
module.exports = { upper, leg, shield, sword, LEAKS, arm, wax, gold, INK, EYE };
if (require.main === module) {
  const A = require("./anim.cjs"), f = new P.Buf(64, 48);
  // rest pose composite
  sword(f, 14, 36, 9); A.over(f, leg, 17, 38); A.over(f, leg, 23, 38); A.over(f, upper, 10, 16); A.over(f, shield(1), 27, 12);
  const hero = P.crop(P.load("../../apps/app/src/game/seeker/Ember/Seeker_Ember_Idle_30x30_24f.png"), 0, 0, 30, 30);
  P.save(f, "work/seal-rest.png");
  P.save(P.sheet([{ buf: P.load("work/seal-cut.png"), label: "ref", fit: 220 }, { buf: f, label: "v2", scale: 6 }, { buf: hero, label: "hero", scale: 6 }, { buf: f, label: "1x", scale: 1 }, { buf: hero, label: "1x", scale: 1 }], { cols: 3 }), "work/seal-view.png");
}

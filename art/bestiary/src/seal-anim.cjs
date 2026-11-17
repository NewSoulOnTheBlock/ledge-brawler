// 3. Seal-Bearer: idle, walk, block, bash, turn, hurt, death. 64x48 frames, faces right, floor y 46.
const A = require("./anim.cjs"), P = A.P, S = require("./seal.cjs");
const { upper, leg, shield, sword, LEAKS, arm, wax, gold, INK } = S;
const W = 64, H = 48, FL = 46;
// one pose: u = upper body offset, bl/fl = back/front leg offsets, s = shield offset, crack level, chips
const R = (v) => (v || [0, 0]).map(Math.round);
const knight = (o = {}) => { const f = new P.Buf(W, H), u = R(o.u), s = R(o.s), bl = R(o.bl), fl = R(o.fl);
  const ux = 10 + u[0], uy = 16 + u[1];
  if (o.sword !== false) sword(f, ux + 4, uy + 20, 9);
  A.over(f, leg, 17 + bl[0], 38 + bl[1]); A.over(f, leg, 23 + fl[0], 38 + fl[1]);
  A.over(f, o.dark ? A.tint(upper, arm[0], 0.3) : upper, ux, uy);
  if (o.shield !== false) A.over(f, o.sh || shield(o.crack ?? 1, o.chip || 0), 27 + s[0], 12 + s[1]);
  return f; };
const leak = (f, s, t, n = 3) => (s = R(s), LEAKS).slice(0, n).forEach(([x, y], k) => { const ph = (t + k * 2) % 6, X = 27 + s[0] + x, Y = 12 + s[1] + y;
  if (ph < 3) for (let j = 1; j <= ph; j++) f.pset(X, Y + j, INK); else if (Y + 3 + (ph - 2) * 3 < FL) f.pset(X, Y + 3 + (ph - 2) * 3, INK); });
const flash = (b) => A.tint(b, [255, 246, 220]);

// IDLE: slow breath (upper body and shield sink a pixel, shield lags), ink leaks from the cracks
const idle = [...Array(6)].map((_, i) => { const b = i >= 2 && i <= 4 ? 1 : 0, sb = i >= 3 && i <= 5 ? 1 : 0, f = knight({ u: [0, b], s: [0, sb] }); leak(f, [0, sb], i); return f; });
// WALK: heavy step cycle, the planted leg pushes back, body dips on contact
const step = [[-2, 0], [-1, 0], [0, -1], [1, -2], [2, -1], [2, 0], [1, 0], [0, 0]];
const walk = step.map((fs, i) => { const bs = step[(i + 4) % 8], dip = fs[1] === 0 && bs[1] === 0 ? 1 : 0;
  const f = knight({ u: [0, dip], fl: [fs[0] * 2, fs[1]], bl: [bs[0] * 2, bs[1]], s: [0, dip + (i % 4 === 1 ? 1 : 0)] }); leak(f, [0, dip], i); return f; });
// BLOCK: brace, a blow lands on the shield: wax chips and ink spray back, the knight slides back a pixel, recover
const block = [];
for (let i = 0; i < 6; i++) { const push = i === 1 ? -2 : i === 2 ? -1 : 0, f = knight({ u: [push - (i < 4 ? 1 : 0), i < 4 ? 1 : 0], s: [push + 1, 0], bl: [-1, 0], chip: i >= 1 ? 2 : 0 });
  if (i === 1) { for (const [dx, dy] of [[2, -2], [3, 0], [2, 2]]) f.pset(46 + push + dx, 25 + dy, P.col(P.hsl(55, 1, 0.92))); f.pset(45 + push, 25, P.col(P.hsl(55, 1, 0.92))); }
  if (i >= 1 && i <= 4) { const t = i; [[1, -1.2], [1.4, -0.4], [0.9, 0.5]].forEach(([vx, vy], k) => { const x = 46 + vx * t * 2.2, y = 22 + vy * t * 2 + 0.4 * t * t;
    f.pset(Math.round(x), Math.round(y), k === 1 ? INK : wax[k === 0 ? 4 : 2]); }); }
  block.push(f); }
// BASH: draw back, drive the shield forward (smear lines), impact flash, hold, recover
const bashU = [[-2, 1], [-3, 1], [3, 0], [6, 0], [6, 0], [4, 0], [2, 0], [0, 0]];
const bash = bashU.map(([dx, dy], i) => { const f = knight({ u: [dx, dy], s: [dx + (i === 3 ? 2 : 0), dy], bl: [Math.min(0, dx), 0], fl: [Math.max(0, dx), 0] });
  if (i === 3) for (const [x, y] of [[48, 20], [49, 26], [48, 32], [50, 23], [50, 29], [51, 26], [50, 17], [50, 35]]) f.pset(x + dx + 2, y, P.col(P.hsl(55, 1, 0.9)));
  if (i === 4) for (const [x, y] of [[52, 19], [53, 26], [52, 33]]) f.pset(x + dx, y, wax[4]);
  return f; });
// TURN: a slow about-face (the opening to hit it from behind); the game flips facing on the last frame
const rest = knight();
const turn = [1, 0.75, 0.4, -0.4, -0.75, -1].map((k, i) => { const f = A.place(k < 0 ? P.flip ? P.flip(rest) : rest : rest, W, H, 32, FL, { sx: Math.abs(k) });
  return k < 0 ? A.place(mirror(rest), W, H, 32, FL, { sx: Math.abs(k) }) : f; });
function mirror(b) { const o = new P.Buf(b.w, b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o.px[y * b.w + (b.w - 1 - x)] = b.px[y * b.w + x]; return o; }
// HURT (hit from behind): flash, lurch forward, helm nods, settle
const hurt = [flash(knight({ u: [2, 1], s: [1, 0] })), knight({ u: [2, 1], s: [1, 1], dark: true }), knight({ u: [1, 0], s: [0, 0] }), knight()];
// DEATH: flash, drops to a knee, the seal cracks through and splits, ink floods out, the knight topples back into a puddle
const death = [];
for (let i = 0; i < 14; i++) { let f;
  if (i === 0) f = flash(knight({ u: [1, 1] }));
  else if (i < 4) { f = knight({ u: [0, Math.min(5, i * 2)], s: [0, Math.min(4, i * 1.5)], fl: [2, 0], bl: [-1, 0], crack: 2 }); leak(f, [0, Math.min(4, i * 1.5)], i * 2); }
  else { const t = i - 4, sh = shield(2), half = (sx0, sx1) => { const o = new P.Buf(sh.w, sh.h); for (let y = 0; y < sh.h; y++) for (let x = sx0; x < sx1; x++) o.px[y * sh.w + x] = sh.px[y * sh.w + x]; return o; };
    f = new P.Buf(W, H); let body = knight({ u: [0, 5], fl: [2, 0], bl: [-1, 0], shield: false, sword: t < 2 });
    body = A.melt(body, A.E.io(Math.min(1, t / 7)), FL, 8); if (t > 6) body = A.dissolve(body, 1 - (t - 6) / 4, 9); A.over(f, body);
    const fall = Math.min(1, t / 4); // shield halves topple outward
    A.over(f, A.place(half(0, 9), W, H, 30 - 2 * fall, FL, { rot: -0.85 * fall }), 0, 0); A.over(f, A.place(half(9, 19), W, H, 38 + 1 * fall, FL, { rot: 0.8 * fall }), 0, 0);
    for (let x = 22 - t; x <= 44 + t; x++) if (A.hash(x, 1, 3) < 0.9 - Math.max(0, t - 6) * 0.2) f.pset(x, FL, INK);   // ink pool spreads
  }
  death.push(f); }
module.exports = { idle, walk, block, bash, turn, hurt, death };
if (require.main === module) A.render("seal-bearer", {
  idle: { frames: idle, delay: 160 }, walk: { frames: walk, delay: 120 },
  block: { frames: block, delay: [80, 70, 90, 100, 110, 130] }, bash: { frames: bash, delay: [110, 130, 50, 120, 100, 90, 90, 110] },
  turn: { frames: turn, delay: 110 }, hurt: { frames: hurt, delay: [70, 100, 110, 130] },
  death: { frames: death, delay: [90, 110, 110, 140, 90, 90, 90, 90, 100, 100, 110, 120, 140, 260] } }, { scale: 3 });

// Scenery pack for the six campaign themes: props, hangers, far silhouettes, near silhouettes, rock fill tiles, gates,
// urns and critters, all drawn in code (codixel) so the art is the project's own. Writes
// apps/app/src/game/packs/scenery/<name>.png and scenery.json ({file,w,h,k,light?,sway?,frames?}).
// node art/scenery/make.cjs [--sheet]  (--sheet also writes art/scenery/sheet.png to look at)
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "../../apps/app/src/game/packs/scenery");
const R = (hue, sat, l0, l1, n = 5, shift = 22) => P.hueRamp(n, { hue, sat, light: [l0, l1], shift });
const hash = (x, y, s = 1) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// ---- palettes per theme (stone ramp dark->light, accent colours)
const PAL = {
  cavern: { stone: R(268, 0.12, 0.08, 0.5), moss: R(150, 0.25, 0.12, 0.4, 4), glow: R(175, 0.8, 0.3, 0.85, 4), fire: R(28, 1, 0.35, 0.8, 4) },
  frost: { stone: R(208, 0.16, 0.12, 0.6), snow: R(205, 0.3, 0.7, 0.97, 3), ice: R(192, 0.6, 0.45, 0.92, 4), wood: R(25, 0.3, 0.1, 0.35, 4), pine: R(160, 0.3, 0.1, 0.36, 4) },
  shrine: { stone: R(330, 0.2, 0.08, 0.46), gold: R(44, 0.85, 0.3, 0.82, 4), cloth: R(352, 0.7, 0.18, 0.5, 4), wax: R(40, 0.4, 0.6, 0.92, 3), fire: R(36, 1, 0.45, 0.85, 4) },
  ruin: { stone: R(35, 0.06, 0.1, 0.55), moss: R(105, 0.35, 0.14, 0.42, 4), iron: R(220, 0.08, 0.1, 0.42, 4), rust: R(18, 0.5, 0.2, 0.42, 3), wood: R(28, 0.35, 0.12, 0.38, 4) },
  fungal: { stone: R(238, 0.25, 0.08, 0.42), glow: R(185, 0.9, 0.35, 0.9, 4), pink: R(305, 0.8, 0.35, 0.85, 4), moss: R(165, 0.4, 0.1, 0.36, 4), reed: R(95, 0.3, 0.14, 0.42, 4) },
  ember: { stone: R(355, 0.28, 0.06, 0.36), char: R(20, 0.12, 0.04, 0.24, 4), lava: R(22, 1, 0.38, 0.82, 4), ash: R(20, 0.05, 0.3, 0.6, 3) },
};
// ---- drawing on masks: a mask is the set of pixels of one part; paint() shades it lit from the top left
const mk = (w, h) => ({ w, h, m: new Uint8Array(w * h) });
const on = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h && M.m[y * M.w + x];
const set = (M, x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < M.w && y < M.h) M.m[y * M.w + x] = 1; };
const disc = (M, cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) set(M, x, y); };
const ell = (M, cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(M, x, y); };
const rect = (M, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(M, x + i, y + j); };
const tube = (M, ax, ay, bx, by, ra, rb = ra) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1; for (let k = 0; k <= n; k++) { const u = k / n; disc(M, ax + (bx - ax) * u, ay + (by - ay) * u, ra + (rb - ra) * u); } };
const poly = (M, pts) => { for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (P.inPoly(x + 0.5, y + 0.5, pts)) set(M, x, y); };
const paint = (b, M, ramp, o = {}) => { const n = ramp.length, out = o.outline ?? true;
  for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) { if (!on(M, x, y)) continue;
    const edge = !on(M, x - 1, y) || !on(M, x + 1, y) || !on(M, x, y - 1) || !on(M, x, y + 1);
    let v = o.flat ?? 0.45; if (!on(M, x - 1, y) || !on(M, x, y - 1)) v += 0.35; if (!on(M, x + 1, y) || !on(M, x, y + 1)) v -= 0.3;
    if (o.grad) v += o.grad(x, y); v += ((hash(x >> 1, y >> 1, o.seed || 3) - 0.5) * (o.noise ?? 0.18));
    const i = edge && out && (!on(M, x + 1, y) || !on(M, x, y + 1) || (!on(M, x - 1, y) && !on(M, x, y - 1) ? false : true)) && !(!on(M, x, y - 1) && on(M, x + 1, y) && on(M, x, y + 1)) ? 0 : Math.max(out ? 1 : 0, P.band(clamp(v), n, x, y, 0.2));
    b.pset(x + (o.dx || 0), y + (o.dy || 0), ramp[Math.min(n - 1, i)]); } };
const snowCap = (b, snow) => { const s = new P.Buf(b.w, b.h); s.px.set(b.px); for (let y = 1; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((b.px[y * b.w + x] >>> 24) && !(b.px[(y - 1) * b.w + x] >>> 24)) { s.pset(x, y, snow[2]); if (hash(x, y, 9) < 0.6 && y + 1 < b.h && (b.px[(y + 1) * b.w + x] >>> 24)) s.pset(x, y + 1, snow[1]); } return s; };
const silhouette = (b, col) => { const s = new P.Buf(b.w, b.h); b.px.forEach((c, i) => { if (c >>> 24) s.px[i] = P.col(col); }); return s; };
const rimTop = (b, col) => { const s = new P.Buf(b.w, b.h); s.px.set(b.px); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if ((b.px[y * b.w + x] >>> 24) && (y === 0 || !(b.px[(y - 1) * b.w + x] >>> 24))) s.pset(x, y, col); return s; };
const lerpCol = (a, b, t) => { const [r1, g1, b1] = P.unpack(P.col(a)), [r2, g2, b2] = P.unpack(P.col(b)); return P.rgb(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t); };

const PIECES = {};
const add = (name, buf, meta = {}) => { PIECES[name] = { buf, meta: { k: 3, ...meta } }; };

// ======== generic shapes, made per palette
const rockProp = (pal, w, h, seed) => { const b = new P.Buf(w, h), M = mk(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = (x + 0.5) / w * 2 - 1, ny = (y + 0.5) / h; const top = 0.25 + 0.5 * Math.abs(nx) ** 1.6 + 0.15 * hash(Math.floor(x / 3), 0, seed);
    if (ny > top && Math.abs(nx) < 0.98) set(M, x, y); }
  paint(b, M, pal.stone, { seed }); return b; };
const column = (pal, h, broken, seed) => { const w = 10, b = new P.Buf(w + 4, h), M = mk(w + 4, h);
  rect(M, 0, h - 3, w + 4, 3); rect(M, 1, 0, w + 2, 3);                                     // base and capital
  const top = broken ? 5 + Math.floor(hash(1, 1, seed) * h * 0.4) : 3; rect(M, 2, top, w, h - 3 - top);
  if (broken) { M.m.fill(0, 0, top * M.w); for (let x = 2; x < w + 2; x++) { const cut = top + Math.floor(hash(x, 2, seed) * 4); for (let y = top; y < cut; y++) M.m[y * M.w + x] = 0; } }
  paint(b, M, pal.stone, { seed, grad: (x) => (x % 3 === 0 ? -0.15 : 0) }); return b; };
const arch = (pal, seed) => { const w = 40, h = 46, b = new P.Buf(w, h), M = mk(w, h);
  rect(M, 0, 10, 8, h - 10); rect(M, w - 8, 10, 8, h - 10); for (let a = 0; a <= Math.PI; a += 0.01) for (let r = 12; r <= 20; r++) set(M, 20 + Math.cos(a) * r, 22 - Math.sin(a) * r);
  for (let x = 0; x < w; x++) for (let y = 0; y < 8; y++) if (hash(x, y, seed) < 0.12 * (8 - y) / 8 && x > 14 && x < 28) M.m[y * w + x] = 0;   // a few stones gone
  paint(b, M, pal.stone, { seed, grad: (x, y) => ((x + (y >> 2) * 3) % 8 === 0 || y % 5 === 0 ? -0.18 : 0) }); return b; };
const branchy = (ramp, w, h, seed, depth = 5, spread = 0.6) => { const b = new P.Buf(w, h), M = mk(w, h), rnd = P.rng(seed);
  const grow = (x, y, a, len, r, d) => { const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; tube(M, x, y, ex, ey, r, r * 0.7); if (d <= 0 || r < 0.6) return;
    const n = d > 3 ? 2 : 1 + (rnd() < 0.5 ? 1 : 0); for (let k = 0; k < n; k++) grow(ex, ey, a + (rnd() - 0.5) * 2 * spread + (k ? 0.25 : -0.25), len * (0.62 + rnd() * 0.15), r * 0.68, d - 1); };
  grow(w / 2, h - 1, -Math.PI / 2 + (rnd() - 0.5) * 0.2, h * 0.34, Math.max(1.6, w * 0.09), depth);
  paint(b, M, ramp, { seed, noise: 0.1 }); return b; };
const pine = (pal, w, h, seed) => { const b = new P.Buf(w, h), M = mk(w, h), T = mk(w, h);
  rect(T, w / 2 - 1, h - 7, 3, 7);
  for (let k = 0; k < 5; k++) { const y0 = 2 + k * (h - 9) / 5, hw = (k + 1.6) * w / 13; poly(M, [[w / 2, y0], [w / 2 - hw, y0 + (h - 9) / 4 + 4], [w / 2 + hw, y0 + (h - 9) / 4 + 4]]); }
  paint(b, T, pal.wood, { seed }); paint(b, M, pal.pine, { seed, noise: 0.25 }); return snowCap(b, pal.snow); };
const mushroom = (cap, stem, w, h, seed) => { const b = new P.Buf(w, h), S = mk(w, h), C = mk(w, h);
  rect(S, Math.floor(w / 2) - Math.max(1, Math.floor(w / 8)), Math.floor(h * 0.4), Math.max(2, Math.floor(w / 4)), h - Math.floor(h * 0.4));
  ell(C, w / 2, h * 0.38, w / 2 - 0.2, h * 0.32); for (let x = 0; x < w; x++) for (let y = Math.ceil(h * 0.48); y < h; y++) C.m[y * w + x] = 0;
  paint(b, S, stem, { seed }); paint(b, C, cap, { seed, noise: 0.1 });
  for (let k = 0; k < Math.max(2, w / 4); k++) { const x = Math.floor(1 + hash(k, 1, seed) * (w - 2)), y = Math.floor(h * 0.15 + hash(k, 2, seed) * h * 0.25); if (on(C, x, y)) b.pset(x, y, cap[cap.length - 1]); }
  return b; };
const crystal = (ramp, w, h, seed) => { const b = new P.Buf(w, h), rnd = P.rng(seed);
  for (let k = 0; k < 3; k++) { const M = mk(w, h), cx = w * (0.25 + 0.25 * k), ch = h * (k === 1 ? 1 : 0.55 + rnd() * 0.2), cw = w * 0.18, lean = (k - 1) * 1.5;
    poly(M, [[cx - cw + lean * 0.3, h], [cx - cw + lean, h - ch * 0.75], [cx + lean, h - ch], [cx + cw + lean, h - ch * 0.75], [cx + cw + lean * 0.3, h]]);
    paint(b, M, ramp, { seed: seed + k, noise: 0.05, grad: (x) => (x < cx + lean ? 0.2 : -0.1) }); }
  return b; };
const hangSpike = (ramp, w, len, seed) => { const b = new P.Buf(w, len), M = mk(w, len); poly(M, [[0, 0], [w, 0], [w / 2 + 0.4, len]]); paint(b, M, ramp, { seed, noise: 0.08 }); return b; };
const standSpike = (ramp, w, len, seed) => { const b = new P.Buf(w, len), M = mk(w, len); poly(M, [[0, len], [w, len], [w / 2 + 0.4, 0]]); paint(b, M, ramp, { seed, noise: 0.08 }); return b; };
const chain = (iron, len) => { const b = new P.Buf(3, len); for (let y = 0; y < len; y++) { if (y % 4 === 3) continue; const o = (y >> 2) % 2; b.pset(o ? 1 : 0, y, iron[1]); b.pset(o ? 1 : 2, y, iron[2]); if (y % 4 === 0) b.pset(1, y, iron[3]); } return b; };
const vines = (ramp, w, h, seed) => { const b = new P.Buf(w, h); for (let s = 0; s < Math.ceil(w / 3); s++) { const x0 = 1 + s * 3, L = Math.floor(h * (0.4 + 0.6 * hash(s, 0, seed)));
    for (let y = 0; y < L; y++) { const x = Math.round(x0 + Math.sin(y * 0.5 + s) * 0.8); b.pset(x, y, ramp[1 + ((y + s) % 3 === 0 ? 1 : 0)]); if (y % 4 === 2) b.pset(x + 1, y, ramp[2 + (hash(x, y, seed) < 0.4 ? 1 : 0)]); } } return b; };
const bannerArt = (cloth, gold, torn, seed) => { const w = 12, h = 26, b = new P.Buf(w + 2, h + 2), M = mk(w + 2, h + 2);
  rect(M, 1, 2, w, h - 4); for (let x = 1; x <= w; x++) { const cut = torn ? Math.floor(hash(x, 3, seed) * 7) : (Math.abs(x - w / 2 - 0.5) < 2 ? 0 : 0); for (let y = h - 2 - cut; y < h - 2; y++) M.m[y * M.w + x] = 0; }
  poly(M, [[1, h - 2], [1 + w / 2, h + 1], [1 + w, h - 2]]); if (torn) for (let k = 0; k < 4; k++) M.m[Math.floor(6 + hash(k, 5, seed) * 14) * M.w + 2 + Math.floor(hash(k, 6, seed) * 9)] = 0;
  paint(b, M, cloth, { seed, grad: (x) => (x % 4 === 0 ? -0.12 : 0) }); for (let x = 0; x < w + 2; x++) b.pset(x, 1, gold[1]), b.pset(x, 0, gold[2]);
  // the Crown: three points over a band
  for (const [x, y] of [[4, 9], [7, 7], [10, 9], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [4, 11], [10, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11]]) if (on(M, x, y)) b.pset(x, y, gold[2 + (y === 10 ? 1 : 0)]);
  return b; };
const candle = (wax, fire, h) => { const b = new P.Buf(3, h + 3); for (let y = 3; y < h + 3; y++) for (let x = 0; x < 3; x++) b.pset(x, y, wax[x === 0 ? 2 : x === 2 ? 0 : 1]); b.pset(1, 2, P.rgb(40, 30, 30)); b.pset(1, 1, fire[2]); b.pset(1, 0, fire[3]); return b; };
const candelabra = (gold, wax, fire) => { const b = new P.Buf(15, 20); for (let y = 8; y < 20; y++) b.pset(7, y, gold[y > 17 ? 1 : 2]); for (let x = 3; x <= 11; x++) b.pset(x, 9, gold[2]); for (let x = 5; x <= 9; x++) b.pset(x, 19, gold[1]);
  for (const x of [3, 7, 11]) { b.pset(x - 1, 8, gold[1]); b.pset(x + 1, 8, gold[1]); P.Buf.prototype.sprite.call(b, candle(wax, fire, x === 7 ? 6 : 4), x - 1, x === 7 ? -1 : 1); } return b; };
const bell = (gold, iron) => { const b = new P.Buf(12, 14), M = mk(12, 14); poly(M, [[3, 3], [9, 3], [11, 12], [1, 12]]); ell(M, 6, 3.5, 3, 2.5); rect(M, 0, 11, 12, 2); paint(b, M, gold, { seed: 4 }); b.pset(6, 13, iron[1]); b.pset(5, 0, iron[2]); b.pset(6, 0, iron[2]); return b; };
const cage = (iron) => { const b = new P.Buf(14, 20); for (let y = 2; y < 19; y++) for (const x of [0, 4, 9, 13]) b.pset(x, y, iron[x ? 2 : 1]); for (const y of [2, 10, 18]) for (let x = 0; x < 14; x++) b.pset(x, y, iron[y === 2 ? 3 : 1]); for (let x = 4; x <= 9; x++) b.pset(x, 1, iron[2]); b.pset(6, 0, iron[3]); b.pset(7, 0, iron[3]); return b; };
const grave = (pal, seed) => { const b = new P.Buf(12, 15), M = mk(12, 15); rect(M, 1, 4, 10, 11); ell(M, 6, 5, 5, 4); paint(b, M, pal.stone, { seed }); for (let x = 3; x < 9; x++) b.pset(x, 7 + (x % 2), pal.stone[1]); return b; };
const idol = (pal) => { const b = new P.Buf(20, 22), R0 = mk(20, 22), F = mk(20, 22);
  for (let k = 0; k < 5; k++) tube(R0, 10, 15, 1 + k * 4.5, 21, 1.4, 0.8); ell(F, 10, 9, 6, 8); paint(b, R0, pal.moss, { seed: 5 }); paint(b, F, pal.stone, { seed: 6 });
  for (const [x, y] of [[8, 8], [12, 8]]) b.pset(x, y, pal.glow[3]); for (let x = 8; x <= 12; x++) b.pset(x, 12, pal.stone[0]); return b; };
const reeds = (pal, seed) => { const b = new P.Buf(14, 20); for (let s = 0; s < 6; s++) { const x0 = 1 + s * 2.2, H = 10 + Math.floor(hash(s, 0, seed) * 9), lean = (hash(s, 1, seed) - 0.5) * 4;
  for (let y = 0; y < H; y++) b.pset(Math.round(x0 + lean * y / H), 19 - y, pal.reed[1 + (y > H - 3 ? 2 : y % 5 === 0 ? 1 : 0)]); if (s % 2) { b.pset(Math.round(x0 + lean), 19 - H, P.rgb(90, 60, 40)); b.pset(Math.round(x0 + lean), 20 - H, P.rgb(70, 46, 30)); } } return b; };
const torch = (iron, fire) => { const b = new P.Buf(7, 13); for (let y = 6; y < 13; y++) b.pset(3, y, iron[y > 10 ? 1 : 2]); b.pset(2, 6, iron[1]); b.pset(4, 6, iron[1]); for (let x = 1; x <= 5; x++) b.pset(x, 5, iron[2]);
  for (const [x, y, c] of [[3, 4, 3], [2, 4, 2], [4, 4, 2], [3, 3, 3], [2, 3, 1], [3, 2, 2], [4, 3, 1], [3, 1, 1], [3, 0, 0]]) b.pset(x, y, fire[c]); return b; };
const barred = (pal, iron) => { const b = new P.Buf(14, 18), M = mk(14, 18); rect(M, 0, 0, 14, 18); paint(b, M, pal.stone, { seed: 2 }); for (let y = 3; y < 16; y++) for (let x = 3; x < 11; x++) b.pset(x, y, P.rgb(10, 8, 14)); for (const x of [4, 7, 10]) for (let y = 3; y < 16; y++) b.pset(x, y, iron[2]); for (let x = 3; x < 11; x++) b.pset(x, 9, iron[1]); return b; };
const poster = () => { const b = new P.Buf(11, 14), pap = R(40, 0.35, 0.45, 0.82, 3); for (let y = 0; y < 14; y++) for (let x = 0; x < 11; x++) b.pset(x, y, pap[(x + y) % 7 === 0 ? 0 : x === 0 || y === 13 ? 1 : 2]);
  // a hooded face: the hero, wanted
  for (const [x, y] of [[4, 3], [5, 3], [6, 3], [3, 4], [7, 4], [3, 5], [7, 5], [3, 6], [7, 6], [4, 7], [5, 7], [6, 7]]) b.pset(x, y, P.rgb(50, 30, 30)); for (let y = 4; y < 7; y++) for (let x = 4; x < 7; x++) b.pset(x, y, P.rgb(30, 20, 22)); b.pset(4, 5, P.rgb(240, 200, 120)); b.pset(6, 5, P.rgb(240, 200, 120));
  for (let x = 2; x < 9; x++) b.pset(x, 10, P.rgb(110, 40, 30)); for (let x = 3; x < 8; x++) b.pset(x, 12, P.rgb(70, 50, 40)); return b; };
const stained = (pal) => { const w = 16, h = 28, b = new P.Buf(w, h), M = mk(w, h); rect(M, 0, 8, w, h - 8); ell(M, 8, 8.5, 8, 8.5); paint(b, M, pal.stone, { seed: 7 });
  const panes = [P.rgb(190, 40, 70), P.rgb(240, 170, 60), P.rgb(80, 60, 190), P.rgb(60, 160, 140)];
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) { if (!(((x + 0.5 - 8) / 5) ** 2 + ((y + 0.5 - 9) / 6) ** 2 <= 1 || y >= 9)) continue; b.pset(x, y, (x % 4 === 0 || y % 5 === 0) ? P.rgb(30, 20, 30) : panes[((x >> 2) + (y / 5 | 0)) % 4]); } return b; };
const painting = (pal) => { const b = new P.Buf(14, 17); for (let y = 0; y < 17; y++) for (let x = 0; x < 14; x++) b.pset(x, y, x < 1 || x > 12 || y < 1 || y > 15 ? pal.gold[(x + y) % 2 ? 1 : 2] : P.rgb(60, 26, 40));
  for (let a = 0; a < 6.3; a += 0.05) b.pset(Math.round(7 + Math.cos(a) * 4), Math.round(6 + Math.sin(a) * 4), pal.gold[3]);           // halo
  for (const [x, y] of [[5, 5], [6, 5], [7, 5], [8, 5], [4, 6], [9, 6], [4, 7], [9, 7], [5, 8], [8, 8], [4, 9], [9, 9], [3, 10], [10, 10], [3, 11], [10, 11], [3, 12], [10, 12], [3, 13], [10, 13]]) b.pset(x, y, P.rgb(140, 50, 50));
  for (let y = 6; y < 9; y++) for (let x = 5; x < 9; x++) b.pset(x, y, P.rgb(36, 20, 24)); b.pset(6, 7, pal.fire[2]); b.pset(8, 7, pal.fire[2]); for (let y = 10; y < 14; y++) for (let x = 4; x < 10; x++) b.pset(x, y, P.rgb(120, 40, 44)); return b; };
const censer = (gold, fire) => { const b = new P.Buf(9, 22); for (let y = 0; y < 13; y++) b.pset(4, y, gold[y % 3 ? 1 : 2]); const M = mk(9, 22); ell(M, 4.5, 17, 4.4, 3.5); rect(M, 1, 13, 7, 4); paint(b, M, gold, { seed: 3 }); b.pset(3, 13, fire[2]); b.pset(5, 13, fire[3]); return b; };
const rubble = (pal, seed) => { const b = new P.Buf(22, 9); for (let k = 0; k < 6; k++) { const M = mk(22, 9), r = 1.6 + hash(k, 0, seed) * 2.4; ell(M, 2 + k * 3.6, 9 - r * 0.8, r * 1.2, r); paint(b, M, pal.stone, { seed: seed + k }); } return b; };
const fallenStatue = (pal) => { const b = new P.Buf(34, 13), M = mk(34, 13); tube(M, 4, 9, 26, 7, 3.5, 3); ell(M, 29, 6, 4, 4); tube(M, 10, 8, 12, 2, 1.6); rect(M, 0, 10, 8, 3); paint(b, M, pal.stone, { seed: 8 }); b.pset(30, 5, pal.stone[0]); b.pset(28, 5, pal.stone[0]); return b; };
const cart = (pal) => { const b = new P.Buf(36, 20), M = mk(36, 20), W = mk(36, 20); rect(M, 2, 4, 32, 9); for (const x of [6, 13, 20, 27]) rect(M, x, 0, 2, 5); disc(W, 9, 15, 4.5); disc(W, 27, 15, 4.5); paint(b, M, pal.wood, { seed: 9 }); paint(b, W, pal.iron, { seed: 9 }); return b; };
const urn = (pal, ramp, seed) => { const b = new P.Buf(11, 14), M = mk(11, 14); ell(M, 5.5, 8.5, 5, 5.2); rect(M, 3, 1, 5, 4); rect(M, 2, 1, 7, 1); paint(b, M, ramp, { seed }); for (let x = 1; x < 10; x++) if (on(M, x, 8)) b.pset(x, 8, ramp[Math.max(1, ramp.length - 3)]); return b; };
const gateArt = (pal, glowCol, seed) => { const w = 34, h = 44, b = new P.Buf(w, h), M = mk(w, h); rect(M, 0, 12, 7, h - 12); rect(M, w - 7, 12, 7, h - 12); for (let a = 0; a <= Math.PI; a += 0.01) for (let r = 10; r <= 17; r++) set(M, 17 + Math.cos(a) * r, 17 - Math.sin(a) * r); rect(M, 0, h - 3, w, 3);
  paint(b, M, pal.stone, { seed, grad: (x, y) => ((x * 7 + y * 3) % 11 === 0 ? -0.2 : 0) }); for (let a = 0.3; a <= Math.PI - 0.3; a += 0.4) b.pset(Math.round(17 + Math.cos(a) * 13.5), Math.round(17 - Math.sin(a) * 13.5), glowCol); return b; };
const critter = (body, wing, kind) => [0, 1].map((f) => { const b = new P.Buf(11, 7);
  if (kind === "bat") { for (const [x, y] of [[5, 3], [5, 4], [4, 3], [6, 3]]) b.pset(x, y, body); for (let k = 1; k <= 4; k++) { const yy = f ? 3 - (k > 2 ? 1 : 0) : 3 + (k > 2 ? 1 : 0) - 2; b.pset(5 - k, yy + (f ? 0 : 1), wing); b.pset(5 + k, yy + (f ? 0 : 1), wing); } b.pset(4, 2, body); b.pset(6, 2, body); }
  else { for (const [x, y] of [[4, 3], [5, 3], [6, 3], [7, 3], [3, 3], [8, 2]]) b.pset(x, y, body); b.pset(9, 2, P.rgb(200, 150, 60)); for (let k = 0; k < 4; k++) b.pset(3 + k, f ? 1 + (k > 1 ? 1 : 0) : 4 + (k > 1 ? 0 : 1) - 0, wing); }
  return b; });
const hangMoss = (pal, w, h, seed) => vines(pal.moss, w, h, seed);
// a tileable rock fill: blocks or rough rock, value noise on a lattice that divides the tile
const fillTile = (pal, kind, seed) => { const S = 32, b = new P.Buf(S, S), st = pal.stone;
  const vn = (x, y, c) => { const gx = x / c, gy = y / c, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, n = S / c, h = (i, j) => hash(((i % n) + n) % n, ((j % n) + n) % n, seed);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (h(x0, y0) * (1 - sx) + h(x0 + 1, y0) * sx) * (1 - sy) + (h(x0, y0 + 1) * (1 - sx) + h(x0 + 1, y0 + 1) * sx) * sy; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let v = 0.5 * vn(x, y, 8) + 0.3 * vn(x, y, 4) + 0.2 * vn(x, y, 2);
    if (kind === "blocks") { const row = Math.floor(y / 8), bx = (x + (row % 2) * 8) % 16; if (y % 8 === 0 || bx === 0) v = 0; else if (y % 8 === 1 || bx === 1) v += 0.25; else if (y % 8 === 7 || bx === 15) v -= 0.2; }
    else { let d1 = 1e9, d2 = 1e9, k1 = 0; for (let k = 0; k < 7; k++) { const sx = hash(k, 0, seed) * S, sy = hash(k, 1, seed) * S;
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const d = Math.hypot(x + 0.5 - sx - ox, y + 0.5 - sy - oy); if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d; } }
      v = 0.35 + 0.3 * hash(k1, 2, seed) + 0.25 * (vn(x, y, 4) - 0.5); if (d2 - d1 < 1.1) v = 0; else if (d2 - d1 < 2.2) v -= 0.18; }
    b.pset(x, y, st[Math.min(2, P.band(clamp(v * 0.75), 3, x, y, 0.25))]); }
  return b; };

// ======== the pack
const THEME_KIND = { cavern: "blocks", ruin: "blocks", shrine: "blocks", frost: "rough", fungal: "rough", ember: "rough" };
for (const [t, pal] of Object.entries(PAL)) {
  add(`fill-${t}`, fillTile(pal, THEME_KIND[t], 11), { k: 3, tile: true });
  add(`rock-${t}`, rockProp(pal, 16, 9, 3), {}); add(`rockB-${t}`, rockProp(pal, 24, 12, 7), {});
  add(`rubble-${t}`, rubble(pal, 4), {});
  add(`urn-${t}`, urn(pal, pal.gold ?? pal.glow ?? pal.lava ?? pal.ice ?? pal.rust ?? pal.stone, 5), {});
  add(`gate-${t}`, gateArt(pal, (pal.glow ?? pal.gold ?? pal.lava ?? pal.ice ?? pal.moss)[3], 6), { k: 3.6 });
  // near silhouettes: drawn in front of the fighters, dark
  const dark = lerpCol(pal.stone[0], "#000000", 0.55);
  add(`fgRock-${t}`, silhouette(rockProp(pal, 30, 14, 21), dark), { k: 4.5, fg: true });
  add(`fgTuft-${t}`, silhouette(reeds({ reed: pal.moss ?? pal.stone }, 13), dark), { k: 4.5, fg: true, sway: true });
}
// cavern / Blackspire keep
{ const p = PAL.cavern, iron = PAL.ruin.iron;
  add("stalactite", hangSpike(p.stone, 6, 18, 1), { under: true }); add("stalactiteS", hangSpike(p.stone, 4, 10, 2), { under: true });
  add("stalagmite", standSpike(p.stone, 7, 14, 3), {}); add("crystal", crystal(p.glow, 12, 15, 4), { light: [0, -8, 70, "120,255,230"] });
  add("torch", torch(iron, p.fire), { wall: true, light: [0, -11, 120, "255,170,80"], flicker: true }); add("barred", barred(p, iron), { wall: true });
  add("poster", poster(), { wall: true }); add("hangMoss-cavern", hangMoss(p, 10, 14, 5), { under: true, sway: true });
  add("portcullis", (() => { const b = new P.Buf(26, 32); for (let x = 1; x < 26; x += 4) for (let y = 0; y < 32; y++) b.pset(x, y, iron[1 + (y % 6 === 0 ? 1 : 0)]); for (let y = 2; y < 32; y += 7) for (let x = 0; x < 26; x++) b.pset(x, y, iron[2]); for (let x = 1; x < 26; x += 4) b.pset(x, 31, iron[3]); return b; })(), { wall: true });
  add("rooftops", silhouette((() => { const b = new P.Buf(120, 50), M = mk(120, 50); let x = 0; while (x < 120) { const w = 10 + Math.floor(hash(x, 0, 3) * 14), h = 16 + Math.floor(hash(x, 1, 3) * 26); rect(M, x, 50 - h, w, h); poly(M, [[x - 1, 50 - h], [x + w / 2, 50 - h - 8], [x + w + 1, 50 - h]]); if (hash(x, 2, 3) < 0.5) rect(M, x + 2, 50 - h - 12, 2, 6); x += w; } paint(b, M, p.stone, {}); return b; })(), "#2a2236"), { k: 6, far: 0.25 }); }
// frost
{ const p = PAL.frost;
  add("icicle", hangSpike(p.ice, 3, 11, 1), { under: true, drip: true }); add("icicleL", hangSpike(p.ice, 5, 18, 2), { under: true, drip: true });
  add("pine", pine(p, 22, 42, 3), {}); add("pineS", pine(p, 14, 26, 4), {}); add("snowRock", snowCap(rockProp(p, 18, 10, 5), p.snow), {});
  add("bell", bell(PAL.shrine.gold, PAL.ruin.iron), { under: true, sway: true });
  add("belltower", silhouette((() => { const b = new P.Buf(30, 80), M = mk(30, 80); rect(M, 5, 20, 20, 60); poly(M, [[3, 22], [15, 0], [27, 22]]); return (paint(b, M, p.stone, {}), b); })(), "#3c5062"), { k: 5, far: 0.3 });
  add("frozenHost", (() => { const b = new P.Buf(90, 34); for (let k = 0; k < 9; k++) { const x = 4 + k * 10, M = mk(90, 34); ell(M, x, 12, 2.2, 2.4); rect(M, x - 2, 14, 5, 11); tube(M, x - 1, 25, x - 3, 33, 1.2); tube(M, x + 1, 25, x + 3, 33, 1.2); tube(M, x + 2, 16, x + 7, 8 + (k % 2) * 3, 0.9); tube(M, x + 7, 8 + (k % 2) * 3, x + 9, 1 + (k % 3), 0.6); paint(b, M, R(205, 0.2, 0.25, 0.55, 4), { seed: k }); }
    for (let i = 0; i < b.px.length; i++) { const x = i % 90, y = i / 90 | 0; b.px[i] = (b.px[i] >>> 24) ? lerpCol(b.px[i], p.ice[2], 0.4) : (Math.abs((x * 0.6 + y) % 23 - 11) < 0.5 ? p.ice[3] : y === 0 ? p.snow[1] : p.ice[1]); } return b; })(), { k: 4, far: 0.5, alpha: 0.6 }); }
// shrine
{ const p = PAL.shrine;
  add("candles", (() => { const b = new P.Buf(11, 11); [[0, 5], [4, 7], [8, 4]].forEach(([x, h]) => b.sprite(candle(p.wax, p.fire, h), x, 11 - h - 3)); return b; })(), { light: [0, -10, 80, "255,190,110"], flicker: true });
  add("candlesLean", (() => { const b = new P.Buf(13, 11); [[0, 5], [4, 7], [9, 4]].forEach(([x, h]) => b.sprite(candle(p.wax, p.fire, h), x, 11 - h - 3)); const o = new P.Buf(13, 11); for (let y = 0; y < 11; y++) for (let x = 0; x < 13; x++) { const sx = x - Math.round((10 - y) * 0.25); if (sx >= 0 && sx < 13) o.px[y * 13 + x] = b.px[y * 13 + sx]; } return o; })(), { light: [2, -8, 80, "255,190,110"], flicker: true });
  add("candelabra", candelabra(p.gold, p.wax, p.fire), { light: [0, -18, 110, "255,190,110"], flicker: true });
  add("banner", bannerArt(p.cloth, p.gold, false, 1), { wall: true, sway: true }); add("bannerTorn", bannerArt(p.cloth, p.gold, true, 2), { wall: true, sway: true });
  add("stained", stained(p), { wall: true, shaft: "230,120,160" }); add("painting", painting(p), { wall: true }); add("censer", censer(p.gold, p.fire), { under: true, sway: true, light: [0, 17, 60, "255,170,90"], smoke: true }); }
// ruin
{ const p = PAL.ruin;
  add("column", column(p, 40, false, 1), {}); add("columnBroken", column(p, 40, true, 2), {}); add("columnStub", column(p, 18, true, 3), {});
  add("arch", arch(p, 4), { k: 3.4 }); add("fallenStatue", fallenStatue(p), {}); add("ivy", vines(p.moss, 12, 22, 5), { under: true, sway: true });
  add("chain", chain(p.iron, 28), { under: true, sway: true }); add("cage", (() => { const b = new P.Buf(14, 34); b.sprite(chain(p.iron, 14), 5, 0); b.sprite(cage(p.iron), 0, 14); return b; })(), { under: true, sway: true });
  add("cart", silhouette(cart(p), "#232026"), { k: 4, far: 0.55, alpha: 0.85 }); add("names", (() => { const b = new P.Buf(20, 14), M = mk(20, 14); rect(M, 0, 0, 20, 14); paint(b, M, p.stone, { seed: 3 }); for (let r = 0; r < 4; r++) for (let x = 2; x < 18; x++) if (hash(x, r, 8) < 0.6) b.pset(x, 2 + r * 3, p.stone[0]); return b; })(), { wall: true }); }
// fungal
{ const p = PAL.fungal, stem = R(220, 0.15, 0.4, 0.75, 4);
  add("shroomL", mushroom(p.glow, stem, 18, 20, 1), { light: [0, -12, 110, "90,230,255"] }); add("shroomM", mushroom(p.pink, stem, 12, 13, 2), { light: [0, -8, 70, "255,110,230"] });
  add("shroomS", (() => { const b = new P.Buf(14, 8); [[0, 6], [5, 8], [10, 5]].forEach(([x, s], k) => b.sprite(mushroom(k % 2 ? p.pink : p.glow, stem, s - 1, s, 3 + k), x, 8 - s)); return b; })(), { light: [0, -4, 50, "120,220,255"] });
  add("reeds", reeds(p, 7), { sway: true }); add("reedsB", reeds(p, 11), { sway: true }); add("grave", grave(p, 2), {}); add("idol", idol(p), { light: [0, -12, 50, "120,240,255"] });
  add("hangMoss-fungal", hangMoss(p, 12, 16, 9), { under: true, sway: true }); add("glowVine", vines(p.glow, 9, 18, 3), { under: true, sway: true, light: [0, 8, 50, "90,230,255"] });
  add("drownedTowers", silhouette((() => { const b = new P.Buf(140, 70), M = mk(140, 70); for (let k = 0; k < 6; k++) { const x = 6 + k * 23, w = 10 + (k % 3) * 3, h = 30 + Math.floor(hash(k, 0, 6) * 36); rect(M, x, 70 - h, w, h); poly(M, [[x - 1, 70 - h], [x + w / 2, 70 - h - 10], [x + w + 1, 70 - h]]); } return (paint(b, M, p.stone, {}), b); })(), "#22306a"), { k: 6, far: 0.2 }); }
// ember
{ const p = PAL.ember;
  add("charTree", branchy(p.char, 34, 46, 1, 5, 0.6), {}); add("charTreeS", branchy(p.char, 22, 30, 2, 4, 0.7), {}); add("stump", (() => { const b = new P.Buf(12, 8), M = mk(12, 8); rect(M, 2, 2, 8, 6); rect(M, 0, 6, 12, 2); paint(b, M, p.char, { seed: 3 }); b.pset(5, 2, p.lava[1]); b.pset(6, 3, p.lava[2]); return b; })(), { light: [0, -4, 40, "255,120,50"] });
  add("emberRock", (() => { const b = rockProp(p, 18, 10, 6); for (let k = 0; k < 6; k++) { const x = 3 + Math.floor(hash(k, 0, 2) * 12), y = 4 + Math.floor(hash(k, 1, 2) * 5); if (b.px[y * b.w + x] >>> 24) b.pset(x, y, p.lava[1 + (k % 2)]); } return b; })(), { light: [0, -4, 45, "255,110,40"] });
  add("basalt", silhouette((() => { const b = new P.Buf(80, 70), M = mk(80, 70); for (let k = 0; k < 9; k++) rect(M, k * 9, 70 - (24 + Math.floor(hash(k, 0, 5) * 44)), 8, 70); return (paint(b, M, p.stone, {}), b); })(), "#4a1620"), { k: 6, far: 0.3 });
  add("spires", silhouette((() => { const b = new P.Buf(110, 80), M = mk(110, 80); for (let k = 0; k < 5; k++) { const x = 10 + k * 22, h = 40 + Math.floor(hash(k, 3, 5) * 38); poly(M, [[x - 9, 80], [x - 2, 80 - h], [x + 1, 80 - h - 4], [x + 9, 80]]); } return (paint(b, M, p.stone, {}), b); })(), "#3a1018"), { k: 6, far: 0.18 }); }
// critters (two frames side by side)
for (const [name, c] of Object.entries({ bat: critter(P.rgb(30, 22, 36), P.rgb(56, 44, 70), "bat"), crow: critter(P.rgb(20, 20, 26), P.rgb(44, 44, 54), "crow") })) { const b = new P.Buf(22, 7); b.sprite(c[0], 0, 0); b.sprite(c[1], 11, 0); add(name, b, { frames: 2 }); }

// ---- write
fs.mkdirSync(OUT, { recursive: true });
const json = {};
// Everything but the fill tiles goes on one atlas (one request, one decode); a tile stays a file of its own, since it is
// drawn as a repeating pattern. Shelves of pieces sorted tallest first, a pixel apart so no edge bleeds into the next.
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
const packed = Object.entries(PIECES).filter(([, p]) => !p.meta.tile).sort((a, b) => b[1].buf.h - a[1].buf.h), AW = 512;
let x = 0, y = 0, row = 0; const at = {};
for (const [name, { buf }] of packed) { if (x + buf.w > AW) { x = 0; y += row + 1; row = 0; } at[name] = [x, y]; x += buf.w + 1; row = Math.max(row, buf.h); }
const atlas = new P.Buf(AW, y + row);
for (const [name, { buf, meta }] of packed) { atlas.sprite(buf, at[name][0], at[name][1]); json[name] = { file: "scenery/atlas.png", x: at[name][0], y: at[name][1], w: buf.w, h: buf.h, ...meta }; }
P.save(atlas, path.join(OUT, "atlas.png"));
for (const [name, { buf, meta }] of Object.entries(PIECES)) if (meta.tile) { P.save(buf, path.join(OUT, `${name}.png`)); json[name] = { file: `scenery/${name}.png`, w: buf.w, h: buf.h, ...meta }; }
fs.writeFileSync(path.join(OUT, "scenery.json"), JSON.stringify(json, null, 1) + "\n");
console.log(Object.keys(json).length, "pieces");
if (process.argv.includes("--sheet")) { const items = Object.entries(PIECES).map(([n, { buf }]) => { const g = new P.Buf(buf.w, buf.h); g.rect(0, 0, buf.w, buf.h, P.rgb(40, 36, 48)); g.sprite(buf, 0, 0); return { buf: g, label: n, scale: buf.w > 60 ? 2 : 3 }; }); P.save(P.sheet(items, { cols: 8 }), path.join(__dirname, "sheet.png")); }

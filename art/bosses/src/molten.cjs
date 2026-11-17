// Molten Eye (Fire final boss): core body, rune ring, shards, halo, lava tail, claws. Drawn from shapes; state in, buffer out.
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
const rock = P.hueRamp(5, { hue: 8, sat: 0.42, light: [0.05, 0.34], shift: 24 });
const lava = [P.col(P.hsl(355, 0.85, 0.28)), P.col(P.hsl(8, 0.95, 0.42)), P.col(P.hsl(22, 1, 0.52)), P.col(P.hsl(38, 1, 0.6)), P.col(P.hsl(50, 1, 0.76)), P.col(P.hsl(55, 1, 0.92))];
const stone = P.hueRamp(5, { hue: 22, sat: 0.16, light: [0.12, 0.56], shift: 18 });
const clawRock = P.hueRamp(5, { hue: 6, sat: 0.4, light: [0.05, 0.27], shift: 16 });
const bone = P.hueRamp(4, { hue: 38, sat: 0.45, light: [0.3, 0.86], shift: 20 });
const PUPIL = P.col(P.hsl(350, 0.6, 0.04));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lavaAt = (v, x, y) => lava[P.band(clamp(v), lava.length, x, y, 0.22)];

// ---- body: cracked rock egg tapering into a lava tail, plates lit from the top left and from the lava below
const SEEDS = (() => { const r = P.rng(7), s = []; for (let i = 0; i < 34; i++) s.push([r() * 90 - 45, r() * 130 - 52]); return s; })();
const body = (b, cx, cy, st = {}) => {
  const R = 38, glow = st.glow ?? 0.6, crack = st.crack ?? 0, t = st.t ?? 0;
  const half = (y) => y <= 0 ? Math.sqrt(Math.max(0, R * R - y * y)) * (1 + 0.02 * Math.sin(y)) : y < 70 ? R * Math.pow(1 - y / 70, 1.25) : 0;
  const inB = (x, y) => Math.abs(x) <= half(y) + 0.3 * Math.sin(y * 0.7 + x * 0.3) && y > -R;
  for (let y = -R - 1; y < 72; y++) for (let x = -R - 1; x <= R + 1; x++) {
    if (!inB(x, y)) continue; const X = cx + x, Y = cy + y;
    let d1 = 1e9, d2 = 1e9, k1 = 0; SEEDS.forEach(([sx, sy], k) => { const d = Math.hypot(x - sx, (y - sy) * 0.9); if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d; });
    const edge = !inB(x - 1, y) || !inB(x + 1, y) || !inB(x, y - 1) || !inB(x, y + 1), gap = d2 - d1, seam = Math.abs(x) < 1.2 && y > -R + 4;
    const nx = x / R, ny = clamp(y / R, -1, 1), lit = clamp(0.45 - 0.4 * nx - 0.45 * ny + (hash(k1, 0, 3) - 0.5) * 0.3 - (gap < 3.2 ? 0.25 : 0));
    const under = clamp((y - 10) / 50) * 0.5;                                   // red light from the lava below
    if (edge) { b.pset(X, Y, rock[0]); continue; }
    if (gap < 1.15 + Math.min(1.2, crack) * 0.9 || seam) { const pulse = glow + 0.25 * Math.sin(t * 6.28 + k1) * 0.5; b.pset(X, Y, lavaAt(Math.min(0.68 + 0.1 * Math.min(1, crack), pulse - (seam ? -0.1 : 0.08) + hash(X, Y, 2) * 0.12), X, Y)); continue; }
    let c = rock[P.band(lit, 5, X, Y, 0.2)]; const rim = !inB(x - 2, y) || !inB(x + 2, y) || !inB(x, y + 2); if (rim && y > 8) c = under > 0.3 ? lava[1] : lava[0];
    b.pset(X, Y, c);
  }
};
// ---- horns: crescents curving up and in
const horns = (b, cx, cy, st = {}) => { for (const s of [-1, 1]) {
  const p0 = [cx + s * 26, cy - 22], p1 = [cx + s * 44, cy - 52], p2 = [cx + s * 22, cy - 66];
  for (let i = 0; i <= 60; i++) { const u = i / 60, x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1], r = 5.5 * (1 - u) + 0.6;
    for (let j = -Math.ceil(r); j <= r; j++) for (let k = -Math.ceil(r); k <= r; k++) { if (j * j + k * k > r * r) continue;
      const lit = clamp(0.5 - 0.6 * (k / r) * s * -1 - 0.4 * (j / r)), X = Math.round(x + k), Y = Math.round(y + j);
      b.pset(X, Y, j * j + k * k > (r - 1) ** 2 ? rock[0] : u > 0.75 ? bone[P.band(lit, 4, X, Y, 0.2)] : rock[1 + P.band(lit, 4, X, Y, 0.2)]); } } } };
// ---- eye: socket rim, molten sclera, red veined iris ring, slit pupil
const eye = (b, cx, cy, st = {}) => { const ex = cx + (st.look || 0) * 4, ey = cy - 8, rx = 17, ry = 14, open = st.open ?? 1, slit = st.slit ?? 1, t = st.t ?? 0;
  for (let y = -ry - 4; y <= ry + 4; y++) for (let x = -rx - 4; x <= rx + 4; x++) { const d = Math.hypot(x / (rx + 3.5), y / (ry + 3.5)); if (d <= 1) b.pset(cx + x, ey + y, d > 0.86 ? rock[0] : rock[1]); }
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const yy = y / Math.max(0.08, open), d = Math.hypot(x / rx, yy / ry); if (d > 1 || Math.abs(y) > ry * open + 0.5) continue;
    const X = cx + x, Y = ey + y, px = x - (st.look || 0) * 4, pd = Math.hypot(px / (rx * 0.62), yy / (ry * 0.95));
    let c = lavaAt(1.02 - d * 0.85 + 0.06 * Math.sin(t * 6.28 + x), X, Y);
    if (pd > 0.9 && pd < 1.02) c = lava[1];                                                         // iris ring
    if (Math.abs(px) < 1.6 * slit * (1 - Math.abs(yy) / (ry * 1.05)) + 0.4 && Math.abs(yy) < ry * 0.88) c = PUPIL;   // slit
    if (d > 0.93) c = lava[0];
    b.pset(X, Y, c); }
  if (open < 0.98) for (let x = -rx; x <= rx; x++) { const h = Math.round(ry * open * Math.sqrt(1 - (x / rx) ** 2)); b.pset(cx + x, ey - h - 1, rock[0]); b.pset(cx + x, ey + h + 1, rock[0]); }
  if (open > 0.5) { b.pset(cx - 6 + Math.round(st.look || 0) * 4, ey - 7, lava[5]); b.pset(cx - 5 + Math.round(st.look || 0) * 4, ey - 7, lava[5]); } };
// ---- rune ring: tilted stone band; draw back half before the body, front half after
const RUNES = [["ooo", "o.o", "ooo", "o..", "o.."], ["o.o", "ooo", "..o", "..o", "ooo"], ["oo.", ".o.", ".oo", ".o.", "oo."], ["o..", "ooo", "o.o", "ooo", "..o"], [".o.", "ooo", ".o.", "o.o", "o.o"]];
const ring = (b, cx, cy, st = {}, front) => { const RX = st.rx ?? 68, RY = st.ry ?? 17, Hh = 12, ph = st.phase || 0, tilt = st.tilt ?? -0.12, glow = st.ringGlow ?? 0.5, N = 20, cyR = cy + (st.ringY ?? 4);
  const pts = []; for (let i = 0; i < 900; i++) { const th = (i / 900) * 2 * Math.PI, s = Math.sin(th); if ((s > 0) !== front) continue;
    const x = RX * Math.cos(th), y = RY * s + tilt * x; pts.push({ th, x: cx + x, y: cyR + y, s }); }
  for (const p of pts) { const blk = ((p.th + ph) / (2 * Math.PI)) * N, fr = blk - Math.floor(blk), X = Math.round(p.x);
    for (let j = 0; j < Hh; j++) { const Y = Math.round(p.y - Hh / 2 + j); let c = stone[j === 1 ? 4 : j < 4 ? 3 : j < Hh - 3 ? 2 : 1];
      if (j === 0 || j === Hh - 1) c = stone[0]; if (fr < 0.035) c = stone[0]; if (fr > 0.035 && fr < 0.07 && j > 0 && j < Hh - 1) c = stone[3];
      if (!front) c = stone[Math.max(0, stone.indexOf(c) - 1)];
      b.pset(X, Y, c); } }
  if (!front) return;
  for (let k = 0; k < N; k++) { const th = ((k + 0.5) / N) * 2 * Math.PI - ph; const s = Math.sin(th); if (s < 0.25) continue;
    const x = RX * Math.cos(th), X = Math.round(cx + x), Y = Math.round(cyR + RY * s + tilt * x - 3), sq = Math.abs(s);
    RUNES[k % RUNES.length].forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "o" || (sq < 0.6 && i === 2)) return; b.pset(X - 1 + Math.round(i * sq), Y + j, lava[glow > 0.75 ? 4 : glow > 0.35 ? 3 : 2]); })); } };
// ---- shards: rock diamonds orbiting in depth
const SH = [[0, 78, 22, 1], [0.8, 70, -30, 0.8], [1.6, 84, 8, 1.1], [2.4, 74, -12, 0.9], [3.3, 80, 30, 1], [4.1, 72, -26, 0.85], [4.9, 86, 0, 1.15], [5.6, 76, 16, 0.9]];
const shard = (b, x, y, sz, lit) => { const h = Math.round(6 * sz), w = Math.round(3 * sz);
  for (let j = -h; j <= h; j++) { const ww = Math.round(w * (1 - Math.abs(j) / (h + 1))); for (let i = -ww; i <= ww; i++) {
    const edge = Math.abs(i) === ww || Math.abs(j) === h; b.pset(Math.round(x + i), Math.round(y + j), edge ? (i > 0 && j > 0 ? lava[1] : rock[0]) : i < 0 ? rock[lit ? 3 : 2] : rock[1]); } } };
const shards = (b, cx, cy, st = {}, front) => { const a0 = st.shardA || 0, sp = st.spread ?? 1;
  SH.forEach(([a, r, dy, sz], k) => { const th = a + a0, s = Math.sin(th); if ((s > 0) !== front) return;
    shard(b, cx + Math.cos(th) * r * sp, cy + dy * 0.8 + s * 10 + Math.sin((st.t || 0) * 6.28 + k) * 2, sz * (front ? 1.7 : 1.3), front); }); };
// ---- halo and lava tail
const halo = (b, cx, cy, st = {}) => { const k = st.halo ?? 1; if (k <= 0) return; const RX = 34 * k, RY = 7 * k, y0 = cy - 78;
  for (let i = 0; i < 600; i++) { const th = (i / 600) * 2 * Math.PI, x = Math.round(cx + RX * Math.cos(th)), y = Math.round(y0 + RY * Math.sin(th));
    b.pset(x, y, lava[Math.sin(th) > 0 ? 4 : 3]); b.pset(x, y + 1, lava[2]); if (Math.sin(th) > 0.3) b.pset(x, y - 1, lava[5]); } };
const tail = (b, cx, cy, st = {}) => { const t = st.t || 0, len = st.tail ?? 22;
  for (let y = 0; y < len; y++) { const w = y < 4 ? 1 : 0; for (let x = -w; x <= w; x++) b.pset(cx + x + Math.round(Math.sin(y * 0.4 + t * 6.28) * 0.6), cy + 68 + y, lava[y < len * 0.5 ? 4 : 2]); }
  for (let k = 0; k < 3; k++) { const ph = (t + k / 3) % 1, y = cy + 68 + len + ph * 18; b.pset(cx, Math.round(y), lava[3]); b.pset(cx, Math.round(y) + 1, lava[1]); } };
// ---- the whole core in a 192x192 frame
const CORE = 192, CX = 96, CY = 98;
const core = (st = {}) => { const b = new P.Buf(CORE, CORE), cx = CX + (st.dx || 0), cy = CY + (st.dy || 0);
  if (st.ring !== false) ring(b, cx, cy, st, false); if (st.shards !== false) shards(b, cx, cy, st, false);
  halo(b, cx, cy, st); horns(b, cx, cy, st); body(b, cx, cy, st); eye(b, cx, cy, st); if (st.tail !== false) tail(b, cx, cy, st);
  if (st.ring !== false) ring(b, cx, cy, st, true); if (st.shards !== false) shards(b, cx, cy, st, true);
  return b; };
// ---- claw: wrist cuff, rock palm, three fingers and a thumb ending in bone talons; open 0..1 (1 spread, 0 fist). Left hand, reaching down-right.
const CLAW = 96;
const claw = (st = {}) => { const b = new P.Buf(CLAW, CLAW), open = st.open ?? 1, glow = st.glow ?? 0.6, Z = 1.3;
  // a part is the union of discs, filled as one solid with one outline, lit from the top left
  const part = (discs, ramp, lift = -0.05) => { const m = new Map(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y, r] of discs) { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r);
      for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) { if (i * i + j * j > r * r) continue; const X = Math.round(x + i), Y = Math.round(y + j), k = X + "," + Y;
        const l = clamp(0.5 + lift - 0.4 * i / r - 0.45 * j / r); if (!m.has(k) || m.get(k) < l) m.set(k, l); } }
    for (const [k, l] of m) { const [X, Y] = k.split(",").map(Number), edge = !m.has((X - 1) + "," + Y) || !m.has((X + 1) + "," + Y) || !m.has(X + "," + (Y - 1)) || !m.has(X + "," + (Y + 1));
      b.pset(X, Y, edge ? ramp[0] : ramp[1 + P.band(l, ramp.length - 1, X, Y, 0.2)]); } };
  const tube = (ax, ay, bx, by, ra, rb) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2), o = []; for (let k = 0; k <= n; k++) { const u = k / n; o.push([(ax + (bx - ax) * u) * Z, (ay + (by - ay) * u) * Z, (ra + (rb - ra) * u) * Z]); } return o; };
  const talon = (x, y, ang, len) => { const o = []; for (let k = 0; k <= len * 3; k++) { const u = k / (len * 3), a = ang + u * 1.0; o.push([(x + Math.cos(a) * len * u * 1.05) * Z, (y + Math.sin(a) * len * u) * Z, (2.8 * (1 - u) + 0.45) * Z]); } part(o, bone, 0.1); };
  part(tube(12, 8, 24, 20, 10, 10), clawRock, -0.05);                               // wrist cuff
  for (let k = -8; k <= 8; k++) { const X = Math.round((19 + k * 0.7) * Z), Y = Math.round((13 - k * 0.7) * Z); for (const d of [0, 1]) b.pset(X + d, Y, lavaAt(glow + 0.3 - d * 0.2, X, Y)); }
  part(tube(30, 28, 32, 30, 12.5, 12), clawRock, 0);                          // palm
  for (const [x, y] of [[27, 22], [28, 23], [35, 28], [36, 29], [26, 32]]) b.pset(Math.round(x * Z), Math.round(y * Z), lavaAt(glow + 0.1, x, y));
  const ta = -0.6 - (1 - open) * 0.6, tx = 22 + Math.cos(ta + 1.9) * 12, ty = 32 + Math.sin(ta + 1.9) * 12;   // thumb, behind the fingers
  part(tube(22, 32, tx, ty, 4.8, 3.8), clawRock, -0.05); talon(tx, ty, ta + 2.3, 10);
  [[-0.5, 25], [0.25, 27], [1.0, 25]].forEach(([a0, L], k) => { const a = a0 + 0.6 + (1 - open) * 0.7, bx = 32 + Math.cos(a) * 9, by = 30 + Math.sin(a) * 9,
      mx = bx + Math.cos(a) * L * 0.45, my = by + Math.sin(a) * L * 0.45, a2 = a + (1 - open) * 0.9 + 0.25, tx2 = mx + Math.cos(a2) * L * 0.35, ty2 = my + Math.sin(a2) * L * 0.35;
    part([...tube(bx, by, mx, my, 5.2, 4.4), ...tube(mx, my, tx2, ty2, 4.4, 3.6)], clawRock, 0);
    for (const d of [-1, 0, 1]) b.pset(Math.round(mx * Z + d * Math.sin(a)), Math.round(my * Z - d * Math.cos(a)), lavaAt(glow + 0.25 - Math.abs(d) * 0.2, mx, my));   // knuckle crack
    talon(tx2, ty2, a2 + 0.15, 12); });
  return b; };
const mirror = (b) => { const o = new P.Buf(b.w, b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o.px[y * b.w + (b.w - 1 - x)] = b.px[y * b.w + x]; return o; };
module.exports = { ring, core, claw, mirror, rock, lava, stone, bone, CORE, CX, CY, CLAW, lavaAt, hash, shard };
if (require.main === module) {
  const c = core({ t: 0 }), L = claw(), Rr = mirror(claw({ open: 0.6 }));
  const scene = new P.Buf(320, 200); scene.rect(0, 0, 320, 200, P.rgb(40, 14, 12));
  const A = require("./anim.cjs"); A.over(scene, c, 64, 0); A.over(scene, L, -4, 80); A.over(scene, Rr, 228, 80);
  const hero = P.crop(P.load("../../apps/app/src/game/seeker/Ember/Seeker_Ember_Idle_30x30_24f.png"), 0, 0, 30, 30); A.over(scene, hero, 140, 168);
  P.save(scene, "work/molten-scene.png");
  P.save(P.sheet([{ buf: scene, label: "boss + claws + hero (2x)", scale: 3 }]), "work/molten-view.png");
}

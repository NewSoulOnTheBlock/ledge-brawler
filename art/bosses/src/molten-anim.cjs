// Molten Eye: 30 animations. Core 192x192 (centre 96,98), claws 128x128, effects on their own frames.
const A = require("./anim.cjs"), P = A.P, M = require("./molten.cjs");
const { core, claw, mirror, lava, rock, stone, bone, CX, CY, lavaAt, hash, shard } = M;
const TAU = 2 * Math.PI, N = 20, BLK = TAU / N, E = A.E, lerp = A.lerp, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const range = (n, f) => [...Array(n)].map((_, i) => f(i, i / n, n > 1 ? i / (n - 1) : 1));
const flash = (b, k = 1) => A.tint(b, [255, 240, 205], k);
const SMOKE = P.hueRamp(3, { hue: 15, sat: 0.12, light: [0.12, 0.3] });
// ---- effect helpers (all draw into b)
const dot = (b, x, y, c, r = 0) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r) b.pset(Math.round(x + i), Math.round(y + j), c); };
const ember = (b, x, y, v, big) => { dot(b, x, y, lavaAt(v, x, y), big ? 1 : 0); };
const wave = (b, cx, cy, rx, ry, v) => { for (let i = 0; i < 700; i++) { const th = i / 700 * TAU; b.pset(Math.round(cx + rx * Math.cos(th)), Math.round(cy + ry * Math.sin(th)), lava[clamp(Math.round(v * 5), 0, 5)]); } };
const surface = (b, y, t) => { for (let x = 0; x < b.w; x++) { const yy = y + Math.round(Math.sin(x * 0.15 + t * TAU) * 1.2);
  for (let k = yy; k < b.h; k++) b.pset(x, k, k === yy ? lava[4] : k < yy + 2 ? lava[3] : lava[k < yy + 5 ? 2 : 1]); } };
const clipBelow = (b, y) => { for (let k = Math.max(0, y); k < b.h; k++) for (let x = 0; x < b.w; x++) b.px[k * b.w + x] = 0; return b; };
const splash = (b, cx, y, t, n = 10, spd = 1) => { for (let k = 0; k < n; k++) { const a = Math.PI * (1.1 + 0.8 * k / (n - 1)), s = (2.2 + hash(k, 1, 3) * 1.5) * spd;
  const x = cx + Math.cos(a) * s * t * 3 + (k - n / 2) * 3, yy = y + Math.sin(a) * s * t * 3 + 0.5 * t * t; if (yy < y) ember(b, x, yy, 0.8 - t * 0.08, t < 3); } };
const smoke = (b, x, y, t, k) => { const r = 1 + t * 0.6; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= r * r && hash(i + k, j, Math.floor(t)) < 0.8 - t * 0.08) b.pset(Math.round(x + i), Math.round(y + j - t * 3), SMOKE[(i + j + 6) % 3]); };
const shake = (i, amp) => [Math.round(Math.sin(i * 2.7) * amp), Math.round(Math.cos(i * 3.9) * amp * 0.6)];
const EYE = [CX, CY - 8];

// ---- shared idle state: ring turns 5 blocks per 16-frame loop (runes repeat every 5), cracks pulse, shards sway
const base = (u, o = {}) => ({ t: u, phase: u * 5 * BLK, shardA: 0.12 * Math.sin(u * TAU), dy: Math.round(Math.sin(u * TAU) * 2), glow: 0.6 + 0.1 * Math.sin(u * TAU), ...o });
const C = {};
// 1 INTRO: rises out of the lava, eye shut; the ring and shards gather, the halo ignites, the eye opens
C.intro = range(22, (i, u, v) => { const rise = E.out(clamp(i / 11)), b = core(base(0, { dy: Math.round(lerp(150, 0, rise)), open: i < 15 ? 0 : E.sine(clamp((i - 15) / 5)),
    ring: i >= 9, rx: lerp(10, 68, E.out(clamp((i - 9) / 7))), ry: lerp(3, 17, E.out(clamp((i - 9) / 7))), ringGlow: i >= 9 ? 0.9 : 0, shards: i >= 11, spread: lerp(0.2, 1, E.out(clamp((i - 11) / 6))),
    halo: i >= 13 ? E.out(clamp((i - 13) / 5)) : 0, glow: lerp(0.3, 0.7, v) }));
  if (i < 12) { surface(clipBelow(b, 178), 178, u); splash(b, CX, 178, i % 6, 12); } else if (i < 15) surface(clipBelow(b, 186 + (i - 12) * 2), 186 + (i - 12) * 2, u);
  return b; });
// 2 IDLE (16, loop)
C.idle = range(16, (i, u) => core(base(u)));
// 3 LOOK: eye tracks left, holds, right, back
C.look = range(14, (i, u) => core(base(u, { look: [0, -0.4, -0.8, -1, -1, -1, -0.6, 0, 0.6, 1, 1, 1, 0.5, 0][i] })));
// 4 BLINK
C.blink = [1, 0.55, 0.12, 0.02, 0.35, 0.8, 1].map((o, i) => core(base(i / 16, { open: o })));
// 5 BEAM CHARGE: slit narrows, embers spiral into the eye, ring and halo brighten
C.beamCharge = range(14, (i, u, v) => { const b = core(base(i / 16, { slit: lerp(1, 0.35, v), glow: lerp(0.6, 0.95, v), ringGlow: lerp(0.5, 1, v), halo: 1 + 0.15 * v }));
  for (let k = 0; k < 10; k++) { const r = (1 - ((v * 3 + k / 10) % 1)) * 60, a = k * 0.63 + v * 4; ember(b, EYE[0] + Math.cos(a) * r, EYE[1] + Math.sin(a) * r * 0.8, 0.6 + 0.4 * (1 - r / 60), r < 25); }
  if (i > 8) dot(b, EYE[0], EYE[1], lava[5], Math.min(3, i - 8)); return b; });
// 6 BEAM FIRE: a thick molten beam sweeps across the floor from left to right; the pupil follows
const beam = (b, ang, w, flick) => { const L = 220, dx = Math.cos(ang), dy = Math.sin(ang);
  for (let s = 6; s < L; s++) { const x = EYE[0] + dx * s, y = EYE[1] + dy * s; if (x < 0 || y < 0 || x >= b.w || y >= b.h) break; const ww = w + (s % 7 < 2 && flick ? 1 : 0);
    for (let k = -ww; k <= ww; k++) { const px = x - dy * k, py = y + dx * k, a = Math.abs(k) / (ww + 0.01); b.pset(Math.round(px), Math.round(py), a < 0.35 ? lava[5] : a < 0.7 ? lava[4] : a < 0.9 ? lava[3] : lava[1]); } }
  dot(b, EYE[0], EYE[1], lava[5], w + 2); };
C.beamFire = range(14, (i, u, v) => { const ang = lerp(2.25, 0.9, E.sine(v)), b = core(base(i / 16, { slit: 0.35, glow: 0.95, ringGlow: 1, halo: 1.15, look: -Math.cos(ang) * 1.2, dx: shake(i, 1)[0] }));
  beam(b, ang, i < 2 ? 2 + i : 4, i % 2); for (let k = 0; k < 4; k++) ember(b, EYE[0] + Math.cos(ang + 0.3 * (k - 1.5)) * (30 + k * 12), EYE[1] + Math.sin(ang + 0.3 * (k - 1.5)) * (30 + k * 12), 0.9, false); return b; });
// 7 BEAM END: the beam thins out, the eye smokes and cools
C.beamEnd = range(10, (i, u, v) => { const b = core(base(i / 16, { slit: lerp(0.35, 1, v), glow: lerp(0.95, 0.5, v), ringGlow: lerp(1, 0.5, v), open: i > 2 && i < 6 ? 0.6 : 1 }));
  if (i < 3) beam(b, 0.9, 3 - i, 0); for (let k = 0; k < 3; k++) if (i > 1 + k) smoke(b, EYE[0] - 8 + k * 8, EYE[1] - 12, i - 1 - k, k); return b; });
// 8 ROAR: shudders, eye wide, halo flares, shock rings roll out
C.roar = range(14, (i, u, v) => { const [sx, sy] = shake(i, i > 2 && i < 11 ? 2 : 0), b = core(base(i / 16, { dx: sx, dy: sy, slit: i > 2 && i < 11 ? 0.5 : 1, glow: i > 2 && i < 11 ? 1 : 0.6, halo: i > 2 && i < 11 ? 1.3 : 1, crack: i > 3 && i < 10 ? 0.4 : 0 }));
  for (let k = 0; k < 3; k++) { const t = i - 3 - k * 2; if (t >= 0 && t < 8) wave(b, CX, CY, 20 + t * 11, 12 + t * 7, 0.9 - t * 0.1); } return b; });
// 9 RING SPIN-UP: the ring flattens and spins faster, runes ignite, sparks fly off it
let ph9 = 0; C.ringSpin = range(14, (i, u, v) => { ph9 += BLK * (0.3 + 2.4 * v * v); const b = core(base(i / 16, { phase: ph9, tilt: lerp(-0.12, 0, v), ringGlow: lerp(0.5, 1.1, v) }));
  if (v > 0.4) for (let k = 0; k < 4; k++) { const th = hash(i, k, 2) * Math.PI, x = CX + 68 * Math.cos(th), y = CY + 4 + 17 * Math.sin(th); ember(b, x + (k % 2 ? 4 : -4), y - 3, 0.9, false); } return b; });
// 10 SHARD VOLLEY: shards draw in, then blast outward with trails; new shards grow back
C.shardVolley = range(16, (i, u, v) => { const sp = i < 4 ? lerp(1, 0.6, i / 3) : i < 10 ? 0.6 + (i - 3) * 0.55 : lerp(0, 1, (i - 10) / 5), b = core(base(i / 16, { spread: sp, shards: i < 10 || i > 10, slit: i >= 3 && i < 6 ? 0.4 : 1, glow: i === 4 ? 1 : 0.6 }));
  if (i >= 4 && i < 10) for (const [a] of [[0], [0.8], [1.6], [2.4], [3.3], [4.1], [4.9], [5.6]]) for (let k = 1; k < 5; k++) { const r = 76 * sp - k * 7; ember(b, CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.25, 0.7 - k * 0.12, false); }
  if (i === 4) dot(b, EYE[0], EYE[1], lava[5], 4); return b; });
// 11 METEOR CALL: rises, the halo swells and fires a pillar of light into the sky
C.meteorCall = range(16, (i, u, v) => { const up = E.sine(clamp(i / 5)) * (i < 12 ? 1 : 1 - (i - 12) / 4), b = core(base(i / 16, { dy: Math.round(-8 * up), halo: 1 + 0.6 * up, glow: 0.6 + 0.35 * up, slit: 0.6 }));
  if (i >= 4 && i < 13) { const w = i < 6 ? (i - 3) * 2 : i > 10 ? (13 - i) * 2 : 5, top = Math.round(CY - 80 - 8 * up); for (let y = 0; y < top; y++) for (let k = -w; k <= w; k++) b.pset(CX + k, y, Math.abs(k) < w * 0.35 ? lava[5] : Math.abs(k) < w * 0.7 ? lava[4] : lava[2]);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + i, r = 30 + (i % 3) * 4; ember(b, CX + Math.cos(a) * r * 1.3, top + Math.sin(a) * r * 0.25, 0.9, k % 2 === 0); } }
  return b; });
// 12 LAVA RAIN: the tail heaves and sprays molten blobs up and out
C.lavaRain = range(14, (i, u, v) => { const b = core(base(i / 16, { tail: 30 + (i % 3) * 3, dx: shake(i, 1)[0], glow: 0.8 }));
  for (let k = 0; k < 10; k++) { const t = ((i + k * 1.4) % 10), a = -Math.PI / 2 + (k - 4.5) * 0.2, s = 9; const x = CX + Math.cos(a) * s * t * 0.9, y = CY + 70 + Math.sin(a) * s * t + 0.9 * t * t;
    if (y < 190 && t > 0.5) ember(b, x, y, 0.85 - t * 0.04, t < 6); } return b; });
// 13 SLAM DIVE: lifts, drops hard to the floor (squash), lava splash, rises back
const sq = (b, sx, sy) => A.place(b, 192, 192, CX, 191, { sx, sy });
C.slam = range(14, (i, u, v) => { const dy = [0, -6, -12, -14, -4, 14, 22, 22, 20, 16, 11, 6, 2, 0][i], b0 = core(base(i / 16, { dy, slit: i > 3 && i < 9 ? 0.4 : 1, tail: i >= 5 && i < 9 ? 6 : 22 }));
  const b = i === 6 ? sq(b0, 1.08, 0.94) : b0; if (i >= 6 && i < 12) splash(b, CX, 190, i - 5, 14, 1.2); return b; });
// 14 SINK / 15 EMERGE: under the lava to teleport
const sinkF = (i, v) => { const b = core(base(i / 16, { dy: Math.round(lerp(0, 160, E.in(v) * 0.4 + v * 0.6)), open: lerp(1, 0, clamp((v - 0.5) * 2)), ry: lerp(17, 6, v), ringGlow: lerp(0.5, 0, v) }));
  surface(clipBelow(b, 178), 178, v); splash(b, CX, 178, (i % 5) + 1, 10, 0.8); return b; };
C.sink = range(12, (i, u, v) => sinkF(i, v));
C.emerge = range(12, (i, u, v) => sinkF(i, 1 - v));
// 16 HURT / 17 STAGGER
C.hurt = [flash(core(base(0, { dx: 3, open: 0.4 }))), core(base(0.05, { dx: 3, open: 0.4, glow: 0.9 })), core(base(0.1, { dx: 1, open: 0.7 })), core(base(0.15))];
C.stagger = range(14, (i, u, v) => { const k = i < 6 ? 1 : 1 - (i - 6) / 8, b0 = core(base(i / 16, { dy: Math.round(10 * k), open: lerp(0.3, 1, 1 - k), tilt: -0.12 + 0.25 * k * Math.sin(i), glow: 0.4 + 0.5 * (1 - k), crack: 0.3 * k }));
  const b = A.place(b0, 192, 192, CX, 191, { rot: 0.14 * k * Math.sin(i * 1.3) }); return i === 0 ? flash(b) : b; });
// 18 STUNNED (loop): eye shut and twitching, the ring sags and goes dark, halo flickers, cracks cool
C.stunned = range(16, (i, u) => core(base(u, { open: i % 8 === 3 ? 0.18 : 0.04, ringY: 30, tilt: 0.28, ringGlow: 0, glow: 0.25 + 0.05 * Math.sin(u * TAU), halo: i % 5 === 2 ? 0 : 0.85, spread: 1.1, dy: 6 + Math.round(Math.sin(u * TAU)) })));
// 19 PHASE SHIFT: flash, the shell splits wider and blazes, the halo shatters, the eye flares
C.phaseShift = range(22, (i, u, v) => { const [sx, sy] = shake(i, 2 * (1 - Math.abs(v - 0.5) * 2) + 0.5), b = core(base(i / 16, { dx: sx, dy: sy, crack: E.io(v), glow: 0.6 + 0.4 * v, halo: i < 10 ? 1 + 0.03 * i : 0, slit: i > 8 && i < 14 ? 0.3 : 1, ringGlow: 0.5 + 0.6 * v }));
  if (i >= 10 && i < 18) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, t = i - 10; ember(b, CX + Math.cos(a) * (34 + t * 5), CY - 78 + Math.sin(a) * (7 + t * 3) + 0.4 * t * t, 0.9 - t * 0.08, t < 4); }
  if (i === 10) dot(b, EYE[0], EYE[1], lava[5], 6); return i === 0 || i === 10 ? flash(b, 0.6) : b; });
// 20 ENRAGED IDLE (loop): cracks wide and bright, crown of flame where the halo was, ring spins fast
const crown = (b, u) => { for (let k = 0; k < 7; k++) { const x = CX - 30 + k * 10, h = 12 + Math.round(8 * Math.abs(Math.sin(u * TAU * 2 + k * 1.7))), lean = Math.sin(u * TAU * 2 + k) * 2;
  for (let y = 0; y < h; y++) { const w = Math.round((1 - y / h) ** 0.7 * 4); for (let j = -w; j <= w; j++) { const e = Math.abs(j) / (w + 0.5), v = 1 - y / h * 0.7 - e * 0.4; b.pset(Math.round(x + j + lean * y / h), CY - 70 - y, lavaAt(v, x + j, y)); } } } };
C.enraged = range(16, (i, u) => { const b = core(base(u, { phase: u * 10 * BLK, crack: 1, glow: 0.88 + 0.12 * Math.sin(u * TAU * 2), ringGlow: 1, halo: 0, spread: 0.92, shardA: 0.2 * Math.sin(u * TAU * 2), dx: shake(i, 0.6)[0] })); crown(b, u); return b; });
// 21 DEATH: shudders harder, cracks go white-hot, the eye bursts, the ring snaps and falls, the body breaks apart and sinks
C.death = range(26, (i, u, v) => { const k = clamp(i / 12), [sx, sy] = shake(i, 1 + 3 * k);
  let b = core(base(i / 16, { dx: sx, dy: sy + (i > 14 ? (i - 14) * 6 : 0), crack: 0.6 + 0.4 * k, glow: 0.7 + 0.5 * k, halo: i < 6 ? 1 : 0, ring: i < 12, ringGlow: 1, shards: i < 14, spread: 1 + (i > 8 ? (i - 8) * 0.25 : 0), open: i < 12 ? 1 : 0, slit: i > 8 ? 0.2 : 1 }));
  if (i >= 12) { // eye burst and hollow socket
    const t = i - 12; for (let n = 0; n < 16; n++) { const a = n / 16 * TAU; ember(b, EYE[0] + Math.cos(a) * t * 5, EYE[1] + sy + Math.sin(a) * t * 4 + 0.3 * t * t, 1 - t * 0.07, t < 5); }
    b = A.dissolve(b, clamp(1 - (i - 14) / 11), 21); }
  if (i >= 12 && i < 22) for (let n = 0; n < 8; n++) { const t = i - 12, x = CX - 60 + n * 17, y = CY + 4 + (n % 2 ? 12 : -4) + 0.6 * t * t; if (y < 190) { b.pset(Math.round(x), Math.round(y), stone[2]); b.pset(Math.round(x) + 1, Math.round(y), stone[1]); b.pset(Math.round(x), Math.round(y) + 1, stone[0]); } }
  if (i === 12) b = flash(b, 0.8); if (i >= 18) surface(clipBelow(b, 186), 186, u);
  return b; });

// ---- CLAWS (128x128, left hand; the right hand is the same frames mirrored)
const CW = 128, CH = 128, CB = 108;
const C2 = {};
const hand = (o = {}) => A.place(claw({ open: o.open ?? 0.85, glow: o.glow ?? 0.6 }), CW, CH, 64 + (o.dx || 0), CB + (o.dy || 0), { rot: o.rot || 0 });
// 22 CLAW IDLE (loop)
C2.clawIdle = range(12, (i, u) => hand({ dy: Math.round(Math.sin(u * TAU) * 2), open: 0.85 + 0.08 * Math.sin(u * TAU + 1), glow: 0.55 + 0.1 * Math.sin(u * TAU) }));
// 23 CLAW SLAM: fist rises, smashes down, lava burst, rises
C2.clawSlam = range(13, (i, u, v) => { const dy = [0, -6, -12, -16, -16, 0, 14, 16, 16, 14, 10, 5, 0][i], b = hand({ dy, open: lerp(0.85, 0, clamp(i / 3)) * (i > 10 ? (i - 10) / 3 : 1) + (i > 10 ? 0 : 0), rot: i === 6 ? 0.05 : 0 });
  if (i >= 6 && i < 12) { splash(b, 64, 126, i - 5, 12, 1.1); if (i === 6) for (let x = 20; x < 108; x += 3) b.pset(x, 126, lava[4]); } return b; });
// 24 CLAW SWIPE: winds back, sweeps across with talon trails, recovers
C2.clawSwipe = range(11, (i, u, v) => { const dx = [0, 8, 16, 20, 4, -18, -26, -24, -14, -6, 0][i], rot = [0, -0.1, -0.2, -0.25, -0.05, 0.25, 0.35, 0.3, 0.15, 0.05, 0][i], b = hand({ dx, rot, open: 1 });
  if (i === 4 || i === 5 || i === 6) for (let k = 0; k < 3; k++) for (let s = 0; s < 26; s++) { const x = 64 + dx + 10 + s * (i === 4 ? 1 : 1.3), y = 96 + k * 8 - Math.round(s * s * 0.012); b.pset(Math.round(x), Math.round(y), s < 8 ? bone[3] : s < 16 ? bone[2] : lava[1]); }
  return b; });
// 25 CLAW GRAB: spreads wide, lunges, snaps shut, squeezes (lava drips), lets go
C2.clawGrab = range(13, (i, u, v) => { const open = [0.9, 1.1, 1.2, 1.2, 0.6, 0, 0, 0, 0, 0, 0.3, 0.6, 0.85][i], dy = [0, -4, -6, 4, 12, 12, 11, 12, 11, 12, 8, 4, 0][i], [sx] = shake(i, i >= 6 && i <= 9 ? 1.5 : 0), b = hand({ open, dy, dx: sx, glow: i >= 5 && i <= 9 ? 0.95 : 0.6 });
  if (i >= 6 && i <= 10) for (let k = 0; k < 3; k++) { const t = (i - 6 + k) % 4; dot(b, 52 + k * 10, 112 + dy * 0.3 + t * 4, lava[3 - (t > 2 ? 1 : 0)]); } return b; });
// 26 CLAW FIREBALL: palm turns up, a fireball swells over it, hurled forward
const fireball = (b, x, y, r, t) => { for (let j = -r - 2; j <= r + 2; j++) for (let i = -r - 2; i <= r + 2; i++) { const d = Math.hypot(i, j) + Math.sin(Math.atan2(j, i) * 5 + t * 9) * 0.8; if (d > r) continue; b.pset(Math.round(x + i), Math.round(y + j), lavaAt(1.05 - d / r * 0.8, x + i, y + j)); } };
C2.clawFireball = range(14, (i, u, v) => { const rot = i < 4 ? -0.28 * E.sine(i / 3) : i < 9 ? -0.28 : i < 11 ? 0.3 : lerp(0.3, 0, (i - 10) / 3), b = hand({ rot, open: i < 9 ? 1.05 : 0.9, dx: i === 9 ? 6 : 0, glow: 0.6 + 0.4 * clamp(i / 8) });
  if (i >= 2 && i < 9) fireball(b, 62, 36, Math.min(12, 3 + Math.round(i * 1.3)), i); if (i >= 9 && i < 12) { const t = i - 9; fireball(b, 80 + t * 18, 40 + t * 10, 8, i); for (let k = 1; k < 5; k++) ember(b, 80 + t * 18 - k * 5, 40 + t * 10 - k * 3, 0.7 - k * 0.1, false); } return b; });
// 27 CLAW SHATTER: flash, cracks blaze, the hand breaks into falling rock and lava
C2.clawShatter = range(16, (i, u, v) => { let b = hand({ glow: 1, open: lerp(0.85, 0.3, clamp(i / 6)), dx: shake(i, i < 6 ? 2 : 0)[0] });
  if (i >= 5) { b = A.melt(b, E.in(clamp((i - 5) / 9)), CH - 2, 4); b = A.dissolve(b, clamp(1 - (i - 9) / 7), 5); splash(b, 64, 126, Math.min(6, i - 5), 10, 0.9); }
  return i === 0 || i === 5 ? flash(b, 0.8) : b; });

// ---- PROJECTILES AND HAZARDS
// 28 RING DISC: the rune ring thrown as a spinning blade (96x40)
const RW = 96, RH = 40;
const FX = {};
FX.ringDisc = range(8, (i, u) => { const b = new P.Buf(RW, RH); const st = { rx: 40, ry: 9, phase: u * 5 * BLK, ringGlow: 1, tilt: 0, ringY: 0 };
  const tmp = new P.Buf(192, 192); M_ring(tmp, 96, 96, st); A.over(b, P.crop(tmp, 48, 76, RW, RH));
  for (let k = 0; k < 6; k++) ember(b, 92 - k * 2 + (hash(i, k, 2) * 4 | 0), 14 + (hash(k, i, 3) * 12 | 0), 0.8 - k * 0.1, false); return b; });
function M_ring(b, cx, cy, st) { M.ring(b, cx, cy, st, false); M.ring(b, cx, cy, st, true); }
// 29 METEOR: falling loop (4) + impact (8), 48x64
const MW = 48, MH = 64;
const rockball = (b, x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d > r) continue; const X = Math.round(x + i), Y = Math.round(y + j);
  b.pset(X, Y, d > r - 1 ? rock[0] : (i + j > r * 0.6) ? lava[2] : rock[P.band(clamp(0.6 - 0.4 * (i + j) / r), 5, X, Y, 0.2)]); } };
FX.meteorFall = range(4, (i) => { const b = new P.Buf(MW, MH); for (let s = 0; s < 34; s++) { const w = Math.round((1 - s / 34) * 5); for (let k = -w; k <= w; k++) if (hash(k, s + i * 3, 4) < 0.85) b.pset(24 + k + Math.round(Math.sin(s * 0.5 + i) * 0.7), 40 - s, s < 6 ? lava[4] : s < 16 ? lava[3] : s < 26 ? lava[2] : lava[1]); } rockball(b, 24, 46, 7); return b; });
FX.meteorImpact = range(8, (i) => { const b = new P.Buf(MW, MH); if (i < 2) rockball(b, 24, 56 - (1 - i) * 4, 7 - i * 2);
  if (i >= 1) { const t = i; for (let k = 0; k < 10; k++) { const a = Math.PI * (1.05 + 0.9 * k / 9), s = 3 + hash(k, 2, 2) * 2; const x = 24 + Math.cos(a) * s * t, y = 62 + Math.sin(a) * s * t + 0.5 * t * t; if (y < 63) ember(b, x, y, 0.95 - t * 0.09, t < 4); }
    for (let x = 24 - t * 2; x <= 24 + t * 2; x++) b.pset(x, 63, lava[Math.max(0, 4 - Math.floor(t / 2))]); }
  if (i === 1) dot(b, 24, 58, lava[5], 5); return b; });
// 30 LAVA POOL hazard: spreads, bubbles (loop), cools (80x20)
const LW = 80, LH = 20;
const pool = (w, t, cool = 0) => { const b = new P.Buf(LW, LH); for (let x = -w; x <= w; x++) { const h = Math.round(3 * Math.sqrt(Math.max(0, 1 - (x / (w + 0.5)) ** 2))); for (let y = 0; y <= h; y++) {
    const v = 0.55 + 0.25 * Math.sin(x * 0.4 + t * TAU) + (y === h ? 0.2 : 0) - cool; b.pset(40 + x, LH - 1 - y, y === h && Math.abs(x) > w - 3 ? rock[1] : lavaAt(v, x, y)); } }
  for (let k = 0; k < 3; k++) { const ph = (t * 2 + k / 3) % 1, x = 40 + (k - 1) * Math.round(w * 0.5); if (cool < 0.3 && w > 10) { if (ph < 0.6) dot(b, x, LH - 5 - Math.round(ph * 4), lava[4], ph < 0.3 ? 1 : 0); else b.pset(x, LH - 9, lava[3]); } }
  return b; };
FX.poolSpread = range(5, (i) => pool([6, 14, 24, 32, 36][i], i / 5));
FX.poolLoop = range(8, (i, u) => pool(36, u));
FX.poolFade = range(5, (i) => A.dissolve(pool(36, 0, 0.15 + i * 0.12), 1 - i * 0.18, 30 + i));

// ---- timing (ms per frame)
const D = { intro: 90, idle: 100, look: 110, blink: 70, beamCharge: 80, beamFire: 70, beamEnd: 100, roar: 80, ringSpin: 80, shardVolley: 70, meteorCall: 90, lavaRain: 80, slam: [90, 90, 90, 140, 50, 50, 120, 90, 90, 90, 90, 90, 90, 100],
  sink: 80, emerge: 80, hurt: [70, 90, 100, 120], stagger: 90, stunned: 120, phaseShift: 90, enraged: 80, death: 100,
  clawIdle: 110, clawSlam: [90, 80, 80, 140, 60, 40, 120, 90, 90, 90, 90, 90, 100], clawSwipe: [90, 90, 90, 130, 40, 40, 80, 90, 90, 90, 100], clawGrab: 90, clawFireball: 80, clawShatter: 90,
  ringDisc: 60, meteorFall: 70, meteorImpact: 70, poolSpread: 80, poolLoop: 120, poolFade: 110 };
const pack = (o) => Object.fromEntries(Object.entries(o).map(([k, frames]) => [k, { frames, delay: D[k] }]));
module.exports = { core: pack(C), claw: pack(C2), ringDisc: pack({ ringDisc: FX.ringDisc }), meteor: pack({ meteorFall: FX.meteorFall, meteorImpact: FX.meteorImpact }), lavaPool: pack({ poolSpread: FX.poolSpread, poolLoop: FX.poolLoop, poolFade: FX.poolFade }), mirror };
if (require.main === module) { const m = module.exports;
  A.render("molten-core", m.core, { scale: 1, gifScale: 2 }); A.render("molten-claw", m.claw, { scale: 2, gifScale: 3 });
  A.render("molten-ringdisc", m.ringDisc, { scale: 3, gifScale: 4 }); A.render("molten-meteor", m.meteor, { scale: 3, gifScale: 4 }); A.render("molten-pool", m.lavaPool, { scale: 3, gifScale: 4 });
  console.log("core", Object.values(m.core).reduce((n, a) => n + a.frames.length, 0), "claw", Object.values(m.claw).reduce((n, a) => n + a.frames.length, 0)); }

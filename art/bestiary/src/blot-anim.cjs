// 2. Blotling: three sizes; large and medium split into two of the next size
const A = require("./anim.cjs"), P = A.P, { blot, ink, gold } = require("./blot.cjs");
const SIZES = { blotling: { r: 9, W: 48, H: 32 }, "blotling-m": { r: 6, W: 32, H: 24 }, "blotling-s": { r: 4, W: 24, H: 16 } };
const NEXT = { blotling: "blotling-m", "blotling-m": "blotling-s" };
const drop = (b, x, y, big) => { x = Math.round(x); y = Math.round(y);
  if (!big) { b.pset(x, y, ink[1]); b.pset(x, y + 1, ink[0]); return; }
  [[0, -1, ink[2]], [-1, 0, ink[1]], [0, 0, ink[1]], [1, 0, gold[1]], [-1, 1, ink[0]], [0, 1, ink[0]], [1, 1, ink[0]]].forEach(([i, j, c]) => b.pset(x + i, y + j, c)); };
const make = (name) => {
  const { r, W, H } = SIZES[name], cx = W / 2, floor = H - 1, big = r > 5;
  const body = (look, o) => A.place(blot(r, look), W, H, cx, floor, o);
  const flash = (b) => A.tint(b, [255, 248, 225]);
  const fr = (look, o, extra) => { const f = body(look, o); if (extra) extra(f); return f; };
  // IDLE: wobble, blink once, pupil drifts; two ink drops bob beside the large one
  const idle = [...Array(6)].map((_, i) => { const w = Math.sin(i / 6 * 2 * Math.PI);
    return fr({ eye: i === 4 ? 0.2 : 1, px: i < 3 ? -0.5 : 0.5 }, { sx: 1 + 0.05 * w, sy: 1 - 0.06 * w },
      f => { if (big) { drop(f, cx - r - 6, 8 + Math.round(w * 1.5), true); drop(f, cx + r + 6, 10 - Math.round(w * 1.5), true); } }); });
  // HOP (move): crouch, launch, airborne, land; a drip trails behind
  const hopO = [{ sx: 1.14, sy: 0.84 }, { sx: 0.88, sy: 1.14, dy: -2 }, { sx: 0.95, sy: 1.06, dy: -0.45 * r }, { sx: 0.92, sy: 1.1, dy: -0.25 * r }, { sx: 1.18, sy: 0.82 }, { sx: 1, sy: 1 }];
  const hop = hopO.map((o, i) => fr({ px: -0.6 }, o, f => { if (i >= 1 && i <= 4) drop(f, cx + r * 0.8 + 2, floor - r * 0.4 + (o.dy || 0) * 0.5, big); }));
  // ATTACK: rear back, lunge forward (left) stretched, slam into an ink splat, recoil
  const atkO = [{ sx: 1.1, sy: 0.88, dx: 1 }, { sx: 1.18, sy: 0.8, dx: 2 }, { sx: 1.3, sy: 0.82, dx: -0.5 * r }, { sx: 1.22, sy: 0.86, dx: -0.7 * r }, { sx: 1.05, sy: 0.95, dx: -0.5 * r }, { sx: 0.95, sy: 1.05, dx: -0.2 * r }, { sx: 1, sy: 1 }];
  const attack = atkO.map((o, i) => fr({ px: -1, eye: i === 3 ? 0.7 : 1 }, o, f => { if (i === 3 || i === 4) { const k = i - 2;
    for (const [ax, ay] of [[-1, -0.5], [-1.2, 0.3], [-0.8, -1]]) drop(f, cx + o.dx - r * 1.2 + ax * k * 2, floor - r + ay * k * 2, big && i === 3); } }));
  // HURT
  const hurt = [flash(body({ eye: 0.3 }, { sx: 0.88, sy: 1.1, dx: 2 })), body({ eye: 0.5 }, { sx: 1.12, sy: 0.9, dx: 2 }), body({}, { sx: 0.96, sy: 1.04, dx: 1 })];
  // DEATH: flash, squash, burst into droplets, a puddle that fades
  const death = [];
  for (let i = 0; i < 9; i++) { let f;
    if (i === 0) f = flash(body({ eye: 0.3 }, { sx: 0.9, sy: 1.1 }));
    else if (i < 3) f = body({ eye: 0.1 }, { sx: 1 + 0.2 * i, sy: 1 - 0.25 * i });
    else { f = A.frame(W); f = new P.Buf(W, H); const t = i - 2, n = big ? 8 : 6;
      for (let k = 0; k < n; k++) { const a = Math.PI * (1 + k / (n - 1)), sp = r * 0.35 * (0.8 + 0.4 * A.hash(k, 0, 4));
        const x = cx + Math.cos(a) * sp * t, y = floor - r * 0.5 + Math.sin(a) * sp * t + 0.35 * t * t;
        if (y < floor - 1) drop(f, x, y, r > 4 && t < 5); else if (t < 6) f.pset(Math.round(x), floor, ink[0]); }
      const pw = Math.round(r * (1.6 - 0.18 * t)); for (let x = -pw; x <= pw; x++) if (A.hash(x, t, 6) < 1 - t / 7) f.pset(Math.round(cx + x), floor, x % 3 ? ink[1] : gold[1]); }
    death.push(f); }
  const anims = { idle: { frames: idle, delay: 130 }, hop: { frames: hop, delay: [90, 70, 90, 80, 90, 110] },
    attack: { frames: attack, delay: [90, 110, 60, 110, 90, 90, 110] }, hurt: { frames: hurt, delay: [70, 90, 110] } };
  // SPLIT (large, medium): flash, swell wide, pinch, two halves of the next size hop apart
  if (NEXT[name]) { const nr = SIZES[NEXT[name]].r, half = blot(nr, { px: 0 }), split = [];
    for (let i = 0; i < 10; i++) { let f;
      if (i === 0) f = flash(body({}, { sx: 1.05, sy: 0.95 }));
      else if (i < 3) f = body({ eye: i === 2 ? 0.3 : 1 }, { sx: 1 + 0.15 * i, sy: 1 - 0.1 * i });
      else if (i === 3) { f = body({ eye: 0.1 }, { sx: 1.4, sy: 0.75 }); for (let y = 0; y < H; y++) for (let x = Math.round(cx) - 1; x <= Math.round(cx); x++) f.px[y * W + x] = 0; }
      else { f = new P.Buf(W, H); const t = (i - 3) / 6, off = 2 + (W / 4 - 1) * A.E.quad(t), up = Math.round(-Math.sin(Math.PI * Math.min(1, t * 1.2)) * r * 0.6);
        const sq = i === 8 ? { sx: 1.15, sy: 0.85 } : {};
        for (const s of [-1, 1]) A.over(f, A.place(s < 0 ? half : P.flip ? P.flip(half) : half, W, H, cx + s * off, floor, { dy: i < 8 ? up : 0, ...sq }));
        if (i < 7) for (let k = 0; k < 3; k++) drop(f, cx + (k - 1) * 2, floor - r * 0.6 - (i - 3) * 1.5 + k, false); }
      split.push(f); }
    anims.split = { frames: split, delay: [70, 80, 90, 70, 70, 70, 80, 80, 90, 120] }; }
  anims.death = { frames: death, delay: [70, 80, 80, 70, 70, 80, 90, 110, 160] };
  return anims;
};
module.exports = { make, SIZES };
if (require.main === module) for (const n of Object.keys(SIZES)) A.render(n, make(n), { scale: n === "blotling" ? 4 : 6 });

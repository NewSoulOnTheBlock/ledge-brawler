// 1. Scrivener Wraith: idle, float, attack (quill slash), cast (script throw), hurt, death + script projectile/hazard
const A = require("./anim.cjs"), P = A.P;
const { ink, gold } = require("./wraith.cjs");
const S = 48, src = P.load("work/wraith-hand.png");
const OX = 8, OY = 12;                                  // sprite -> frame offset (bottom of robe at y 42)
const rig = new P.Rig(src)
  .bone("body", null, 19, 27, 19, 13, 0)
  .bone("head", "body", 18, 12, 18, 1, 1)
  .bone("arm", "body", 13, 15, 5, 17, 2)
  .bind({ joint: 1, paint: { arm: [[0, 2], [10, 2], [12, 12], [13, 19], [7, 23], [0, 23]], head: [[11, 0], [27, 0], [27, 12], [11, 12]] } });
const Yb = P.col(P.hsl(50, 1, 0.62)), PAGE = P.col(P.hsl(42, 0.55, 0.84)), PAGES = P.col(P.hsl(36, 0.4, 0.64)), LINE = P.col(P.hsl(26, 0.5, 0.36));
const tipOf = (pose, dx = 0, dy = 0) => { const T = rig.pose(pose)[2]; const [x, y] = P.Rig.apply(T, 2, 4); return [x + OX + dx, y + OY + dy]; };

// a small page, tumbling between three shapes
const page = (b, x, y, k) => { x = Math.round(x); y = Math.round(y);
  const shapes = [["PPP", "PLP", "PPP"], ["PPPP", "PLLP", "SSSS"], ["SP", "PL", "PP"]];
  shapes[((k % 3) + 3) % 3].forEach((r, j) => [...r].forEach((c, i) => b.pset(x + i, y + j, c === "P" ? PAGE : c === "L" ? LINE : PAGES))); };
const pages = (f, t, { cx = 27, cy = 34, rx = 15, ry = 3, front, trail = 0 } = {}) => {
  for (let k = 0; k < 3; k++) { const a = 2 * Math.PI * (t + k / 3), s = Math.sin(a);
    if ((s >= 0) !== front) continue;
    page(f, cx + rx * Math.cos(a) + trail * (1 + k), cy + ry * s + Math.sin(a * 2) * 1.5, Math.floor(t * 6) + k); } };
// ink drips at the robe's bottom: drop that stretches and falls from a few tips
const drip = (f, i, dy = 0) => { [[13, 30], [19, 30], [27, 29]].forEach(([x, y], k) => { const ph = (i + k * 3) % 8;
  if (ph < 4) for (let j = 1; j <= Math.min(ph, 2); j++) f.pset(OX + x, OY + y + j + dy, ink[1]);
  else if (ph < 7) f.pset(OX + x, OY + y + 2 + (ph - 3) * 2 + dy, ink[1]); }); };
const body = (f, pose, dx = 0, dy = 0) => { rig.draw(f, OX + dx, OY + dy, pose); return f; };

// IDLE: hover bob, pages orbit the waist (one turn per loop), drips form and fall
const idle = [...Array(8)].map((_, i) => { const t = i / 8, f = A.frame(S), bob = Math.round(Math.sin(t * 2 * Math.PI));
  pages(f, t, { front: false, cy: 34 + bob });
  body(f, { head: 0.04 * Math.sin(t * 2 * Math.PI + 1), arm: 0.05 * Math.sin(t * 2 * Math.PI) }, 0, bob);
  drip(f, i, bob); pages(f, t, { front: true, cy: 34 + bob }); return f; });

// FLOAT (move left): lean in, pages trail behind
const float = [...Array(8)].map((_, i) => { const t = i / 8, f = A.frame(S), bob = Math.round(1.5 * Math.sin(t * 2 * Math.PI));
  pages(f, t * 1.5, { front: false, cx: 30, cy: 33 + bob, rx: 12, trail: 2 });
  body(f, { body: -0.12, head: -0.06, arm: -0.15 + 0.06 * Math.sin(t * 2 * Math.PI) }, 2, bob);
  drip(f, i * 2, bob); pages(f, t * 1.5, { front: true, cx: 30, cy: 33 + bob, rx: 12, trail: 2 }); return f; });

// ATTACK: wind the quill up and back, slash down through a gold smear, hold, recover
const atkPoses = [ { arm: 0.35, head: 0.05 }, { arm: 0.8, head: 0.1, body: 0.06 }, { arm: 1.05, head: 0.12, body: 0.08 },
  { arm: 0.2, body: -0.08, dx: -1 }, { arm: -0.65, body: -0.16, head: -0.08, dx: -2 }, { arm: -0.75, body: -0.16, head: -0.08, dx: -2 },
  { arm: -0.5, body: -0.1, dx: -1 }, { arm: -0.15, body: -0.03 }, { arm: 0 } ];
const attack = atkPoses.map((p, i) => { const f = A.frame(S), pose = { body: p.body ?? 0, head: p.head ?? 0, arm: p.arm };
  pages(f, i / 9, { front: false }); body(f, pose, p.dx ?? 0, 0);
  if (i === 3 || i === 4) { const a0 = atkPoses[i - 1].arm, a1 = p.arm; // smear along the tip path
    for (let k = 0; k <= 10; k++) { const a = A.lerp(a0, a1, k / 10), [x, y] = tipOf({ ...pose, arm: a }, p.dx ?? 0);
      f.pset(Math.round(x), Math.round(y), k > 6 ? Yb : k > 3 ? gold[3] : gold[2]); if (i === 3) f.pset(Math.round(x) + 1, Math.round(y), gold[2]); } }
  drip(f, i); pages(f, i / 9, { front: true }); return f; });

// script glyphs: little 3x3 runes
const RUNES = [["o.o", ".o.", "o.o"], ["ooo", "o..", "oo."], [".o.", "ooo", ".o."], ["o..", "ooo", "..o"], ["oo.", ".o.", ".oo"]];
const rune = (b, x, y, k, col, shade) => RUNES[k % RUNES.length].forEach((r, j) => [...r].forEach((c, i) => { if (c === "o") { b.pset(Math.round(x + i), Math.round(y + j), col); if (shade) b.pset(Math.round(x + i), Math.round(y + j + 1), shade); } }));
const scriptLine = (b, x, y, n, t, { bright = 1, wob = 1 } = {}) => { for (let k = 0; k < n; k++) {
  const yy = y + Math.round(wob * Math.sin(t * 2 * Math.PI + k * 1.3)), c = bright > 0.66 ? (A.hash(k, Math.floor(t * 8), 3) < 0.3 ? Yb : gold[3]) : bright > 0.33 ? gold[2] : gold[1];
  rune(b, x + k * 4, yy, k * 2 + 1, c, null); } };

// CAST "Script Throw": raise the quill, runes gather at the tip, flick forward and release a line of script
const cast = [];
for (let i = 0; i < 12; i++) { const f = A.frame(S);
  const up = i < 5 ? A.E.sine(Math.min(1, i / 4)) : 0, arm = i < 5 ? 0.2 + 1.0 * up : i === 5 ? -0.6 : i < 9 ? -0.45 : A.lerp(-0.45, 0, (i - 8) / 3);
  const pose = { arm, head: i < 5 ? 0.12 * up : -0.05, body: i < 5 ? 0.06 * up : i < 9 ? -0.12 : -0.04 };
  pages(f, i / 12, { front: false }); body(f, pose, i >= 5 && i < 9 ? -1 : 0, 0);
  const [tx, ty] = tipOf(pose, i >= 5 && i < 9 ? -1 : 0);
  if (i >= 1 && i < 5) { for (let k = 0; k < 4; k++) { const a = k * 1.57 + i * 0.9, r = 9 - i * 2; f.pset(Math.round(tx + r * Math.cos(a)), Math.round(ty + r * Math.sin(a)), gold[3]); }
    f.pset(Math.round(tx), Math.round(ty), Yb); if (i >= 3) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) f.pset(Math.round(tx + dx), Math.round(ty + dy), gold[3]); }
  if (i === 5) { for (let k = -2; k <= 2; k++) f.pset(Math.round(tx - 1), Math.round(ty + k), Yb); f.pset(Math.round(tx - 2), Math.round(ty), Yb); }
  if (i >= 5 && i < 9) scriptLine(f, 1 - (i - 5) * 6, ty - 8, 3, i / 4, { bright: 1 });   // leaves the frame by 9; the game spawns the projectile here
  drip(f, i); pages(f, i / 12, { front: true }); cast.push(f); }

// HURT: flash, knocked back (hit from the front), head snaps back, settle
const hurtP = [{ head: 0.3, arm: 0.4, body: 0.12, dx: 3, fl: 1 }, { head: 0.25, arm: 0.3, body: 0.1, dx: 3 }, { head: 0.1, arm: 0.1, body: 0.04, dx: 1 }, { dx: 0 }];
const hurt = hurtP.map((p, i) => { const f = A.frame(S); let g = A.frame(S);
  pages(f, 0.1 + i * 0.07, { front: false, rx: 17 }); body(g, { head: p.head ?? 0, arm: p.arm ?? 0, body: p.body ?? 0 }, p.dx);
  if (p.fl) g = A.tint(g, [255, 250, 230], p.fl === 1 ? 1 : 0.15); A.over(f, g); pages(f, 0.1 + i * 0.07, { front: true, rx: 17 }); return f; });

// DEATH: flash, recoil, the ink melts into a puddle, the quill falls, pages flutter down, gold motes rise
const death = [];
for (let i = 0; i < 14; i++) { const f = A.frame(S); let g = A.frame(S);
  const pose = { head: i < 3 ? 0.25 : 0.25 + 0.1 * i, arm: i < 3 ? 0.4 : 0.4 - 0.25 * (i - 2), body: i < 3 ? 0.1 : 0.1 };
  body(g, pose, i < 3 ? 2 : 2, 0);
  if (i === 0) g = A.tint(g, [255, 250, 230]);
  if (i >= 3) g = A.melt(g, A.E.io(Math.min(1, (i - 3) / 7)), 43, 5);
  if (i >= 10) g = A.dissolve(g, 1 - (i - 9) / 5, 7);
  A.over(f, g);
  for (let k = 0; k < 3; k++) { const t = i - 1 - k * 0.7; if (t < 0) continue;   // pages flutter to the floor
    const x = 10 + k * 13 + 3 * Math.sin(t * 1.3 + k), y = Math.min(42, 30 + t * 1.6);
    if (i < 13 || k === 1) page(f, x, y, y >= 42 ? 1 : Math.floor(t) + k); }
  if (i >= 4) for (let k = 0; k < 5; k++) { const t = i - 4 - k * 0.8; if (t < 0 || t > 6) continue;  // motes rise
    f.pset(Math.round(14 + k * 5 + Math.sin(t + k) * 1.5), Math.round(40 - t * 3), t > 4 ? gold[1] : t > 2 ? gold[2] : gold[3]); }
  death.push(f); }

// SCRIPT projectile + hazard (separate sprite, 24x8 frames): fly loop, land, linger loop, fade
const SW = 24, SH = 8, sf = () => new P.Buf(SW, SH);
const fly = [...Array(4)].map((_, i) => { const b = sf(); scriptLine(b, 4, 2, 4, i / 4, { wob: 1 }); b.pset(1 + (i % 2), 4, gold[2]); b.pset(0, 3 + (i % 3), gold[1]); return b; });
const hazGround = (b, n) => { for (let x = 1; x < SW - 1; x++) if (A.hash(x, 0, 9) < 0.85 || x % 5) b.pset(x, SH - 1, ink[1]); for (let x = 3; x < SW - 3; x += 1) if (A.hash(x, 1, 9) < 0.5) b.pset(x, SH - 2, ink[0]); };
const land = [0, 1, 2].map(i => { const b = sf(); hazGround(b); scriptLine(b, 4, 1 + i * 1.5, 4, 0.25 * i, { wob: 0 }); return b; });
const linger = [...Array(6)].map((_, i) => { const b = sf(); hazGround(b); scriptLine(b, 4, 3, 4, i / 6, { wob: 0.6, bright: 1 });
  const mx = 4 + ((i * 5) % 16), my = 2 - (i % 3); b.pset(mx, my, gold[2]); return b; });
const fade = [0.6, 0.3, 0.1].map((v, i) => { const b = sf(); hazGround(b); scriptLine(b, 4, 3, 4, 0, { wob: 0, bright: v }); return A.dissolve(b, 1 - i * 0.3, 11 + i); });

module.exports = { idle, float, attack, cast, hurt, death, script: { fly, land, linger, fade } };
if (require.main === module) {
  A.render("wraith", {
    idle: { frames: idle, delay: 120 }, float: { frames: float, delay: 100 },
    attack: { frames: attack, delay: [90, 90, 140, 50, 70, 120, 90, 90, 110] },
    cast: { frames: cast, delay: [90, 90, 90, 90, 160, 60, 70, 70, 80, 90, 90, 120] },
    hurt: { frames: hurt, delay: [70, 90, 100, 120] },
    death: { frames: death, delay: [80, 110, 110, 90, 90, 90, 90, 100, 100, 110, 120, 130, 140, 260] },
  });
  A.render("wraith-script", { fly: { frames: fly, delay: 80 }, land: { frames: land, delay: 80 }, linger: { frames: linger, delay: 120 }, fade: { frames: fade, delay: 120 } }, { scale: 8, gifScale: 8 });
}

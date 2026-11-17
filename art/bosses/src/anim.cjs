// Shared helpers for bestiary animations (frames of size S x S)
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
const fs = require("fs");
const A = { P };
A.frame = (S) => new P.Buf(S, S);
A.solid = (b, x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h && (b.px[y * b.w + x] >>> 24);
A.over = (dst, b, dx = 0, dy = 0) => { b.px.forEach((c, i) => { if (!(c >>> 24)) return;
  const x = (i % b.w) + dx, y = ((i / b.w) | 0) + dy; if (x >= 0 && y >= 0 && x < dst.w && y < dst.h) dst.px[y * dst.w + x] = c; }); return dst; };
A.tint = (b, col, amt = 1) => { const o = new P.Buf(b.w, b.h), [r2, g2, b2] = P.unpack(P.col(col));
  b.px.forEach((c, i) => { if (!(c >>> 24)) return; const [r, g, bb] = P.unpack(c);
    o.px[i] = P.rgb(r + (r2 - r) * amt, g + (g2 - g) * amt, bb + (b2 - bb) * amt); }); return o; };
A.hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
A.dissolve = (b, keep, seed = 1) => { const o = new P.Buf(b.w, b.h); b.px.forEach((c, i) => { if ((c >>> 24) && A.hash(i % b.w, (i / b.w) | 0, seed) < keep) o.px[i] = c; }); return o; };
// melt: rows sink toward the floor; pixel at row y drops by amt*(floor-y)^0 with column jitter
A.melt = (b, u, floor, seed = 2) => { const o = new P.Buf(b.w, b.h);
  for (let x = 0; x < b.w; x++) { const sp = 0.6 + 0.8 * A.hash(x, 0, seed);
    for (let y = b.h - 1; y >= 0; y--) { const c = b.px[y * b.w + x]; if (!(c >>> 24)) continue;
      const ny = Math.min(floor, Math.round(y + (floor - y) * Math.min(1, u * sp)));
      if (!(o.px[ny * b.w + x] >>> 24)) o.px[ny * b.w + x] = c; else { let k = ny; while (k > 0 && (o.px[k * b.w + x] >>> 24)) k--; o.px[k * b.w + x] = c; } } }
  return o; };
A.E = P.ease;
A.lerp = (a, b, t) => a + (b - a) * t;
A.BG = P.rgb(22, 20, 30);
// preview: numbered frame sheet + GIF of every animation in sequence; animations: {name:{frames,delay}}
A.render = (name, anims, { scale = 4, gifScale = 5 } = {}) => {
  const dir = `work/anim/${name}`; fs.mkdirSync(dir, { recursive: true });
  const items = [], all = [], del = [];
  for (const [an, { frames, delay }] of Object.entries(anims)) {
    frames.forEach((f, i) => items.push({ buf: f, label: `${an} ${i}`, scale }));
    const bgd = frames.map(f => { const b = new P.Buf(f.w, f.h); b.rect(0, 0, f.w, f.h, A.BG); return A.over(b, f); });
    fs.writeFileSync(`${dir}/${an}.gif`, P.gif(bgd, { delay, scale: gifScale }));
    const reps = frames.length < 6 ? 3 : 2;
    for (let k = 0; k < reps; k++) bgd.forEach((f, i) => { all.push(f); del.push(Array.isArray(delay) ? delay[i] : delay); });
  }
  P.save(P.sheet(items, { cols: 10 }), `work/preview-${name}.png`);
  fs.writeFileSync(`work/preview-${name}.gif`, P.gif(all, { delay: del, scale: gifScale }));
};
module.exports = A;
// Nearest-neighbour squash/stretch of a sprite into a W x H frame, its bottom-centre at (cx, floor)
A.place = (src, W, H, cx, floor, o = {}) => {
  const out = new P.Buf(W, H), bb = P.bounds(src), sx = o.sx ?? 1, sy = o.sy ?? 1, dx = o.dx ?? 0, dy = o.dy ?? 0, r = o.rot ?? 0;
  const ax = bb.x + bb.w / 2, ay = bb.y + bb.h, c = Math.cos(-r), s = Math.sin(-r);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x + 0.5 - cx - dx, v = y + 0.5 - floor - dy, ru = u * c - v * s, rv = u * s + v * c;
    const X = Math.floor(ru / sx + ax), Y = Math.floor(rv / sy + ay);
    if (A.solid(src, X, Y)) out.px[y * W + x] = src.px[Y * src.w + X];
  }
  return out;
};

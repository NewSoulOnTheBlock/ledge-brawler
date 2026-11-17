// Cut one enemy out of the bestiary: background off, keep the body (big connected parts), drop loose bits
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
module.exports = (x, y, w, h, { tol = 22, minPart = 40, flood = false, drop = () => false } = {}) => {
  const img = P.load(require("path").join(__dirname, "../ref/bestiary.png"));
  let b = P.removeBg(P.crop(img, x, y, w, h), { tol, flood, color: [0,0,0] });
  const W = b.w, H = b.h, seen = new Int32Array(W * H).fill(-1), parts = [];
  for (let i = 0; i < W * H; i++) {
    if (!(b.px[i] >>> 24) || seen[i] >= 0) continue;
    const st = [i], px = []; seen[i] = parts.length;
    while (st.length) { const j = st.pop(); px.push(j); const jx = j % W, jy = (j / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = jx + dx, Y = jy + dy, k = Y * W + X;
        if (X >= 0 && Y >= 0 && X < W && Y < H && (b.px[k] >>> 24) && seen[k] < 0) { seen[k] = parts.length; st.push(k); } } }
    parts.push(px);
  }
  const out = new P.Buf(W, H);
  parts.forEach((px, n) => { if (px.length < minPart || drop(px.map(j => b.px[j]), px, W)) return; px.forEach(j => out.px[j] = b.px[j]); });
  return P.trim(out, 1);
};

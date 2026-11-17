// Downscale a reference cut onto two hue-shifted ramps (body + accent), keeping thin accent lines.
// Each output cell: solid if coverage >= cover; accent if accent pixels >= accentShare of it;
// tone = mean lightness of that class in the cell, mapped across the ramp's full range.
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
module.exports = (src, H, { body, accent, isAccent, cover = 0.33, accentShare = 0.2 }) => {
  const s = src.h / H, W = Math.round(src.w / s), out = new P.Buf(W, H);
  const L = c => { const [r, g, b] = P.unpack(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let n = 0, sol = 0, acc = [], bod = [];
    for (let v = Math.floor(y * s); v < Math.floor((y + 1) * s); v++) for (let u = Math.floor(x * s); u < Math.floor((x + 1) * s); u++) {
      n++; const c = src.get(u, v); if (!(c >>> 24)) continue; sol++; (isAccent(c) ? acc : bod).push(L(c)); }
    if (!n || sol / n < cover) continue;
    const a = acc.length / sol >= accentShare, arr = a ? acc : bod;
    cells.push({ x, y, a, l: arr.reduce((p, q) => p + q, 0) / arr.length });
  }
  // stretch each class's lightness over its ramp (use 5th..95th percentile)
  for (const a of [false, true]) {
    const ls = cells.filter(c => c.a === a).map(c => c.l).sort((p, q) => p - q); if (!ls.length) continue;
    const lo = ls[Math.floor(ls.length * 0.05)], hi = ls[Math.floor(ls.length * 0.95)] + 1e-6, ramp = a ? accent : body;
    cells.filter(c => c.a === a).forEach(c => { const t = Math.max(0, Math.min(1, (c.l - lo) / (hi - lo)));
      out.pset(c.x, c.y, ramp[P.band(t, ramp.length, c.x, c.y, 0.12)] ?? ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]); });
  }
  return out;
};

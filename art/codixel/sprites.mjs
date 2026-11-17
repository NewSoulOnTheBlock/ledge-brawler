// Five Blades: small things drawn in code, redone with the Codixel core (~/.claude/skills/codixel).
// The item and relic icons, the crate, the iron ball, the key piece and the clue. Light comes from the top left.
// `node art/codixel/sprites.mjs` writes art/codixel/preview/sprites.png (old next to new, 1x and zoomed).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const P = createRequire(import.meta.url)(path.join(os.homedir(), ".claude/skills/codixel/core/pixel.js"));

const LIGHT = (() => { const v = [-0.55, -0.65, 0.52], l = Math.hypot(...v); return v.map((c) => c / l); })();
const sm = (a, b, x) => { const t = P.clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Lambert light on a sphere at (cx, cy) of radius r, 0..1, with a little ambient. */
const sphere = (x, y, cx, cy, r) => {
  const nx = (x - cx) / r, ny = (y - cy) / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return P.clamp(0.08 + 0.92 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]));
};
/** Light across a round bar running along direction (ux, uy): `s` is the signed distance from its axis over its half width. */
const bar = (s, ux, uy) => {
  const nx = -uy * s, ny = ux * s, nz = Math.sqrt(Math.max(0, 1 - s * s));
  return P.clamp(0.1 + 0.9 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]));
};

/** Paint a w x h sprite: `part(x, y)` names the part at a pixel centre (or null), `value(part, x, y)` gives 0..1,
 *  `ramps[part]` the colours. Bands are flat; only the seam between two is dithered (P.band). */
function paint(w, h, part, value, ramps, fixed = {}) {
  const b = new P.Buf(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = part(x + 0.5, y + 0.5);
    if (!p) continue;
    if (fixed[p]) { b.pset(x, y, fixed[p]); continue; }
    const r = ramps[p];
    b.pset(x, y, r[P.band(value(p, x + 0.5, y + 0.5), r.length, x, y)]);
  }
  return b;
}
/** The finish every sprite gets: rim light on its own edge, then a two-colour outline from its own ramp. */
const finish = (b, ramp, lit = ramp[1], shade = ramp[0]) => P.selout(P.rimLight(b, ramp), lit, shade);

const ramp = (hue, o = {}) => P.hueRamp(o.n ?? 6, { hue, sat: o.sat ?? 0.55, shift: o.shift ?? 40, light: o.light ?? [0.1, 0.74] });

// ---------------------------------------------------------------------------------------------- items (14x14 + outline)
const GLASS = ramp(205, { sat: 0.12, light: [0.32, 0.92], n: 5 });
const CORK = ramp(28, { sat: 0.45, light: [0.14, 0.58], n: 4 });
function flask(liquidHue, sat = 0.7) {
  const LIQ = ramp(liquidHue, { sat, light: [0.14, 0.7] });
  const cx = 6.5, cy = 8.8, r = 4.9, top = 6.4;
  const part = (x, y) => {
    if (y < 2 && x > 4.6 && x < 8.4) return "cork";
    if (y >= 2 && y < 5 && x > 4.6 && x < 8.4) return "neck";
    const d = Math.hypot(x - cx, y - cy);
    if (d > r) return null;
    if (Math.hypot(x - (cx - 2), y - (cy - 2)) < 1.1) return "shine";
    return y > top ? "liquid" : "glass";
  };
  const value = (p, x, y) => {
    if (p === "cork") return 0.35 + (y < 1 ? 0.45 : 0) - (x > 7 ? 0.3 : 0);
    if (p === "neck") return x < 6 ? 0.85 : x > 7.5 ? 0.35 : 0.6;
    if (p === "glass") return 0.35 + sphere(x, y, cx, cy, r) * 0.55;
    // The liquid is lit as the body of the flask, a band lighter just under its surface.
    return sphere(x, y, cx, cy, r) * 0.9 + (y < top + 1.2 ? 0.15 : 0);
  };
  const body = paint(14, 14, part, value, { cork: CORK, neck: GLASS, glass: GLASS, liquid: LIQ }, { shine: GLASS[4] });
  return finish(body, LIQ, LIQ[2], LIQ[0]);
}
function bomb() {
  const IRON = ramp(228, { sat: 0.14, light: [0.07, 0.62] }), FUSE = ramp(30, { sat: 0.35, light: [0.18, 0.5], n: 3 });
  const cx = 6.2, cy = 8.3, r = 5.2;
  const fuse = [[9.5, 3.5], [10.5, 2.5], [11.5, 1.5]];
  const part = (x, y) => {
    if (Math.abs(x - 12.5) < 0.6 && Math.abs(y - 0.5) < 0.6) return "spark";
    if ((Math.abs(x - 13.5) < 0.6 && Math.abs(y - 0.5) < 0.6) || (Math.abs(x - 12.5) < 0.6 && Math.abs(y - 1.5) < 0.6)) return "ember";
    if (fuse.some(([a, b]) => Math.abs(x - a) < 0.6 && Math.abs(y - b) < 0.6)) return "fuse";
    if (x > 7.6 && x < 10.4 && y > 3.6 && y < 5.4) return "cap";
    return Math.hypot(x - cx, y - cy) <= r ? "iron" : null;
  };
  const value = (p, x, y) => p === "cap" ? (y < 4.5 ? 0.75 : 0.4) : p === "fuse" ? 0.6 : sphere(x, y, cx, cy, r);
  const b = paint(14, 14, part, value, { iron: IRON, cap: IRON, fuse: FUSE }, { spark: [255, 246, 196], ember: [255, 138, 40] });
  return finish(b, IRON);
}
function ward() {
  // A violet stone in a gold claw setting, hung from a ring.
  const STONE = ramp(272, { sat: 0.55, light: [0.12, 0.8] }), GOLD = ramp(44, { sat: 0.7, light: [0.16, 0.72], n: 5 });
  const cx = 6.5, cy = 8, part = (x, y) => {
    const dx = Math.abs(x - cx), dy = y - cy;
    if (y < 3 && Math.hypot(x - cx, y - 1.5) < 1.6 && Math.hypot(x - cx, y - 1.5) > 0.5) return "ring";
    const inStone = dx / 4.2 + Math.abs(dy) / 5.2 <= 1;
    const inSet = dx / 5.2 + Math.abs(dy) / 6.2 <= 1 && y > 2.5;
    return inStone ? "stone" : inSet ? "gold" : null;
  };
  const value = (p, x, y) => {
    if (p === "ring") return x < cx ? 0.8 : 0.4;
    if (p === "gold") return (x < cx ? 0.65 : 0.3) + (y < cy ? 0.25 : 0);
    // Four facets of a cut stone, the top-left one facing the light; the table in the middle a step brighter.
    const left = x < cx, upper = y < cy, table = Math.abs(x - cx) / 1.6 + Math.abs(y - cy) / 2 < 1;
    return table ? 0.82 : left && upper ? 0.98 : left || upper ? 0.5 : 0.18;
  };
  return finish(paint(14, 14, part, value, { stone: STONE, gold: GOLD, ring: GOLD }), GOLD);
}
function scroll() {
  const PAPER = ramp(40, { sat: 0.38, light: [0.3, 0.88] }), MARK = ramp(268, { sat: 0.6, light: [0.2, 0.62], n: 3 });
  const rollTop = (y) => y >= 1 && y < 4, rollBot = (y) => y >= 10 && y < 13;
  // The lightning mark, a pixel-perfect zigzag (P.pixelPerfect on a 1 px mask).
  const zig = new Uint8Array(14 * 14), at = (x, y) => (zig[y * 14 + x] = 1);
  [[8, 4], [7, 5], [6, 6], [7, 6], [8, 6], [7, 7], [6, 8], [5, 9]].forEach(([x, y]) => at(x, y));
  const mark = P.pixelPerfect(zig, 14, 14);
  const part = (x, y) => {
    const px = Math.floor(x), py = Math.floor(y);
    if (rollTop(y) && x > 1 && x < 13) return "roll";
    if (rollBot(y) && x > 1 && x < 13) return "roll";
    if (y >= 4 && y < 10 && x > 2.5 && x < 11.5) return mark[py * 14 + px] ? "mark" : "sheet";
    return null;
  };
  const value = (p, x, y) => {
    if (p === "roll") { const c = rollTop(y) ? 2.5 : 11.5; return bar((y - c) / 1.5, 1, 0) * 0.85 + (x < 4 ? 0.1 : 0); }
    if (p === "mark") return 0.7;
    // A flat sheet: lighter towards the top roll, a step darker in the shadow under it.
    return y < 5 ? 0.35 : 0.72 - (y - 5) * 0.05;
  };
  return finish(paint(14, 14, part, value, { roll: PAPER, sheet: PAPER, mark: MARK }), PAPER, PAPER[2], ramp(30, { sat: 0.4, light: [0.12, 0.3], n: 2 })[0]);
}

// ---------------------------------------------------------------------------------------------- relics (14x14 + outline)
function puzzle() {
  const GOLD = ramp(43, { sat: 0.72, light: [0.14, 0.78] });
  const part = (x, y) => {
    const body = x > 1 && x < 9.5 && y > 5 && y < 13;
    const knobTop = Math.hypot(x - 5.25, y - 2.4) < 2.2 || (x > 4.25 && x < 6.25 && y > 3 && y < 5.5);
    const knobRight = Math.hypot(x - 11.6, y - 9) < 2.2 || (x > 9 && x < 10.5 && y > 8 && y < 10);
    return body || knobTop || knobRight ? "gold" : null;
  };
  // A raised piece: a bevel facing the light along its top and left, in shade along its bottom and right.
  const edge = (x, y, dx, dy) => { for (let k = 1; k <= 2; k++) if (!part(x + dx * k, y + dy * k)) return k; return 3; };
  const value = (p, x, y) => {
    const up = edge(x, y, 0, -1), left = edge(x, y, -1, 0), down = edge(x, y, 0, 1), right = edge(x, y, 1, 0);
    const lit = (up < 2 || left < 2) ? 0.95 : 0, dark = (down < 2 || right < 2) ? 0.2 : 0;
    return lit || dark || 0.58;
  };
  return finish(paint(14, 14, part, value, { gold: GOLD }), GOLD);
}
function soul() {
  const V = ramp(266, { sat: 0.6, light: [0.12, 0.84] });
  // A shard: a tall kite leaning right, split along its ridge into a lit face and a face in shade.
  const pts = [[6.5, 0.5], [10.5, 5], [7.5, 13.5], [3, 6]];
  const inside = (x, y) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const part = (x, y) => (inside(x, y) ? "v" : null);
  const value = (p, x, y) => {
    const ridge = 6.5 + (y - 0.5) * (1 / 13); // from the top tip down to the bottom tip
    const leftFace = x < ridge;
    const upper = y < 6 - (x - 3) * 0.1;
    return leftFace ? (upper ? 0.96 : 0.62) : upper ? 0.42 : 0.16;
  };
  return finish(paint(14, 14, part, value, { v: V }), V);
}
function thread() {
  // A spool of shining thread with its loose end lifting away: wooden flanges, the wound thread lit as a cylinder.
  const C = ramp(186, { sat: 0.7, light: [0.16, 0.9] }), WOOD = ramp(28, { sat: 0.42, light: [0.14, 0.6], n: 4 });
  const strand = new Uint8Array(14 * 14);
  [[10, 6], [11, 5], [11, 4], [12, 3], [12, 2], [13, 1]].forEach(([x, y]) => (strand[y * 14 + x] = 1));
  const loose = P.pixelPerfect(strand, 14, 14);
  const part = (x, y) => {
    const px = Math.floor(x), py = Math.floor(y);
    if (loose[py * 14 + px]) return "strand";
    if ((y >= 2 && y < 4) || (y >= 11 && y < 13)) return x > 1 && x < 11 ? "wood" : null;
    if (y >= 4 && y < 11 && x > 2 && x < 10) return "thread";
    return null;
  };
  const value = (p, x, y) => {
    if (p === "strand") return 0.95;
    if (p === "wood") return bar((x - 6) / 5, 0, 1) * 0.8 + (y < 3 || (y >= 11 && y < 12) ? 0.2 : -0.05);
    // Wound rows: every other row a step darker, the whole lit as a cylinder standing up.
    return bar((x - 6) / 4, 0, 1) * 0.85 + (Math.floor(y) % 2 ? -0.12 : 0.08);
  };
  const b = paint(14, 14, part, value, { wood: WOOD, thread: C, strand: C });
  b.pset(13, 0, [255, 255, 255]);
  return finish(b, C, C[2], C[0]);
}

// ---------------------------------------------------------------------------------------------- props
function crate() {
  // 20 x 20: a frame of four boards, three planks inside with seams, a brace corner to corner, four nails.
  const W = ramp(27, { sat: 0.42, light: [0.1, 0.6], n: 6, shift: 30 });
  const S = 20, frame = 3;
  const brace = (x, y) => Math.abs((x - frame) - (y - frame)) < 1.6 && x > frame && y > frame && x < S - frame && y < S - frame;
  const part = (x, y) => {
    const onFrame = x < frame || y < frame || x > S - frame || y > S - frame;
    if (onFrame) {
      const corner = [[1.5, 1.5], [S - 1.5, 1.5], [1.5, S - 1.5], [S - 1.5, S - 1.5]].some(([a, b]) => Math.abs(x - a) < 0.6 && Math.abs(y - b) < 0.6);
      return corner ? "nail" : "frame";
    }
    if (brace(x, y)) return "brace";
    return Math.abs(((x - frame) % 4.67) ) < 0.7 && x > frame + 1 ? "seam" : "plank";
  };
  const grain = (x, y) => (P.fbm(x * 0.9, y * 0.14, 3, 7) - 0.5) * 0.28;
  const value = (p, x, y) => {
    if (p === "seam") return 0.06;
    if (p === "frame") {
      // Each board is lit on its outer top/left edge; the bottom and right boards sit in shade.
      const top = y < frame, left = x < frame, bottom = y > S - frame, right = x > S - frame;
      const base = top ? 0.78 : left ? 0.7 : bottom ? 0.4 : right ? 0.46 : 0.6;
      const lip = (top && y < 1) || (left && x < 1) ? 0.15 : 0;
      return base + lip + grain(x, y) * 0.6;
    }
    if (p === "brace") { const s = ((x - frame) - (y - frame)) / 1.6; return 0.55 + (s < 0 ? -0.18 : 0.12) + grain(x * 0.3, y) * 0.4; }
    // Planks sit a little back: darker under the top board and beside the left one (its shadow).
    const shadow = (y < frame + 1.2 || x < frame + 1.2) ? -0.18 : 0;
    return 0.48 + shadow + grain(x, y);
  };
  return finish(paint(S, S, part, value, { frame: W, plank: W, brace: W, seam: W }, { nail: [214, 204, 186] }), W, W[1], W[0]);
}
function ironBall() {
  const I = ramp(222, { sat: 0.12, light: [0.07, 0.66], n: 6 });
  const r = 9.3, c = 9.5;
  const part = (x, y) => (Math.hypot(x - c, y - c) <= r ? (Math.abs(y - c - 0.5) < 1.2 ? "band" : "iron") : null);
  const value = (p, x, y) => {
    const v = sphere(x, y, c, c, r);
    if (p === "band") return v * 0.8 + (y < c + 0.5 ? 0.12 : -0.05);
    const spec = Math.hypot(x - (c - 3.4), y - (c - 3.8)) < 1.3 ? 0.25 : 0;
    return v + spec;
  };
  return finish(paint(19, 19, part, value, { iron: I, band: I }), I);
}
function keyPiece() {
  // The spirit key, in the mint of the doorway's glow: a ring bow, a shaft, two teeth.
  const K = ramp(160, { sat: 0.62, light: [0.14, 0.82] });
  const cx = 5, cy = 4.5;
  const part = (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 4.1 && d >= 1.7) return "bow";
    if (x > 4 && x < 6.1 && y > 8 && y < 17) return "shaft";
    if (y > 12 && y < 14 && x >= 6 && x < 9) return "tooth";
    if (y > 15 && y < 17 && x >= 6 && x < 8) return "tooth";
    return null;
  };
  const value = (p, x, y) => {
    if (p === "bow") { const d = Math.hypot(x - cx, y - cy), nx = (x - cx) / d, ny = (y - cy) / d, s = (d - 2.9) / 1.2; return bar(s, -ny, nx) * 0.7 + Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1])) * 0.0 + 0.15; }
    if (p === "shaft") return x < 5 ? 0.9 : 0.4;
    return y < 13 || (y > 15 && y < 16) ? 0.7 : 0.35;
  };
  return finish(paint(10, 18, part, value, { bow: K, shaft: K, tooth: K }), K);
}
function clue() {
  // A cut gold diamond, four facets about a small table.
  const G = ramp(45, { sat: 0.78, light: [0.15, 0.82] });
  const c = 5.5, part = (x, y) => (Math.abs(x - c) + Math.abs(y - c) <= 5.2 ? "g" : null);
  const value = (p, x, y) => {
    if (Math.abs(x - c) + Math.abs(y - c) < 1.6) return 0.86;
    const left = x < c, up = y < c;
    return left && up ? 1 : left || up ? 0.55 : 0.2;
  };
  return finish(paint(11, 11, part, value, { g: G }), G);
}

// ---------------------------------------------------------------------------------------------- the old 8x8 icons, for comparison
const OLD = {
  flask: ["...cc...", "...kk...", "..kggk..", ".kffffk.", "kffwfffk", "kffffffk", ".kffffk.", "..kkkk.."],
  draught: { k: "#1a1014", c: "#8a5a2b", g: "#cfd8dc", f: "#d63c28", w: "#ffd6cc" },
  vial: { k: "#1a1014", c: "#8a5a2b", g: "#cfd8dc", f: "#e0b84a", w: "#fff3c4" },
  haste: { k: "#1a1014", c: "#8a5a2b", g: "#cfd8dc", f: "#36c5f0", w: "#d6f6ff" },
  bomb: [["......y.", ".....o..", "..kkkk..", ".kddddk.", "kdwddddk", "kddddddk", ".kddddk.", "..kkkk.."], { k: "#0d0d10", d: "#3a3a44", w: "#9a9aa8", o: "#ff7a1a", y: "#ffe066" }],
  ward: [["...kk...", "..kssk..", ".kswssk.", "kssssssk", "kssssssk", ".kssssk.", "..kssk..", "...kk..."], { k: "#1a1430", s: "#9f7aea", w: "#f3e8ff" }],
  scroll: [["kkkkkkk.", "kpppppk.", ".kplpk..", ".kpppk..", ".kplpk..", ".kpppppk", "..kkkkkk", "........"], { k: "#2a1d10", p: "#f1e3c0", l: "#7b3fe4" }],
  puzzle: [["..kk....", ".kggk...", "kkggkkk.", "kgggggk.", "kgwgggkk", "kggggggk", "kgggggk.", "kkkkkkk."], { k: "#2a1a08", g: "#e0b84a", w: "#fff3c4" }],
  soul: [["...kk...", "..kppk..", ".kpwppk.", ".kppppk.", "kpppppk.", ".kpppk..", "..kpk...", "...k...."], { k: "#1a0f2a", p: "#9b6bff", w: "#efe2ff" }],
  thread: [["......kw", ".....kc.", "....kc..", "..kkc...", ".kc..ck.", "kc.cc.ck", ".kc..ck.", "..kkkk.."], { k: "#0c2a30", c: "#8ff7ff", w: "#ffffff" }],
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function fromRows(rows, colours) {
  const b = new P.Buf(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") b.pset(x, y, hex(colours[c])); }));
  return b;
}
const old = (id) => (OLD[id] && Array.isArray(OLD[id]) ? fromRows(...OLD[id]) : fromRows(OLD.flask, OLD[id]));

export const SPRITES = {
  draught: () => flask(4, 0.72), vial: () => flask(42, 0.75), haste: () => flask(196, 0.7),
  bomb, ward, scroll, puzzle, soul, thread, crate, ball: ironBall, key: keyPiece, clue,
};

// ---------------------------------------------------------------------------------------------- the preview
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("sprites.mjs")) {
  const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "preview");
  mkdirSync(out, { recursive: true });
  const on = (b, bg = [16, 20, 26]) => { const o = new P.Buf(b.w + 4, b.h + 4); o.clear(bg); o.sprite ? null : null; for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const c = b.px[y * b.w + x]; if (c >>> 24) o.px[(y + 2) * o.w + x + 2] = c; } return o; };
  const items = [];
  for (const id of ["draught", "vial", "haste", "bomb", "ward", "scroll", "puzzle", "soul", "thread"]) {
    const nu = SPRITES[id]();
    items.push({ buf: on(old(id)), label: "OLD", scale: 8 }, { buf: on(nu), label: id.toUpperCase(), scale: 4 }, { buf: on(nu), label: "1X", scale: 1 }, { buf: on(nu), label: "2X", scale: 2 });
  }
  for (const id of ["crate", "ball", "key", "clue"]) {
    const nu = SPRITES[id]();
    items.push({ buf: on(nu), label: id.toUpperCase(), scale: 4 }, { buf: on(nu), label: "1X", scale: 1 }, { buf: on(nu), label: "2X", scale: 2 }, { buf: on(nu, [70, 86, 70]), label: "ON GRASS", scale: 2 });
  }
  P.save(P.sheet(items, { cols: 8, gap: 10 }), path.join(out, "sprites.png"));
  for (const id of Object.keys(SPRITES)) {
    const b = SPRITES[id](), e = P.edgeCheck(b), cc = P.colorCount(b);
    console.log(id.padEnd(8), `${b.w}x${b.h}`, "colours", cc.length, "top share", (cc[0]?.share * 100 || 0).toFixed(0) + "%", "nubs", e.nubs.length, "strips", e.strips.length, "holes", e.holes.length);
  }
  console.log("wrote", path.join(out, "sprites.png"));
}

// ---------------------------------------------------------------------------------------------- the game's copy
// `node art/codixel/sprites.mjs game` also writes apps/app/src/game/sprites.ts: each sprite as rows of letters and a
// colour for each letter, the format the game already draws icons in (render.ts `drawItem`, Campaign.tsx `RelicIcon`).
if (process.argv[2] === "game") {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "../..");
  const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const toHex = (c) => "#" + P.unpack(c).map((v) => v.toString(16).padStart(2, "0")).join("");
  const entries = Object.keys(SPRITES).map((id) => {
    const b = SPRITES[id](), colours = {}, seen = new Map();
    const rows = Array.from({ length: b.h }, (_, y) => Array.from({ length: b.w }, (_, x) => {
      const c = b.px[y * b.w + x];
      if (!(c >>> 24)) return ".";
      const key = c & 0xffffff;
      if (!seen.has(key)) { const l = LETTERS[seen.size]; seen.set(key, l); colours[l] = toHex(c); }
      return seen.get(key);
    }).join(""));
    return `  ${id}: { icon: ${JSON.stringify(rows)}, colours: ${JSON.stringify(colours)} },`;
  });
  const file = path.join(root, "apps/app/src/game/sprites.ts");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(file, `// Made by art/codixel/sprites.mjs (Codixel core); rebuild with \`node art/codixel/sprites.mjs game\`, do not edit.
/** A small picture: rows of letters, a colour for each letter, a dot for none. */
export interface Sprite { icon: string[]; colours: Record<string, string> }
export const SPRITES = {
${entries.join("\n")}
} satisfies Record<string, Sprite>;
`);
  console.log("wrote", file);
}

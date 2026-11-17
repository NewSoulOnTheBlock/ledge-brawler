// Five Blades: the Seekers, 333 collectible portraits of the game's fighter (the Hooded Seeker, character art by
// Primitive Pixels), drawn with the Codixel core as small gallery prints: one figure, one composition in a few flat
// colours, a mount with a hairline and an edition number. Every token is the same Seeker; his traits change.
//
//   node art/nft/make.mjs           writes art/nft/preview.png: a sheet of sample tokens to approve
//   node art/nft/make.mjs all       writes art/nft/out/: images/<n>.png, metadata/<n>.json, rarity.csv, traits.json, collection.png
//
// The draw is seeded, so the same 333 come out on every run.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const P = createRequire(import.meta.url)(path.join(os.homedir(), ".claude/skills/codixel/core/pixel.js"));

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const SEEKER = path.resolve(here, "../../apps/app/src/game/seeker/Void");
export const SUPPLY = 333, SIZE = 56, SCALE = 18, SEED = 0x5b1ade5;
const COLLECTION = "Five Blades: Seekers";

// ------------------------------------------------------------------------------------------------ colour helpers
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));

// ------------------------------------------------------------------------------------------------ the traits
// Each trait value: [name, weight, data]. A higher weight is more common.
const T = {
  background: [
    ["Rising Sun", 12], ["Pale Moon", 11], ["Misty Peaks", 11], ["Ink Wash", 10], ["Bauhaus", 10], ["Dusk", 10],
    ["Niche", 9], ["Monolith", 8], ["Eclipse", 7], ["Kintsugi", 5], ["Firstborn", 0],
  ],
  // The print's mount: its card, and the hairline around the picture.
  frame: [
    ["Ivory & Gold", 26, { mat: [236, 228, 210], line: [184, 140, 52] }], ["Ivory & Silver", 22, { mat: [236, 228, 210], line: [140, 144, 152] }],
    ["Ink & Gold", 20, { mat: [20, 19, 22], line: [196, 152, 60] }], ["Ink & Silver", 16, { mat: [20, 19, 22], line: [168, 172, 180] }],
    ["Bone & Oxblood", 10, { mat: [222, 210, 190], line: [112, 30, 34] }], ["Onyx & Platinum", 6, { mat: [8, 8, 10], line: [228, 232, 240] }],
    ["Celestial", 0, { mat: [12, 10, 8], line: [232, 186, 74], double: true }],
  ],
  cloak: [
    ["Obsidian", 14, "#17171c"], ["Crimson", 12, "#a3161a"], ["Sapphire", 12, "#1d4fb8"], ["Amethyst", 11, "#6a2bb8"],
    ["Emerald", 11, "#1f8a45"], ["Midnight", 10, "#1b2147"], ["Ash", 9, "#6b6b70"], ["Rose", 7, "#c2577a"],
    ["Ivory", 6, "#e8e0cc"], ["Void", 5, null], ["Royal Gold", 3, "#c99a1e"], ["Pearl", 2, "#f4f1ff"],
  ],
  eyes: [
    ["Gold", 14, "#f2b200"], ["Ember", 12, "#ff6a1a"], ["Cyan", 12, "#36c5f0"], ["Violet", 11, "#b26bff"],
    ["Jade", 10, "#3ddc84"], ["Blood", 7, "#e01b24"], ["Rose", 6, "#ff7ab8"], ["Divine White", 3, "#ffffff"],
  ],
  // A stance is a frame of one of his animations: file, frame size, frame, and where his feet are in it.
  stance: [
    ["Ready", 34, { file: "Idle_30x30_24f", w: 30, h: 30, frame: 0, feet: [15, 28] }],
    ["Channel", 24, { file: "Charge_34x38_8f", w: 34, h: 38, frame: 5, feet: [17, 36] }],
    ["Invoke", 24, { file: "Cast_40x40_11f", w: 40, h: 40, frame: 6, feet: [19, 33] }],
    ["Strike", 18, { file: "Attack1_90x50_8f", w: 90, h: 50, frame: 5, feet: [16, 38] }],
  ],
  // The five blades of the story. Each lends the print its one accent colour: the sun, the ring, the crack.
  blade: [
    ["Ink", 20, [214, 162, 44]], ["Fire", 20, [204, 66, 42]], ["Water", 20, [46, 128, 192]],
    ["Volt", 20, [130, 82, 204]], ["Leaf", 20, [72, 152, 84]],
  ],
  aura: [["None", 46], ["Glow", 22], ["Halo", 18], ["Motes", 14]],
};
const ORDER = ["background", "frame", "cloak", "eyes", "stance", "blade", "aura"];

// ------------------------------------------------------------------------------------------------ the Seeker
const sheets = new Map();
function seeker(stance, cloakHex, eyesHex) {
  const s = stance;
  if (!sheets.has(s.file)) sheets.set(s.file, P.load(path.join(SEEKER, `Seeker_Void_${s.file}.png`)));
  const frame = P.crop(sheets.get(s.file), s.frame * s.w, 0, s.w, s.h);
  // The game's own recolouring (figure.ts, `sheet`): the Void palette's purples become the cloak, its greens the glow.
  let cloak = cloakHex ? hex(cloakHex) : null;
  const glow = hex(eyesHex);
  if (cloak && Math.max(...cloak) < 60) cloak = [62, 62, 68];
  for (let i = 0; i < frame.px.length; i++) {
    const c = frame.px[i];
    if (!(c >>> 24)) continue;
    const [r, g, b] = P.unpack(c), out = [r, g, b];
    if (cloak && b > g + 10 && r > g) {
      const light = Math.max(r, g, b) / 149, sh = 0.3 + 0.8 * Math.min(1, light), white = Math.max(0, light - 1);
      for (let k = 0; k < 3; k++) out[k] = Math.min(255, cloak[k] * sh + (255 - cloak[k] * sh) * white);
    } else if (g > r + 15 && g >= b) {
      const light = g / 255, white = Math.max(0, (r - 100) / 155);
      for (let k = 0; k < 3; k++) out[k] = Math.min(255, glow[k] * Math.min(1, light / 0.75) * (1 - white) + 255 * white);
    }
    frame.px[i] = P.col(out);
  }
  return frame;
}

// ------------------------------------------------------------------------------------------------ the compositions
// The picture sits in the mount's window; he stands at (CX, FEET). Each composition is a few flat colours and one
// idea, with `acc` (the blade's colour) as its only accent. `r` is the token's own random stream.
const CX = 28, FEET = 40, WIN = { x0: 4, y0: 4, x1: 52, y1: 46 };
const each = (fn) => { for (let y = WIN.y0; y < WIN.y1; y++) for (let x = WIN.x0; x < WIN.x1; x++) fn(x, y); };
const disc = (x, y, cx, cy, rad) => Math.hypot(x - cx, y - cy) < rad;
const BACKGROUNDS = {
  "Rising Sun"(b, acc) {
    // Paper, and one great sun behind him.
    each((x, y) => b.pset(x, y, disc(x, y, CX, 24, 13) ? acc : [234, 224, 202]));
    return { ground: [196, 184, 160] };
  },
  "Pale Moon"(b, acc) {
    // A night of three blues, a small moon, and still water he stands on.
    const sky = [[22, 28, 48], [30, 40, 66], [42, 56, 88]];
    each((x, y) => {
      let c = y >= FEET ? [16, 20, 36] : sky[P.band((y - WIN.y0) / (FEET - WIN.y0), 3, x, y, 0.3)];
      if (disc(x, y, 15, 14, 4.5)) c = [230, 226, 206];
      else if (y > FEET && y % 2 && Math.abs(x - 15) < 4 - (y - FEET) * 0.5) c = [92, 96, 112];
      b.pset(x, y, c);
    });
    return { reflect: true };
  },
  "Misty Peaks"(b, acc, r) {
    // Three ridges fading into the mist, a small sun in the accent.
    const s = r() * 50, ridge = [[196, 204, 206], [150, 164, 170], [98, 116, 124]];
    each((x, y) => {
      let c = disc(x, y, 38, 14, 3) ? acc : [226, 228, 222];
      for (let k = 0; k < 3; k++) if (y > 22 + k * 6 + P.fbm(x * 0.06 + s + k * 9, k, 3) * 14 - 7) c = ridge[k];
      b.pset(x, y, c);
    });
    return { ground: [70, 86, 94] };
  },
  "Ink Wash"(b, acc, r) {
    // Rice paper and one sweep of sumi ink across it.
    const s = r() * 40, tilt = r() < 0.5 ? 1 : -1;
    each((x, y) => {
      const d = (y - 30 - tilt * (x - CX) * 0.35) / 9 + (P.fbm(x * 0.12 + s, y * 0.5, 3) - 0.5) * 0.9;
      const ink = d > -1 && d < 1 ? 1 - Math.abs(d) : 0;
      b.pset(x, y, ink > 0.55 ? [40, 38, 40] : ink > 0.25 ? ((x + y) % 2 ? [92, 88, 88] : [168, 162, 156]) : [238, 232, 220]);
    });
    // A seal, stamped in the corner as a painter signs.
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (!((i === 1 || i === 2) && (j === 1 || j === 2)) || (i === 1 && j === 2)) b.pset(45 + i, 38 + j, acc);
    return { ground: [200, 192, 180] };
  },
  Bauhaus(b, acc) {
    // Ochre, a quarter circle and a bar.
    each((x, y) => {
      let c = [216, 170, 72];
      if (disc(x, y, WIN.x0, WIN.y1, 22)) c = [30, 42, 72];
      if (x >= 40 && x < 44 && y < 34) c = acc;
      b.pset(x, y, c);
    });
    return { ground: [176, 132, 50] };
  },
  Dusk(b, acc) {
    const bands = [[52, 26, 58], [118, 46, 68], [192, 92, 74], [232, 164, 104]];
    each((x, y) => b.pset(x, y, y >= FEET ? [36, 18, 40] : bands[P.band((y - WIN.y0) / (FEET - WIN.y0), 4, x, y, 0.3)]));
    return {};
  },
  Niche(b, acc) {
    // A plaster wall and the arched niche he stands in.
    each((x, y) => {
      const inArch = y >= 20 ? Math.abs(x - CX) < 12 : disc(x, y, CX, 20, 12);
      b.pset(x, y, inArch ? [140, 70, 50] : y >= FEET ? [176, 96, 70] : [204, 120, 86]);
    });
    return { ground: [110, 52, 38] };
  },
  Monolith(b, acc) {
    // Sand, a pale sky, and a dark slab rising behind him.
    each((x, y) => {
      let c = y >= FEET ? [196, 168, 124] : mix([238, 214, 170], [212, 188, 150], (y - WIN.y0) / 36);
      if (Math.abs(x - CX - 1) <= 6 && y >= 9 && y < FEET) c = x - CX - 1 === -6 ? [70, 66, 66] : [26, 24, 26];
      b.pset(x, y, c);
    });
    return { ground: [150, 124, 86] };
  },
  Eclipse(b, acc) {
    each((x, y) => {
      const d = Math.hypot(x - CX, y - 22);
      b.pset(x, y, d < 12 ? [4, 4, 6] : d < 13 ? [250, 240, 220] : d < 15 && (x + y) % 2 ? acc : [12, 12, 16]);
    });
    return {};
  },
  Kintsugi(b, acc, r) {
    // Matte black, broken once and mended with the accent.
    each((x, y) => b.pset(x, y, [24, 23, 26]));
    let x = WIN.x0, y = 12 + r() * 10;
    while (x < WIN.x1) { b.pset(x, y, acc); if (r() < 0.35) { y += r() < 0.5 ? 1 : -1; b.pset(x, y, acc); } x++; }
    return { ground: [12, 12, 14] };
  },
  Firstborn(b, acc) {
    // The 1/1s: black, the god's great sun in its colour, and a gold ring around it.
    each((x, y) => {
      const d = Math.hypot(x - CX, y - 26);
      b.pset(x, y, d < 15 ? acc : d < 16 ? [232, 186, 74] : [10, 9, 8]);
    });
    return { ground: [40, 32, 18] };
  },
};

// ------------------------------------------------------------------------------------------------ one token
/** The ground and the figure of a token, before any aura, shadow or mount. */
function scene(tok) {
  const t = tok.traits, data = (k) => tok.data[k], acc = data("blade"), b = new P.Buf(SIZE, SIZE);
  const look = BACKGROUNDS[t.background](b, acc, P.rng(tok.seed ?? 1));
  const stance = data("stance"), fig = bodyOf(seeker(stance, data("cloak"), data("eyes")));
  const shift = t.stance === "Strike" ? -6 : 0;
  return { b, look, stance, fig, shift, fx: CX - stance.feet[0] + shift, fy: FEET - stance.feet[1] };
}

function render(tok) {
  const t = tok.traits, data = (k) => tok.data[k], r = P.rng(tok.seed), acc = data("blade");
  const b = new P.Buf(SIZE, SIZE);
  const look = BACKGROUNDS[t.background](b, acc, r);

  const stance = data("stance"), fig = bodyOf(seeker(stance, data("cloak"), data("eyes")));
  const shift = t.stance === "Strike" ? -6 : 0, fx = CX - stance.feet[0] + shift, fy = FEET - stance.feet[1];

  // Glow: a soft dithered light behind him in the blade's colour.
  if (t.aura === "Glow") each((x, y) => {
    const d = Math.hypot(x - CX - shift, (y - 31) * 1.2);
    if (d < 9 && (d < 6 || (x + y) % 2 === 0)) b.pset(x, y, mix(P.unpack(b.get(x, y)), acc, d < 6 ? 0.6 : 0.4));
  });

  if (look.ground) for (let x = -5; x <= 5; x++) b.pset(CX + shift + x, FEET, look.ground);
  // A soft shadow down and right, then him.
  for (let y = 0; y < fig.h; y++) for (let x = 0; x < fig.w; x++) {
    const sx = fx + x + 2, sy = fy + y + 2;
    if (fig.px[y * fig.w + x] >>> 24 && sx >= WIN.x0 && sx < WIN.x1 && sy >= WIN.y0 && sy < WIN.y1) b.pset(sx, sy, shade(P.unpack(b.get(sx, sy)), 0.7));
  }
  b.sprite(fig, fx, fy);

  // His reflection in still water, broken every other row.
  if (look.reflect) for (let j = 0; j < fig.h; j++) for (let i = 0; i < fig.w; i++) {
    const c = fig.px[j * fig.w + i], y = FEET + (FEET - (fy + j)) - 1;
    if (!(c >>> 24) || y < FEET || y >= WIN.y1 || y % 2) continue;
    b.pset(fx + i, y, mix(P.unpack(b.get(fx + i, y)), P.unpack(c), 0.35));
  }

  if (t.aura === "Halo") {
    const hx = CX + shift, hy = fy + stance.feet[1] - 30, gold = [232, 186, 74], dim = [150, 112, 40];
    for (let i = -3; i <= 3; i++) { b.pset(hx + i, hy - 1, Math.abs(i) < 3 ? gold : dim); if (Math.abs(i) < 3) b.pset(hx + i, hy + 1, dim); }
    b.pset(hx - 4, hy, dim); b.pset(hx + 4, hy, dim);
  }
  if (t.aura === "Motes") for (let i = 0; i < 4; i++) b.pset(CX + shift - 10 + r() * 20, 12 + r() * 22, mix(acc, [255, 255, 255], 0.5));

  mount(b, data("frame"), tok.id, acc);
  return b;
}

/** Only his body: the largest touching shape of the frame. A charge's loose sparks are dropped. */
function bodyOf(fig) {
  const keep = new Uint8Array(fig.w * fig.h), seen = new Uint8Array(fig.w * fig.h);
  let best = [];
  for (let i = 0; i < keep.length; i++) {
    if (seen[i] || !(fig.px[i] >>> 24)) continue;
    const part = [], stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(), x = j % fig.w, y = (j - x) / fig.w;
      part.push(j);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, k = ny * fig.w + nx;
        if (nx >= 0 && ny >= 0 && nx < fig.w && ny < fig.h && !seen[k] && fig.px[k] >>> 24) { seen[k] = 1; stack.push(k); }
      }
    }
    if (part.length > best.length) best = part;
  }
  for (const j of best) keep[j] = 1;
  return { w: fig.w, h: fig.h, px: fig.px.map((c, i) => (keep[i] ? c : 0)) };
}

const lum = ([r, g, b]) => (0.3 * r + 0.59 * g + 0.11 * b) / 255;

/** How well he stands apart from the print: the share of the ground hugging his silhouette (within two pixels) whose
 *  brightness is at least 0.25 from his cloak's. The draw keeps only pairings where most of it is. */
function separation(b, fig, fx, fy) {
  let sum = [0, 0, 0], n = 0;
  for (const c of fig.px) if (c >>> 24) { const p = P.unpack(c); if (Math.max(...p) > 40) { sum = sum.map((v, k) => v + p[k]); n++; } }
  const L = lum(sum.map((v) => v / n)), on = (x, y) => x >= 0 && y >= 0 && x < fig.w && y < fig.h && fig.px[y * fig.w + x] >>> 24;
  let near = 0, apart = 0;
  for (let y = -2; y < fig.h + 2; y++) for (let x = -2; x < fig.w + 2; x++) {
    const X = fx + x, Y = fy + y;
    if (on(x, y) || X < WIN.x0 || X >= WIN.x1 || Y < WIN.y0 || Y >= FEET) continue;
    let close = false;
    for (let dy = -2; dy <= 2 && !close; dy++) for (let dx = -2; dx <= 2; dx++) if (on(x + dx, y + dy)) { close = true; break; }
    if (!close) continue;
    near++;
    if (Math.abs(lum(P.unpack(b.get(X, Y))) - L) >= 0.25) apart++;
  }
  return apart / near;
}

/** The mount: a card around the picture (deeper at the foot, as prints are), a hairline, a sword laid along the foot
 *  with the blade's jewel in its pommel, and the edition number. */
function mount(b, m, id, acc) {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const inside = x >= WIN.x0 && x < WIN.x1 && y >= WIN.y0 && y < WIN.y1;
    const line = !inside && x >= WIN.x0 - 1 && x <= WIN.x1 && y >= WIN.y0 - 1 && y <= WIN.y1;
    const outer = m.double && (x === 1 || y === 1 || x === SIZE - 2 || y === SIZE - 2);
    if (!inside) b.pset(x, y, line || outer ? m.line : m.mat);
  }
  // The sword: pommel, grip, guard, then a two-row blade tapering to its point.
  const y = WIN.y1 + 4, x0 = WIN.x0, dark = mix(m.line, [0, 0, 0], 0.45), steel = mix(m.line, [255, 255, 255], 0.55), edge = mix(m.line, [255, 255, 255], 0.85);
  b.pset(x0, y, acc); b.pset(x0 + 1, y, acc); b.pset(x0, y - 1, mix(acc, [255, 255, 255], 0.5));
  for (let x = x0 + 2; x <= x0 + 5; x++) b.pset(x, y, x % 2 ? dark : m.line);
  for (let j = -2; j <= 2; j++) b.pset(x0 + 6, y + j, Math.abs(j) === 2 ? dark : m.line);
  for (let x = x0 + 7; x <= x0 + 30; x++) { b.pset(x, y - 1, edge); if (x < x0 + 30) b.pset(x, y, x < x0 + 29 ? steel : dark); }
  b.pset(x0 + 31, y - 1, steel);
  const label = String(id).padStart(3, "0");
  P.text(b, WIN.x1 - P.textWidth(label), WIN.y1 + 3, label, mix(m.mat, m.line, 0.4));
}

// ------------------------------------------------------------------------------------------------ the draw
function pick(list, r) {
  const total = list.reduce((s, v) => s + v[1], 0);
  let x = r() * total;
  for (const v of list) if ((x -= v[1]) < 0) return v;
  return list[list.length - 1];
}

/** The five 1/1s: each Firstborn god's own Seeker, a silhouette before the god's sun, in the Celestial mount. */
const FIRSTBORN = [
  { blade: "Ink", eyes: "Gold", title: "The Firstborn of Ink" }, { blade: "Fire", eyes: "Ember", title: "The Firstborn of Fire" },
  { blade: "Water", eyes: "Cyan", title: "The Firstborn of Water" }, { blade: "Volt", eyes: "Violet", title: "The Firstborn of Volt" },
  { blade: "Leaf", eyes: "Jade", title: "The Firstborn of Leaf" },
];

export function draw() {
  const r = P.rng(SEED), seen = new Set(), tokens = [];
  const make = (traits, extra = {}) => {
    const data = Object.fromEntries(ORDER.map((k) => [k, T[k].find((v) => v[0] === traits[k])[2]]));
    return { traits, data, ...extra };
  };
  for (const f of FIRSTBORN) {
    const traits = { background: "Firstborn", frame: "Celestial", cloak: "Obsidian", eyes: f.eyes, stance: "Invoke", blade: f.blade, aura: "Halo" };
    seen.add(ORDER.map((k) => traits[k]).join("|"));
    tokens.push(make(traits, { oneOfOne: f.title }));
  }
  while (tokens.length < SUPPLY) {
    const traits = Object.fromEntries(ORDER.map((k) => [k, pick(T[k], r)[0]]));
    const dna = ORDER.map((k) => traits[k]).join("|");
    if (seen.has(dna)) continue;
    const cand = make(traits), sc = scene(cand);
    if (separation(sc.b, sc.fig, sc.fx, sc.fy) < 0.7) continue;
    seen.add(dna);
    tokens.push(make(traits));
  }
  // Shuffle, so the 1/1s land at random numbers, then number from 1.
  for (let i = tokens.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tokens[i], tokens[j]] = [tokens[j], tokens[i]]; }
  tokens.forEach((t, i) => { t.id = i + 1; t.seed = (SEED ^ Math.imul(i + 1, 2654435761)) >>> 0; });
  return tokens;
}

/** Rarity: each trait's share of the supply; a token's score is the sum of 1/share over its traits. */
function rarity(tokens) {
  const count = {};
  for (const t of tokens) for (const k of ORDER) count[k + t.traits[k]] = (count[k + t.traits[k]] ?? 0) + 1;
  for (const t of tokens) t.score = ORDER.reduce((s, k) => s + tokens.length / count[k + t.traits[k]], 0) + (t.oneOfOne ? 1000 : 0);
  [...tokens].sort((a, b) => b.score - a.score).forEach((t, i) => (t.rank = i + 1));
  return count;
}

function metadata(t) {
  return {
    name: t.oneOfOne ? `${t.oneOfOne} #${t.id}` : `Seeker #${t.id}`,
    description: t.oneOfOne
      ? `${t.oneOfOne}: one of five. A god sealed in a blade, and the Seeker who carries it. From Five Blades.`
      : "One of 333 Seekers from Five Blades: five Firstborn gods, sealed in five blades, carried by those who seek them.",
    image: `ipfs://__IMAGES_CID__/${t.id}.png`,
    external_url: "https://ledge-brawler.vercel.app",
    attributes: [
      ...ORDER.map((k) => ({ trait_type: k[0].toUpperCase() + k.slice(1), value: t.traits[k] })),
      ...(t.oneOfOne ? [{ trait_type: "Edition", value: "1 of 1" }] : []),
    ],
  };
}

// ------------------------------------------------------------------------------------------------ run
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.join(here, "make.mjs");
if (isMain) {
  const tokens = draw(), count = rarity(tokens);
  if (process.argv[2] === "all") {
    const out = path.join(here, "out");
    for (const d of ["images", "metadata"]) mkdirSync(path.join(out, d), { recursive: true });
    for (const t of tokens) {
      P.save(render(t).scaled(SCALE), path.join(out, "images", `${t.id}.png`));
      writeFileSync(path.join(out, "metadata", `${t.id}.json`), JSON.stringify(metadata(t), null, 2));
    }
    writeFileSync(path.join(out, "rarity.csv"), ["id,rank,score,edition," + ORDER.join(","), ...tokens.map((t) => [t.id, t.rank, t.score.toFixed(1), t.oneOfOne ? "1/1" : "", ...ORDER.map((k) => t.traits[k])].join(","))].join("\n"));
    const summary = Object.fromEntries(ORDER.map((k) => [k, Object.fromEntries(T[k].map((v) => [v[0], count[k + v[0]] ?? 0]))]));
    writeFileSync(path.join(out, "traits.json"), JSON.stringify({ collection: COLLECTION, supply: SUPPLY, traits: summary }, null, 2));
    P.save(P.sheet(tokens.map((t) => ({ buf: render(t), label: String(t.id), scale: 2 })), { cols: 18, gap: 4 }), path.join(out, "collection.png"));
    console.log("wrote", tokens.length, "tokens to", out);
  } else {
    // The preview: the five 1/1s, then one of every composition, then a few more.
    const byRank = [...tokens].sort((a, b) => a.rank - b.rank), ones = byRank.slice(0, 5), rest = tokens.filter((t) => !t.oneOfOne);
    const perBg = T.background.filter((v) => v[1]).map((v) => rest.find((t) => t.traits.background === v[0]));
    const show = [...ones, ...perBg, ...rest.filter((t) => !perBg.includes(t)).slice(0, 20 - ones.length - perBg.length)];
    P.save(P.sheet(show.map((t) => ({ buf: render(t), label: `${t.id} ${t.traits.background}`.slice(0, 22), scale: 4 })), { cols: 5, gap: 8 }), path.join(here, "preview.png"));
    console.log("wrote", path.join(here, "preview.png"));
  }
}

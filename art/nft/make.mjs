// Five Blades: the Seekers, 333 collectible portraits of the game's fighter (the Hooded Seeker, character art by
// Primitive Pixels), drawn with the Codixel core. Every token is the same Seeker; its traits change his cloak, his
// eyes, his stance, the blade he carries, an aura, a floating gem, the plinth he stands on, the background and the frame.
//
//   node art/nft/make.mjs           writes art/nft/preview.png: a sheet of sample tokens to approve
//   node art/nft/make.mjs all       writes art/nft/out/: images/<n>.png, metadata/<n>.json, rarity.csv, collection.png
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
const ramp = (hue, sat, light, n = 6, shift = 25) => P.hueRamp(n, { hue, sat, shift, light }).map(P.unpack);
const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));

// ------------------------------------------------------------------------------------------------ the traits
// Each trait value: [name, weight, data]. A higher weight is more common.
const T = {
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
    ["Strike", 18, { file: "Attack1_90x50_8f", w: 90, h: 50, frame: 3, feet: [16, 38] }],
  ],
  // The five blades of the story: Ink, Fire, Water, Volt and Leaf, each with its game colour.
  blade: [
    ["Ink", 20, { hue: 45, col: "#ffd54a" }], ["Fire", 20, { hue: 16, col: "#ff8a3d" }], ["Water", 20, { hue: 195, col: "#7fdcff" }],
    ["Volt", 20, { hue: 272, col: "#d6b3ff" }], ["Leaf", 20, { hue: 118, col: "#b2f2bb" }],
  ],
  aura: [["None", 40], ["Embers", 22], ["Halo", 16], ["Blade Orb", 14], ["Ascendant", 8]],
  gem: [["None", 36], ["Ruby", 14], ["Sapphire", 14], ["Emerald", 13], ["Amethyst", 12], ["Diamond", 8], ["Black Opal", 3]],
  plinth: [["Marble", 32], ["Obsidian", 28], ["Gold", 18], ["Levitating", 22]],
  background: [
    ["Velvet Noir", 13], ["Royal Damask", 12], ["Starlit Vault", 11], ["Gilded Sunburst", 10], ["Marble Hall", 10],
    ["Ember Dusk", 10], ["Emerald Arch", 9], ["Harlequin", 8], ["Eclipse", 7], ["Nero Marquina", 5], ["Throne Room", 5],
  ],
  frame: [["Silver", 34], ["Gold", 30], ["Rose Gold", 18], ["Obsidian", 12], ["Platinum", 6], ["Celestial", 0]],
};
const ORDER = ["background", "frame", "cloak", "eyes", "stance", "blade", "aura", "gem", "plinth"];

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

// ------------------------------------------------------------------------------------------------ backgrounds
// Each paints the whole canvas; `r` is the token's own random stream, so no two skies are quite alike.
const CX = 28, FEET = 42;
const BACKGROUNDS = {
  "Velvet Noir"(b, r) {
    // Tufted velvet: a quilted diamond grid with buttons, lit by a spotlight from above.
    const deep = [26, 8, 14], mid = [74, 16, 32], hi = [120, 34, 54];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const u = ((x + y) % 10 + 10) % 10, v = ((x - y) % 10 + 10) % 10, seam = u === 0 || v === 0;
      const spot = 1 - Math.min(1, Math.hypot((x - CX) / 30, (y - 18) / 26));
      let c = mix(deep, mid, spot);
      if (!seam && (u === 5 || v === 5) && spot > 0.45) c = mix(c, hi, 0.35);
      if (seam) c = shade(c, 0.7);
      if (u === 0 && v === 0) c = [196, 156, 70];
      b.pset(x, y, c);
    }
  },
  "Royal Damask"(b, r) {
    // A repeating, mirrored damask motif, one tone up from the ground.
    const ground = [44, 18, 70], motif = [72, 34, 108], line = [104, 64, 140];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const tx = x % 14, ty = (y + (Math.floor(x / 14) % 2) * 7) % 14, mx = tx < 7 ? tx : 13 - tx;
      const d = Math.hypot(mx - 6.5, ty - 7), n = P.hash(mx, ty, 7);
      const on = d < 5.5 && (n > 0.55 || (mx === 6 && ty > 2 && ty < 12));
      b.pset(x, y, on ? (d > 4.5 ? line : motif) : ground);
    }
  },
  "Starlit Vault"(b, r) {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) b.pset(x, y, mix([6, 8, 26], [24, 26, 66], y / SIZE));
    for (let i = 0; i < 46; i++) {
      const x = r() * SIZE, y = r() * SIZE * 0.8, big = r() < 0.12;
      b.pset(x, y, big ? [255, 240, 200] : mix([120, 130, 190], [230, 230, 255], r()));
      if (big) { b.pset(x - 1, y, [150, 140, 120]); b.pset(x + 1, y, [150, 140, 120]); b.pset(x, y - 1, [150, 140, 120]); b.pset(x, y + 1, [150, 140, 120]); }
    }
  },
  "Gilded Sunburst"(b, r) {
    // Art-deco rays fanning out from behind the Seeker.
    const ox = CX, oy = 30, n = 28;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const a = Math.atan2(y - oy, x - ox), k = Math.floor(((a + Math.PI) / (2 * Math.PI)) * n), d = Math.hypot(x - ox, y - oy);
      const fade = Math.max(0, 1 - d / 46), ray = k % 2 === 0;
      b.pset(x, y, ray ? mix([28, 20, 6], [190, 140, 40], fade) : mix([10, 8, 4], [70, 48, 14], fade));
    }
  },
  "Marble Hall"(b, r) {
    const s = r() * 100;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const v = Math.abs(Math.sin((x + y * 0.6) * 0.16 + P.fbm(x * 0.07 + s, y * 0.07, 4) * 7));
      const base = mix([236, 232, 226], [206, 202, 198], P.fbm(x * 0.2, y * 0.2 + s, 2));
      b.pset(x, y, v < 0.06 ? [150, 146, 150] : v < 0.13 ? mix(base, [170, 166, 170], 0.5) : base);
    }
  },
  "Nero Marquina"(b, r) {
    // Black marble with veins of gold.
    const s = r() * 100;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const v = Math.abs(Math.sin((x * 0.7 - y) * 0.14 + P.fbm(x * 0.06, y * 0.06 + s, 4) * 8));
      const base = mix([12, 12, 14], [30, 30, 34], P.fbm(x * 0.18 + s, y * 0.18, 2));
      b.pset(x, y, v < 0.05 ? [232, 186, 74] : v < 0.1 ? [138, 100, 34] : base);
    }
  },
  "Ember Dusk"(b, r) {
    const bands = [[44, 12, 40], [92, 22, 48], [156, 44, 40], [214, 96, 40], [246, 168, 70]];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const t = Math.pow(y / SIZE, 1.3) * (bands.length - 1);
      b.pset(x, y, bands[P.band(t / (bands.length - 1), bands.length, x, y, 0.25)]);
    }
    for (let x = 0; x < SIZE; x++) { const h = 6 + Math.round(3 * Math.sin(x * 0.3 + r() * 0.2) + 2 * Math.sin(x * 0.11)); for (let y = SIZE - h; y < SIZE; y++) b.pset(x, y, [30, 10, 26]); }
  },
  "Emerald Arch"(b, r) {
    // A green-lacquer wall with a gold-edged arch framing the figure.
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const dx = (x - CX) / 17, dy = (y - 22) / 17, inArch = (y >= 22 ? Math.abs(x - CX) < 17 : dx * dx + dy * dy < 1);
      const edge = (y >= 22 ? Math.abs(Math.abs(x - CX) - 17) < 1 : Math.abs(Math.hypot(dx, dy) - 1) < 0.06);
      b.pset(x, y, edge ? [214, 170, 66] : inArch ? mix([10, 40, 28], [22, 80, 54], 1 - y / SIZE) : mix([8, 52, 36], [4, 30, 20], ((x >> 2) % 2) * 0.4));
    }
  },
  Harlequin(b, r) {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const u = Math.floor((x + y * 0.75) / 9), v = Math.floor((x - y * 0.75 + 100) / 9), on = (u + v) % 2 === 0;
      const line = ((x + y * 0.75) % 9 + 9) % 9 < 0.8 || ((x - y * 0.75 + 100) % 9 + 9) % 9 < 0.8;
      b.pset(x, y, line ? [120, 92, 34] : on ? [18, 16, 20] : [36, 30, 22]);
    }
  },
  Eclipse(b, r) {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - CX, y - 20), n = P.fbm(Math.atan2(y - 20, x - CX) * 3, d * 0.2, 2);
      let c = mix([4, 4, 8], [16, 14, 24], y / SIZE);
      if (d < 12) c = [2, 2, 4];
      else if (d < 13.5) c = [255, 236, 190];
      else if (d < 22 + n * 6) c = mix([210, 150, 50], c, Math.min(1, (d - 13.5) / (9 + n * 6)) ** 0.6);
      b.pset(x, y, c);
    }
  },
  "Throne Room"(b, r) {
    // Dark hall, two gold-banded pillars, a red runner up to him.
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      let c = y < 34 ? mix([20, 14, 18], [40, 26, 30], y / 34) : ((x + y) % 4 < 2 ? [34, 26, 26] : [26, 20, 20]);
      const runner = y >= 34 && Math.abs(x - CX) < 6 + (y - 34) * 0.6;
      if (runner) c = (Math.abs(x - CX) > 4.6 + (y - 34) * 0.6) ? [196, 150, 60] : [120, 20, 28];
      for (const px of [9, 47]) if (Math.abs(x - px) <= 3 && y < 40) c = (y % 10 === 2) ? [214, 170, 66] : mix([70, 60, 64], [130, 120, 120], 1 - Math.abs(x - px) / 3.5);
      b.pset(x, y, c);
    }
  },
};

// ------------------------------------------------------------------------------------------------ metals, gems
const METALS = {
  Gold: ramp(44, 0.82, [0.16, 0.86]),
  Silver: ramp(215, 0.08, [0.18, 0.9]),
  "Rose Gold": ramp(14, 0.5, [0.2, 0.86]),
  Obsidian: ramp(262, 0.22, [0.04, 0.5]),
  Platinum: ramp(200, 0.12, [0.32, 0.97]),
  Celestial: ramp(46, 0.9, [0.2, 0.92]),
};
/** Each stone's colour ramp, darkest to brightest (6 steps). */
const GEMS = {
  Ruby: ramp(352, 0.85, [0.12, 0.8]), Sapphire: ramp(222, 0.85, [0.12, 0.8]), Emerald: ramp(145, 0.75, [0.1, 0.72]),
  Amethyst: ramp(282, 0.7, [0.12, 0.8]), Diamond: ramp(205, 0.12, [0.45, 0.98]), "Black Opal": ramp(230, 0.3, [0.04, 0.3]),
};
/** A brilliant cut seen from the front: 0 is its outline, 5 its brightest facet, 6 the glint. */
const CUT = ["..00000..", ".0455460.", "045554320", "032222230", ".0343220.", "..03320..", "...030...", "....0...."];
function gem(name) {
  const m = GEMS[name], b = new P.Buf(9, 8);
  CUT.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ".") return;
    let c = ch === "6" ? [255, 255, 255] : m[+ch];
    // Black opal: play of colour in its facets.
    if (name === "Black Opal" && ch !== "0" && ch !== "6" && P.hash(x, y, 3) > 0.45) c = P.hsl(P.hash(x, y, 9) * 360, 0.85, 0.55);
    b.pset(x, y, c);
  }));
  return b;
}

// ------------------------------------------------------------------------------------------------ one token
function render(tok) {
  const t = tok.traits, data = (k) => tok.data[k], r = P.rng(tok.seed);
  const b = new P.Buf(SIZE, SIZE);
  BACKGROUNDS[t.background](b, r);

  // A soft vignette pulls the eye to the middle; on light marble it is lighter.
  const vig = t.background === "Marble Hall" ? 0.12 : 0.38;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot((x - CX) / 34, (y - 26) / 34);
    if (d > 0.55) { const c = P.unpack(b.px[y * SIZE + x]); b.px[y * SIZE + x] = P.col(shade(c, 1 - vig * Math.min(1, (d - 0.55) / 0.5))); }
  }

  const blade = data("blade"), bcol = hex(blade.col), bramp = ramp(blade.hue, 0.85, [0.25, 0.92]);
  const stance = data("stance"), fig = seeker(stance, data("cloak"), data("eyes"));
  const fx = CX - stance.feet[0] + (t.stance === "Strike" ? -6 : 0), lift = t.plinth === "Levitating" ? 3 : 0, fy = FEET - stance.feet[1] - lift;

  // Behind him: the aura.
  if (t.aura === "Blade Orb" || t.aura === "Ascendant") {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - CX, (y - 31) * 1.1) / 13 + (P.fbm(x * 0.3, y * 0.3, 2) - 0.5) * 0.5;
      if (d < 1) { const c = P.unpack(b.px[y * SIZE + x]); b.px[y * SIZE + x] = P.col(mix(c, bramp[Math.min(5, Math.floor((1 - d) * 6))], 0.35 + (1 - d) * 0.45)); }
    }
  }

  // The plinth.
  if (t.plinth === "Levitating") {
    for (let x = -5; x <= 5; x++) b.pset(CX + x, FEET + 1, shade(P.unpack(b.get(CX + x, FEET + 1)), 0.55 + Math.abs(x) * 0.06));
    for (let i = 0; i < 4; i++) b.pset(CX - 4 + i * 3, FEET + 3 + (i % 2), mix(bcol, [255, 255, 255], 0.3));
  } else {
    const m = t.plinth === "Gold" ? METALS.Gold : t.plinth === "Obsidian" ? METALS.Obsidian : [[120, 116, 118], [168, 164, 166], [200, 196, 198], [222, 218, 220], [238, 236, 236], [250, 250, 250]];
    for (let y = FEET; y <= SIZE - 6; y++) {
      const half = y === FEET ? 9 : y <= FEET + 1 ? 10 : y >= SIZE - 7 ? 10 : 8;
      for (let x = -half; x <= half; x++) {
        const lit = y === FEET ? 5 : y === FEET + 1 ? 3 : x < -half + 2 ? 3 : x > half - 2 ? 0 : 2;
        b.pset(CX + x, y, m[Math.max(0, Math.min(5, lit - (y > FEET + 1 && y < SIZE - 7 && (x + 20) % 4 === 0 ? 1 : 0)))]);
      }
    }
  }

  // His shadow, then him.
  if (t.plinth !== "Levitating") for (let x = -4; x <= 4; x++) b.pset(CX + x, FEET, shade(P.unpack(b.get(CX + x, FEET)), 0.62));
  b.sprite(fig, fx, fy);

  // In front of him: embers, halo, the Ascendant's motes.
  if (t.aura === "Embers" || t.aura === "Ascendant") for (let i = 0; i < 12; i++) {
    const x = CX - 14 + r() * 28, y = 12 + r() * 30, c = r() < 0.3 ? [255, 250, 230] : mix(bcol, [255, 255, 255], r() * 0.4);
    b.pset(x, y, c);
  }
  if (t.aura === "Halo" || t.aura === "Ascendant") {
    const hx = CX + (t.stance === "Strike" ? -6 : 0), hy = fy + stance.feet[1] - 30, gold = METALS.Gold;
    for (let i = -4; i <= 4; i++) { b.pset(hx + i, hy - 1 + (Math.abs(i) === 4 ? 1 : 0), Math.abs(i) < 2 ? gold[5] : gold[4]); if (Math.abs(i) < 4) b.pset(hx + i, hy + 1, gold[2]); }
    b.pset(hx - 4, hy, gold[3]); b.pset(hx + 4, hy, gold[3]);
  }

  // The floating gem, top right, with a glint.
  if (t.gem !== "None") {
    b.sprite(gem(t.gem), 40, 9 + Math.round(r() * 3));
  }

  frameAround(b, METALS[t.frame], t, tok.id);
  return b;
}

/** A bevelled metal frame, corner studs (a gem if he has one), and a plate with his number. */
function frameAround(b, m, t, id) {
  const W = SIZE;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, W - 1 - y);
    if (e > 3) continue;
    const topLeft = x + y < W - 1;
    const c = e === 0 ? m[0] : e === 1 ? (topLeft ? m[5] : m[2]) : e === 2 ? (topLeft ? m[3] : m[1]) : m[0];
    b.pset(x, y, c);
  }
  // Studs at the corners: a diamond of metal with a jewel at its heart.
  const jewel = t.gem !== "None" ? GEMS[t.gem][4] : m[5];
  for (const [cx, cy] of [[2, 2], [W - 3, 2], [2, W - 3], [W - 3, W - 3]]) {
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) + Math.abs(j) <= 2) b.pset(cx + i, cy + j, Math.abs(i) + Math.abs(j) === 2 ? m[0] : i + j < 0 ? m[5] : m[3]);
    b.pset(cx, cy, jewel);
  }
  // Platinum and Celestial frames are set with diamonds along each side.
  if (t.frame === "Platinum" || t.frame === "Celestial") for (const k of [14, 28, 41]) for (const [x, y] of [[k, 1], [1, k], [W - 2, k], [k, W - 2]]) {
    b.pset(x, y, [255, 255, 255]); b.pset(x - 1, y, GEMS.Diamond[2]); b.pset(x + 1, y, GEMS.Diamond[2]);
  }
  // The plate: his number, set into the bottom edge.
  const label = String(id).padStart(3, "0"), tw = P.textWidth(label), pw = tw + 6, px0 = Math.round((W - pw) / 2), py0 = W - 9;
  for (let y = py0; y < py0 + 9; y++) for (let x = px0; x < px0 + pw; x++) {
    const edge = x === px0 || x === px0 + pw - 1 || y === py0 || y === py0 + 8;
    b.pset(x, y, edge ? m[0] : y === py0 + 1 ? m[5] : y >= py0 + 7 ? m[2] : m[4]);
  }
  P.text(b, px0 + 3, py0 + 2, label, m[0]);
}

// ------------------------------------------------------------------------------------------------ the draw
function pick(list, r) {
  const total = list.reduce((s, v) => s + v[1], 0);
  let x = r() * total;
  for (const v of list) if ((x -= v[1]) < 0) return v;
  return list[list.length - 1];
}

/** The five 1/1s: each Firstborn god's own Seeker, in royal gold on the throne-room floor, framed in platinum. */
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
    const traits = { background: "Throne Room", frame: "Celestial", cloak: "Royal Gold", eyes: f.eyes, stance: "Invoke", blade: f.blade, aura: "Ascendant", gem: "Diamond", plinth: "Gold" };
    seen.add(ORDER.map((k) => traits[k]).join("|"));
    tokens.push(make(traits, { oneOfOne: f.title }));
  }
  while (tokens.length < SUPPLY) {
    const traits = Object.fromEntries(ORDER.map((k) => [k, pick(T[k], r)[0]]));
    const dna = ORDER.map((k) => traits[k]).join("|");
    if (seen.has(dna)) continue;
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
    // The preview: the five 1/1s, then the rarest and a spread of ordinary ones.
    const byRank = [...tokens].sort((a, b) => a.rank - b.rank);
    const show = [...byRank.slice(0, 5), ...byRank.slice(5, 9), ...tokens.filter((t) => !t.oneOfOne).slice(0, 11)];
    P.save(P.sheet(show.map((t) => ({ buf: render(t), label: `${t.id} ${t.traits.background}`.slice(0, 22), scale: 4 })), { cols: 5, gap: 8 }), path.join(here, "preview.png"));
    console.log("wrote", path.join(here, "preview.png"));
  }
}

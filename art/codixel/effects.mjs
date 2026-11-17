// Five Blades: the fight effects drawn with the Codixel core, one look per element. "Hot and bright": a small
// white core, flat bands out to the element's darkest colour, dither only where two bands meet, torn flickering edges,
// a few sparks. Every animation loops: the noise is P.loopNoise over T frames, the beam's noise wraps across its width.
// `node art/codixel/effects.mjs` writes art/codixel/preview/effects.png (numbered frames) and effects.gif.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const P = createRequire(import.meta.url)(path.join(os.homedir(), ".claude/skills/codixel/core/pixel.js"));

export const T = 8;
/** Each element's ramp, dark edge to white core (data.ts, CHARS[].element). */
const hot = (hue, sat = 0.85) => [...P.hueRamp(4, { hue, sat, shift: 30, light: [0.22, 0.62] }), P.col(P.hsl(hue, 0.9, 0.86)), P.col([255, 255, 255])];
export const ELEMENTS = { ink: hot(45), fire: hot(16), water: hot(195), volt: hot(272, 0.8), leaf: hot(118, 0.7), foe: hot(356, 0.8) };

/** A round orb of energy, `S` pixels across, at frame t. */
export function orb(cols, t, S = 24) {
  const b = new P.Buf(S, S), c = (S - 1) / 2, R = S * 0.34;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - c, y - c) / R;
    // Noise grows towards the edge, so the core holds still and the rim tears and flickers.
    const n = P.loopNoise(x * 0.32, y * 0.32, t, T, 0.28, 3, 5) - 0.5;
    const v = 1 - d + n * 0.9 * Math.min(1, d);
    if (v < 0.08) continue;
    b.pset(x, y, cols[P.band(Math.pow(P.clamp(v / 0.95), 1.35), cols.length, x, y, 0.28)]);
  }
  // Three sparks thrown off the rim, each out and fading over the loop.
  for (let i = 0; i < 3; i++) {
    const ph = ((t / T) + i / 3) % 1, a = i * 2.3 + 0.6, r = R * (1 + ph * 0.55);
    if (ph > 0.85) continue;
    b.pset(c + Math.cos(a) * r, c + Math.sin(a) * r, cols[ph < 0.4 ? 4 : 2]);
  }
  return b;
}

/** A beam's middle, W wide (it wraps across its width so it tiles) and H tall, at frame t. */
export function beam(cols, t, W = 32, H = 20) {
  const b = new P.Buf(W, H), c = (H - 1) / 2, hw = H * 0.42, k = 1.6;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // The pattern flows along the beam, a whole width per loop, so it streams outward and still tiles.
    const a = 2 * Math.PI * (x / W - t / T);
    const n = P.loopNoise(Math.cos(a) * k + y * 0.05, Math.sin(a) * k + y * 0.38, t, T, 0.15, 3, 9) - 0.5;
    const d = Math.abs(y - c) / hw, v = 1 - d + n * 0.8 * Math.min(1, d + 0.2);
    if (v < 0.1) continue;
    b.pset(x, y, cols[P.band(Math.pow(P.clamp(v / 0.95), 1.7), cols.length, x, y, 0.28)]);
  }
  return b;
}

// ---------------------------------------------------------------------------------------------- the preview
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(here, "effects.mjs")) {
  const out = path.join(here, "preview");
  mkdirSync(out, { recursive: true });
  const BG = [16, 20, 26], names = Object.keys(ELEMENTS);
  // One frame of the whole preview: per element an orb, then the beam tiled three times leaving a charge orb.
  const scene = (t) => {
    const W = 200, H = names.length * 30 + 4, b = new P.Buf(W, H);
    b.clear(BG);
    names.forEach((name, row) => {
      const cols = ELEMENTS[name], y = 2 + row * 30;
      const put = (s, x0, y0) => { for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const p = s.px[j * s.w + i]; if (p >>> 24) b.px[(y0 + j) * W + x0 + i] = p; } };
      put(orb(cols, t), 4, y + 1);
      for (let k = 0; k < 4; k++) put(beam(cols, t), 60 + k * 32, y + 3);
      put(orb(cols, (t + 3) % T), 46, y + 1);
    });
    return b;
  };
  const frames = Array.from({ length: T }, (_, t) => scene(t));
  writeFileSync(path.join(out, "effects.gif"), P.gif(frames, { delay: 70, scale: 3 }));
  const sheet = [];
  for (const name of names) for (let t = 0; t < T; t++) sheet.push({ buf: (() => { const o = orb(ELEMENTS[name], t), f = new P.Buf(26, 26); f.clear(BG); for (let j = 0; j < 24; j++) for (let i = 0; i < 24; i++) { const p = o.px[j * 24 + i]; if (p >>> 24) f.px[(j + 1) * 26 + i + 1] = p; } return f; })(), label: t === 0 ? name.toUpperCase() : String(t), scale: 3 });
  sheet.push({ buf: frames[0], label: "SCENE 0", scale: 2 }, { buf: frames[T - 1], label: "LAST", scale: 2 }, { buf: frames[0], label: "1X", scale: 1 });
  P.save(P.sheet(sheet, { cols: T, gap: 6 }), path.join(out, "effects.png"));
  // Motion check (SKILL.md, "Motion speed"): share of orb pixels changing per frame.
  const ch = (a, b) => { let n = 0, m = 0; for (let i = 0; i < a.px.length; i++) { if (a.px[i] >>> 24 || b.px[i] >>> 24) { m++; if (a.px[i] !== b.px[i]) n++; } } return n / m; };
  for (const name of names) console.log(name.padEnd(6), "orb change/frame", Array.from({ length: T }, (_, t) => (ch(orb(ELEMENTS[name], t), orb(ELEMENTS[name], (t + 1) % T)) * 100).toFixed(0) + "%").join(" "), "colours", P.colorCount(orb(ELEMENTS[name], 0)).map((c) => (c.share * 100).toFixed(0)).join("/"));
  console.log("wrote", out);
}

// ---------------------------------------------------------------------------------------------- the game's copy
// `node art/codixel/effects.mjs game` writes apps/app/src/game/fxsprites.ts: per element its colours and the T frames of
// the orb and of the beam's middle, as rows of letters (the format of sprites.ts), drawn by render.ts.
if (process.argv[2] === "game") {
  const LETTERS = "abcdef", toHex = (c) => "#" + P.unpack(c).map((v) => v.toString(16).padStart(2, "0")).join("");
  const rows = (b, cols) => Array.from({ length: b.h }, (_, y) => Array.from({ length: b.w }, (_, x) => {
    const c = b.px[y * b.w + x];
    return c >>> 24 ? LETTERS[cols.indexOf(c)] : ".";
  }).join(""));
  const body = Object.entries(ELEMENTS).map(([name, cols]) => {
    const colours = Object.fromEntries(cols.map((c, i) => [LETTERS[i], toHex(c)]));
    const orbs = Array.from({ length: T }, (_, t) => rows(orb(cols, t), cols)), beams = Array.from({ length: T }, (_, t) => rows(beam(cols, t), cols));
    return `  ${name}: { colours: ${JSON.stringify(colours)}, orb: ${JSON.stringify(orbs)}, beam: ${JSON.stringify(beams)} },`;
  });
  const file = path.resolve(here, "../../apps/app/src/game/fxsprites.ts");
  writeFileSync(file, [
    "// Made by art/codixel/effects.mjs (Codixel core); rebuild with `node art/codixel/effects.mjs game`, do not edit.",
    "/** Per element: its colours, and the looping frames of an orb and of a beam's middle (rows of letters, as sprites.ts). */",
    "export const FX_FRAMES = {", ...body,
    "} satisfies Record<string, { colours: Record<string, string>; orb: string[][]; beam: string[][] }>;", ""].join("\n"));
  console.log("wrote", file);
}

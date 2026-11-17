// spec/app/index.md, "Story: Fight the waves"
// Draws the arena of sim.ts on a canvas: ink on paper, with the fighters of figure.ts in their own colours from data.ts.
import { PROTAGONISTS, REGIONS } from "../story/canon.ts";
import { castDeath, castFrame, drawCast, loadCast } from "./cast.ts";
import { CHARS, ITEMS, type ItemId, type Skin, type Vec } from "./data.ts";
import { RELICS, RELIC_ICONS } from "./relics.ts";
import { SPRITES, type Sprite } from "./sprites.ts";
import { FX_FRAMES } from "./fxsprites.ts";
import { drawEffect, effectArea } from "./effects.ts";
import { deathFrame, drawFigure, frameOf, loadFigures, showFrame, turnOf } from "./figure.ts";
import type { Decor } from "./levels.ts";
import type { Fx } from "./post/post.ts";
import { SCENERY, THEMES, drawBackdrop, drawFrame, drawPiece, drawPlant, drawSlab, drawSpikes, drawTop, loadPlaces } from "./places.ts";
import { type View, createScenery } from "./scenery.ts";
import { drawGuide } from "./guide.ts";
import { type SkyId, drawSky, loadSky, skyIsDark } from "./sky.ts";
import { BLADE_R, CRUMBLE_BACK, CRUSH_H, SPIKE_H, bladeAt, boltAt, FROZEN_REACH, GRAVE_GRASP, GRAVE_REST, TIDE_H, tideAt, liftAt, BELT_SPEED, SHELL_BURST, shellAt, fireAt, threadAt, SHADE_LAG, SHADE_LIFE, LANTERN_SLEEP, WISP_LIFE, bellAt, eyeAt, spiritAt, flameAt, gustAt, jetAt, ramAt, seamAt, spikeAt, wagonAt } from "./traps.ts";
import { type Fighter, FOG_Y, GROUND_TOP, type Game, type SpecialState } from "./sim.ts";

const PAPER = "#fbfbf9", INK = "#111111", RED = "#d42a1e", RULE = "#d6d6d2", GREY = "#8a8a86";
type Ctx = CanvasRenderingContext2D;

// Rooftop skyline, generated once.
const skyline = (() => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const far = [], near = [];
  for (let x = -2000; x < 9000; x += 40 + rnd() * 70) far.push({ x, w: 40 + rnd() * 80, h: 80 + rnd() * 200, ant: false });
  for (let x = -2000; x < 9000; x += 70 + rnd() * 120) near.push({ x, w: 60 + rnd() * 110, h: 60 + rnd() * 150, ant: rnd() < 0.25 });
  return { far, near };
})();

/** The flames of an aura, rising about the feet (x, feet) to above a head at `head`. */
/** Each sprite drawn once onto its own small canvas, then scaled up whole with smoothing off (sprites.ts). */
const pixmaps = new Map<Sprite, HTMLCanvasElement>();
function pixmap(sprite: Sprite) {
  let c = pixmaps.get(sprite);
  if (!c) {
    c = document.createElement("canvas"); c.width = sprite.icon[0].length; c.height = sprite.icon.length;
    const g = c.getContext("2d")!;
    sprite.icon.forEach((row, y) => [...row].forEach((k, x) => { if (k !== ".") { g.fillStyle = sprite.colours[k]; g.fillRect(x, y, 1, 1); } }));
    pixmaps.set(sprite, c);
  }
  return c;
}
/** A sprite `w` wide at (x, y) its top left, its height in proportion, in whole screen pixels. */
function blitSprite(ctx: Ctx, sprite: Sprite, x: number, y: number, w: number) {
  const c = pixmap(sprite), h = (w * c.height) / c.width, smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, x, y, w, h); ctx.imageSmoothingEnabled = smooth;
}

/** Each element's orb and beam frames as sprites (fxsprites.ts); an orb's colour says whose it is, a foe's is red. */
const FX: Record<string, { orb: Sprite[]; beam: Sprite[] }> = Object.fromEntries(Object.entries(FX_FRAMES).map(([kind, f]) => [kind, {
  orb: f.orb.map((icon) => ({ icon, colours: f.colours })), beam: f.beam.map((icon) => ({ icon, colours: f.colours })),
}]));
const KIND_OF = new Map(CHARS.map((c) => [c.orb, c.element]));
const fxOf = (colour: string) => FX[KIND_OF.get(colour) ?? "foe"];
/** The frame of a looping effect at time t (seconds), 14 frames a second, offset by `seed` so neighbours differ. */
const frameAt = (frames: Sprite[], t: number, seed = 0) => frames[((Math.floor(t * 14 + seed) % frames.length) + frames.length) % frames.length];
/** An orb of energy of about radius `r` centred on (x, y); the orb fills about 0.39 of its sprite's width each side. */
function blitOrb(ctx: Ctx, colour: string, x: number, y: number, r: number, t: number, seed = 0) {
  const w = r * 2.6;
  blitSprite(ctx, frameAt(fxOf(colour).orb, t, seed), x - w / 2, y - w / 2, w);
}

export function drawAura(ctx: Ctx, x: number, feet: number, head: number, strength: number, fx: string, t: number) {
  ctx.fillStyle = `rgba(${fx},${0.3 * strength})`;
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 10 + Math.sin(t * 20 + i) * 3;
    const top = head - 22 - Math.abs(Math.sin(t * 13 + i * 1.7)) * 30 * strength;
    ctx.beginPath(); ctx.moveTo(bx - 9, feet);
    ctx.quadraticCurveTo(bx - 12, (feet + top) / 2, bx + Math.sin(t * 25 + i) * 5, top);
    ctx.quadraticCurveTo(bx + 12, (feet + top) / 2, bx + 9, feet);
    ctx.fill();
  }
}

/** A character card: the focused fighter swings and runs inside its aura, the others stand. */
export function drawPreview(ctx: Ctx, index: number, focused: boolean, t: number, skin: Skin = CHARS[index].skin) {
  const c = CHARS[index], look = { skin };
  void loadFigures();
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 120, 150);
  ctx.fillStyle = INK; ctx.fillRect(14, 141, 92, 5);
  if (!focused) return drawFigure(ctx, look, { anim: "idle", frame: (t * 10 + index * 5) % 24 }, 58, 141, 1);
  drawAura(ctx, 58, 141, 60, 0.85, c.fx, t);
  drawFigure(ctx, look, showFrame(t), 46, 141, 1, 1, 2.6);
}

/** The camera and the drawing of one canvas. */
/** Whether the player has asked the game itself to hold still: no shaking of the picture and none of the effects laid over it (the pause menu). Kept in this browser; what the system asks for counts as well. */
let calm = (() => { try { return localStorage.getItem("calm") === "1"; } catch { return false; } })();
export const isCalm = () => calm;
export function setCalm(on: boolean) { calm = on; try { localStorage.setItem("calm", on ? "1" : "0"); } catch { /* Private browsing may refuse: it lasts for this visit. */ } }

export function createView(canvas: HTMLCanvasElement, game: Game) {
  const ctx = canvas.getContext("2d")!;
  // Only the arena's own art at the start; a campaign level asks for its theme's when it begins (draw), and the
  // campaign's screen fetches the rest while the player reads it (kit.tsx, ArtLoading).
  void loadFigures(); void loadCast(); void loadPlaces(["cove"]);
  const S = game.scene;
  const system = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  let cssW = 0, cssH = 0, dpr = 1, baseScale = 1, scale = 1, zoom = 1, camX = 0, camY = 0, fights = 0;
  // How far the fighter may move about the middle of the view before the camera follows, and how far the view
  // leans ahead of a fighter on the move.
  const STILL_X = 110, STILL_Y = 70, LEAD = 48;
  let lead = 0;
  /** How much the guide is there: he comes as he starts to talk and goes when he has done. */
  let guideShown = 0;
  /** Frames drawn, and the last sky made ready ahead of its wave. */
  let drawn = 0, readied: SkyId | null = null;

  function resize() {
    const r = canvas.getBoundingClientRect();
    cssW = r.width; cssH = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    baseScale = Math.min(cssH / 900, cssW / 760) || 1;
    // On a phone held sideways the view is short: the fighter is kept large enough to see and to aim, and less of the place is shown.
    if (coarse) baseScale = Math.max(baseScale, 0.6);
  }

  /** The colours of the place: a level is drawn in its region's, the arena in ink on paper. */
  const ARENA = { sky: PAPER, far: "#eeeeeb", near: "#e3e3df", ground: INK };
  const place = () => (S.level ? REGIONS.find((region) => region.id === S.level!.region)!.palette : ARENA);
  /** The art of the level in play, if it has any. */
  const theme = () => (S.level?.theme ? THEMES[S.level.theme] : null);
  // The life of a campaign level's place: weather, light, creatures and the rest (scenery.ts).
  const scenery = createScenery();
  let sceneDt = 0, sv: View, levelLoaded: unknown = null;
  const sceneView = (): View => { const H = S.hero; return { camX, camY, scale, w: cssW, h: cssH, dpr, time: S.time, dt: sceneDt,
    hero: H && playing() ? { x: H.body.position.x, y: H.body.position.y, facing: H.facing, striking: !!H.atk } : null }; };
  const playing = () => S.match.screen === "Play" && S.hero !== null;
  const heroFx = () => (S.hero?.char ? S.hero.char.fx : "242,178,0");
  const onScreen = (min: Vec, max: Vec) => max.x > camX - 100 && min.x < camX + cssW / scale + 100 && max.y > camY - 200 && min.y < camY + cssH / scale + 200;

  function updateCamera(realDt: number) {
    const H = S.hero;
    // A fighter shut in with a boss sees the room they share: all of it where the screen has the room, drawn a little
    // smaller on one that has not, and what is left over follows the two of them.
    const boss = playing() && H?.alive && S.locked ? S.enemies.find((E) => E.boss && E.alive) : undefined, room = boss ? S.bossRoom : null;
    const fit = room ? Math.max(0.85, Math.min(1, cssW / baseScale / (room[2] - room[0]), cssH / baseScale / (room[3] - room[1]))) : 1;
    zoom += ((S.slowMs > 0 || S.deathMs > 0 ? 1.22 : 1) * fit - zoom) * Math.min(1, realDt * 0.006);
    scale = baseScale * (zoom + S.punch);
    const viewW = cssW / scale, viewH = cssH / scale;
    if (!playing() || !H) {
      // Attract mode: drift along the islands.
      camX = S.worldMin + ((performance.now() / 1000 * 80) % Math.max(1, S.worldMax - S.worldMin - viewW));
      camY = 740 - viewH * 0.72;
    } else {
      if (fights !== S.fights) { fights = S.fights; zoom = 1; camX = H.body.position.x - cssW / baseScale / 2; }
      if (room && boss) {
        const between = (H.body.position.x + boss.body.position.x) / 2, w = room[2] - room[0], h = room[3] - room[1];
        const tx = viewW >= w ? room[0] + (w - viewW) / 2 : Math.max(room[0], Math.min(room[2] - viewW, between - viewW / 2));
        // The room's floor is kept clear of the boss's name and health at the foot of the screen (`drawScreen`).
        const foot = 84 / scale;
        const ty = viewH >= h ? room[3] + Math.min(foot, viewH - h) - viewH : Math.max(room[1], Math.min(room[3] + foot - viewH, H.body.position.y - viewH * 0.55));
        camX += (tx - camX) * 0.07; camY += (ty - camY) * 0.07;
        S.camX = camX; S.camY = camY;
        return;
      }
      const focus = H.alive ? H.body.position : (S.ragdolls.length ? S.ragdolls[S.ragdolls.length - 1].parts[0].position : S.lastSafe);
      // The view holds still while the fighter moves about its middle, so that the fighter is the only thing moving.
      // Only a fighter actually moving is led: standing still, the view rests on it.
      const vx = H.alive ? H.body.velocity.x : 0;
      lead += ((Math.abs(vx) > 1 ? Math.sign(vx) * LEAD : 0) - lead) * 0.06;
      const offX = focus.x + lead - (camX + viewW / 2), offY = focus.y - (camY + viewH * 0.45);
      const tx = camX + offX - Math.max(-STILL_X, Math.min(STILL_X, offX));
      // Over the islands the view never looks below them; in a level of rooms it follows the fighter down to its floor.
      const deep = S.level?.bounds, lowest = deep ? deep.bottom + 120 - viewH : 740 - viewH * 0.72;
      const ty = Math.min(lowest, camY + offY - Math.max(-STILL_Y, Math.min(STILL_Y, offY)));
      camX += (tx - camX) * 0.14; camY += (ty - camY) * 0.1;
    }
    S.camX = camX; S.camY = camY;
  }

  /** Far things of a themed place, a sixth as near as the fighters: [piece, where along the level, size]. */
  const FAR: [string, number, number][] = [["farHill", 200, 0.9], ["farColumn", 1100, 0.55], ["farDome", 1700, 0.8], ["farSlope", 2500, 0.7], ["farColumnB", 3300, 0.6], ["farMound", 4000, 0.9], ["farHill", 4900, 0.8]];
  function drawBackground() {
    const T = theme();
    // The black room: nothing but the dark, and a little light where the fighter stands, to see it by.
    if (S.dark) {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cssW, cssH);
      const at = S.hero?.body.position;
      if (at) {
        const x = (at.x - camX) * scale, y = (at.y - camY) * scale, glow = ctx.createRadialGradient(x, y, 0, x, y, 520 * scale);
        glow.addColorStop(0, "rgba(120,132,150,0.42)"); glow.addColorStop(1, "rgba(120,132,150,0)");
        ctx.fillStyle = glow; ctx.fillRect(0, 0, cssW, cssH);
      }
      return;
    }
    // Over the islands the horizon is a place in the world; in a level of rooms it is a height of the view that the far things keep to.
    const horizon = S.level?.bounds ? cssH * 0.8 : (GROUND_TOP + 160 - camY) * scale;
    if (T) {
      const sky = ctx.createLinearGradient(0, 0, 0, cssH);
      sky.addColorStop(0, T.sky[0]); sky.addColorStop(1, T.sky[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, cssW, cssH);
      // A level's own sky goes over the theme's colours, which show until it has loaded.
      const own = S.level?.sky ?? (S.level && playing() ? S.sky : null);
      if (own) { drawSky(ctx, own, camX, camY, scale, cssW, cssH); return; }
      if (T.set === "fields") [0.03, 0.08, 0.16].forEach((par, i) => drawBackdrop(ctx, "fields", "sky" + i, camX * par * scale, cssW, cssH));
      if (T.set === "mossy") for (const [name, at, k] of FAR) drawPiece(ctx, "mossy", name, (at - camX * 0.16) * scale * 0.5 + cssW * 0.1, horizon + 120 * scale, k * scale, false, false, 0.55);
      if (T.set === "cove") {
        // The sea in its five frames lies under the sky; the sun stands still, the clouds drift and the far shore slides.
        drawFrame(ctx, "cove", "sea", S.time * 5, 5, 0, cssH * 0.42, cssW, cssH * 0.58);
        drawFrame(ctx, "cove", "sun", S.time * 4, 6, cssW * 0.78, cssH * 0.08, 64 * 2.5, 64 * 2.5);
        drawBackdrop(ctx, "cove", "clouds", camX * 0.05 * scale + S.time * 6, cssW, cssH);
        for (let x = -((camX * 0.2 * scale) % (256 * 3)) - 256 * 3; x < cssW; x += 256 * 3) drawFrame(ctx, "cove", "trees", 0, 1, x, horizon - 128 * 3 + 60, 256 * 3, 128 * 3);
      }
      if (T.set !== "shadow") return;
    }
    if (!T) { ctx.fillStyle = place().sky; ctx.fillRect(0, 0, cssW, cssH); }
    // A fight of waves under its sky: the sky takes the place of the paper and its skyline.
    if (!T && S.sky && playing()) { drawSky(ctx, S.sky, camX, camY, scale, cssW, cssH); return; }
    const layer = (list: typeof skyline.near, par: number, color: string) => {
      ctx.fillStyle = color;
      for (const b of list) {
        const x = (b.x - camX * par) * scale * 0.6 + cssW * 0.2;
        if (x > cssW || x + b.w * scale < 0) continue;
        ctx.fillRect(x, horizon - b.h * scale * 0.9, b.w * scale * 0.9, b.h * scale * 0.9 + 400);
        if (b.ant) ctx.fillRect(x + b.w * scale * 0.3, horizon - b.h * scale * 0.9 - 30 * scale, 2, 30 * scale);
      }
    };
    layer(skyline.far, 0.15, T ? "#3c3044" : place().far);
    layer(skyline.near, 0.3, T ? "#251c2b" : place().near);
    if (!T) { ctx.fillStyle = RULE; ctx.fillRect(0, horizon, cssW, 1.5); }
  }

  function worldTransform() {
    const sx = S.shake && !(system || calm) ? (Math.random() - 0.5) * S.shake : 0;
    const sy = S.shake && !(system || calm) ? (Math.random() - 0.5) * S.shake : 0;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (sx - camX * scale), dpr * (sy - camY * scale));
  }

  /** A level of rooms: the dim back wall of each room, so that inside reads as inside, then the dressed tops of its rock and its spikes. */
  function drawRooms(under: boolean) {
    const L = S.level, T = theme();
    // Spikes are drawn wherever there are any, on a stage of slabs as much as in a level of rooms: what hurts is seen.
    if (L && !under && !L.rooms) for (const hz of L.hazards ?? []) if (onScreen({ x: hz.x - hz.w / 2, y: hz.y - 40 }, { x: hz.x + hz.w / 2, y: hz.y })) drawSpikes(ctx, hz.x - hz.w / 2 - 6, hz.y, hz.w + 12);
    if (!L?.rooms || !T) return;
    const rw = 26 * 64, rh = 14 * 64;
    if (under) {
      // Faint where a sky is behind: enough to tell inside from out without hiding it.
      const bx = Math.max(0, camX - 50), by = Math.max(0, camY - 50);
      scenery.backWall(ctx, T, bx, by, Math.min(L.rooms[0] * rw, camX + cssW / scale + 50) - bx, Math.min(L.rooms[1] * rh, camY + cssH / scale + 50) - by, L.sky ? 0.2 : 0.42);
      return;
    }
    for (const [x, y, w] of L.tops ?? []) if (onScreen({ x, y: y - 60 }, { x: x + w, y: y + 60 })) drawTop(ctx, T, x, y, w);
    for (const hz of L.hazards ?? []) if (onScreen({ x: hz.x - hz.w / 2, y: hz.y - 40 }, { x: hz.x + hz.w / 2, y: hz.y })) drawSpikes(ctx, hz.x - hz.w / 2 - 6, hz.y, hz.w + 12);
  }

  /** Each element's colours for what is made of it, darkest outside to brightest at the heart. */
  const ELEMENT_RAMP: Record<string, [string, string, string, string]> = {
    fire: ["#c4361c", "#ff7a2a", "#ffd45a", "#fff4d6"], ink: ["#0b0b0b", "#3a2c10", "#f2b200", "#ffe9a0"],
    volt: ["#3a1680", "#7b3fe4", "#c58cff", "#ffffff"], water: ["#0f4a8a", "#1f6fd1", "#36c5f0", "#e6fbff"], leaf: ["#1e5a2a", "#2f9e44", "#8ce99a", "#efffe6"],
  };
  /** The traps of a hand-drawn level, each where traps.ts says it is now, and each showing what it is about to do. */
  function drawTraps() {
    const L = S.level, T = theme(), traps = L?.traps;
    if (!traps || !T) return;
    const IRON = "#8e94a3", DARK = "#1e1a22", HOT = "#ff5a36";
    // The tell of a false floor or wall: a seam a shade lighter than the rock, and now and then a mote of air out of it.
    const tell = (x: number, y: number, w: number, floor: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.07)"; if (floor) ctx.fillRect(x + 6, y + 9, w - 12, 1); else ctx.fillRect(x + 31, y + 6, 1, 52);
      const t = (S.time * 0.4 + x * 0.013) % 1;
      if (t < 0.3) { ctx.fillStyle = `rgba(220,230,240,${0.5 * (1 - t / 0.3)})`; ctx.fillRect(x + (floor ? w / 2 : 32), y + (floor ? -t * 60 : 30 - t * 20), 2, 2); }
    };
    // Vents and jets are made of the element of the hero whose level it is: its colours, darkest outside, brightest at the heart.
    const element = CHARS[PROTAGONISTS.find((p) => p.id === L!.hero)?.fighter ?? 1]?.element ?? "fire", RAMP = ELEMENT_RAMP[element];
    // Crumbling ledges always show their cracks; stood on, they shake; fallen, they leave an outline that fills in as they grow back.
    traps.crumbles.forEach(([cx, top, w, hidden], i) => {
      const st = S.traps.crumbles[i], x = cx - w / 2;
      if (!st || !onScreen({ x, y: top - 40 }, { x: x + w, y: top + 200 })) return;
      // A false floor not yet found: the floor's own rock, with a hair of a seam and now and then a breath of air out of it.
      if (hidden && !st.seen && st.gone <= 0) { drawSlab(ctx, T, "ground", x, top, w, 64); tell(x, top, w, 1); return; }
      if (st.gone > 0) {
        const fell = CRUMBLE_BACK - st.gone;
        if (fell < 24) { ctx.globalAlpha = 1 - fell / 24; for (let px = x; px < x + w; px += 64) drawSlab(ctx, T, "ledge", px + ((px / 64) % 2 ? 2 : -2) * fell * 0.2, top + fell * fell * 0.35, 62, 22); ctx.globalAlpha = 1; }
        const back = st.gone < 45 ? 0.15 + 0.45 * (1 - st.gone / 45) : 0.15;
        ctx.strokeStyle = `rgba(233,226,238,${back})`; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeRect(x + 1, top + 1, w - 2, 20); ctx.setLineDash([]);
        return;
      }
      const jolt = st.t >= 0 ? Math.sin(st.t * 1.9) * Math.min(3, 1 + st.t / 8) : 0;
      // Loose blocks, not one slab: light seams between them, a crack in each, and grit hanging under it.
      drawSlab(ctx, T, "ledge", x + jolt, top, w, 22);
      ctx.fillStyle = DARK; for (let px = x + 64; px < x + w - 1; px += 64) ctx.fillRect(px - 2 + jolt, top, 4, 22);
      ctx.strokeStyle = st.t >= 0 ? HOT : "rgba(233,226,238,0.6)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = x + 18; px < x + w - 10; px += 64) { ctx.moveTo(px + jolt, top + 4); ctx.lineTo(px + 9 + jolt, top + 11); ctx.lineTo(px + 4 + jolt, top + 19); ctx.lineTo(px + 14 + jolt, top + 22); }
      ctx.stroke();
      ctx.fillStyle = "rgba(233,226,238,0.35)";
      for (let px = x + 30; px < x + w; px += 64) { const sway = st.t >= 0 ? (st.t % 9) * 1.5 : Math.sin(S.time * 2 + px) * 1.5; ctx.fillRect(px + jolt, top + 25 + sway, 3, 3); ctx.fillRect(px + 22 + jolt, top + 28 - sway * 0.5, 2, 2); }
    });
    // Spikes sink into a slotted plate; just before they rise, their tips show.
    for (const sp of traps.spikes) {
      const x = sp.x - sp.w / 2;
      if (!onScreen({ x, y: sp.y - 60 }, { x: x + sp.w, y: sp.y })) continue;
      const { up, warn } = spikeAt(S.time, sp.phase);
      if (up > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(x - 8, sp.y - 120, sp.w + 16, 120); ctx.clip();
        ctx.translate(warn ? Math.sin(S.time * 60) * 1.5 : 0, (1 - up) * SPIKE_H * 1.3);
        drawSpikes(ctx, x - 6, sp.y, sp.w + 12);
        ctx.restore();
      }
      ctx.fillStyle = DARK; ctx.fillRect(x - 6, sp.y - 5, sp.w + 12, 5);
      ctx.fillStyle = warn ? HOT : IRON; for (let px = x; px < x + sp.w; px += 16) ctx.fillRect(px + 4, sp.y - 4, 8, 2);
    }
    // A vent's grate; before it blasts, embers and a lick of flame; then a column of fire in bands, hottest at its heart.
    for (const fl of traps.flames) {
      const x = fl.x - fl.w / 2;
      if (!onScreen({ x, y: fl.y - fl.h - 20 }, { x: x + fl.w, y: fl.y })) continue;
      const { up, warn } = flameAt(S.time, fl.phase), h = warn ? 22 : fl.h * up;
      if (h > 0) {
        for (const [k, color] of [[1, RAMP[0]], [0.72, RAMP[1]], [0.45, RAMP[2]], [0.2, RAMP[3]]] as const) {
          const bands = Math.max(2, Math.round((h * k) / 12));
          ctx.fillStyle = color;
          for (let b = 0; b < bands; b++) {
            const t = b / bands, wide = fl.w * k * (1 - t * 0.55) * (0.85 + 0.15 * Math.sin(S.time * 31 + b * 1.7 + fl.x));
            ctx.fillRect(fl.x - wide / 2 + Math.sin(S.time * 23 + b) * 3, fl.y - (b + 1) * (h * k / bands), wide, h * k / bands + 1);
          }
        }
      }
      if (warn || up > 0) for (let e = 0; e < 5; e++) {
        const life = (S.time * 1.3 + e * 0.37 + fl.x * 0.01) % 1;
        ctx.globalAlpha = 1 - life; ctx.fillStyle = RAMP[2]; ctx.fillRect(fl.x + Math.sin(e * 2.3 + S.time * 3) * fl.w * 0.4, fl.y - h - life * 60, 3, 3); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = DARK; ctx.fillRect(x - 4, fl.y - 6, fl.w + 8, 6);
      ctx.fillStyle = warn || up > 0 ? HOT : "#5a4a44"; for (let px = x; px < x + fl.w; px += 12) ctx.fillRect(px + 2, fl.y - 5, 6, 3);
    }
    // A seam: ground with a crack that glows hotter as it comes to open, shakes red just before, and is a glowing gap while open.
    for (const s of traps.seams) {
      const x = s.x - s.w / 2;
      if (!onScreen({ x, y: s.y - 20 }, { x: x + s.w, y: s.y + 40 })) continue;
      const { open, warn, glow } = seamAt(S.time, s.phase), jolt = warn ? Math.sin(S.time * 55) * 1.5 : 0;
      if (open) {
        const g = ctx.createLinearGradient(0, s.y, 0, s.y + 40); g.addColorStop(0, "rgba(255,110,40,0.55)"); g.addColorStop(1, "rgba(255,110,40,0)");
        ctx.fillStyle = g; ctx.fillRect(x, s.y, s.w, 40);
        ctx.fillStyle = DARK; ctx.fillRect(x - 3, s.y, 6, 22); ctx.fillRect(x + s.w - 3, s.y, 6, 22);
        continue;
      }
      drawSlab(ctx, T, "ledge", x + jolt, s.y, s.w, 22);
      ctx.strokeStyle = warn ? HOT : `rgba(255,140,60,${0.15 + glow * 0.45})`; ctx.lineWidth = warn ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x + 6 + jolt, s.y + 11);
      for (let px = x + 18; px < x + s.w - 6; px += 14) ctx.lineTo(px + jolt, s.y + 11 + ((px / 14) % 2 ? -4 : 4));
      ctx.lineTo(x + s.w - 6 + jolt, s.y + 11); ctx.stroke();
    }
    // A wagon of the convoy on its track: an iron rail end to end, a plank bed bound with iron, its wheels turning as it runs.
    // A false wall: the wall's own rock until it is walked through, then only its outline.
    traps.veils.forEach((v, i) => {
      if (!onScreen(v, { x: v.x + 64, y: v.y + 64 })) return;
      if (S.traps.unveiled?.[i]) { ctx.strokeStyle = "rgba(233,226,238,0.35)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeRect(v.x + 2, v.y + 2, 60, 60); ctx.setLineDash([]); return; }
      scenery.fill(ctx, T, v.x, v.y, 64, 64, false); tell(v.x, v.y, 64, 0);
    });
    // The air of a hidden chamber nobody has been inside: rock, like everything round it.
    // (With the rock just below and beside it, whose edges would otherwise be lit as if they faced open air.)
    traps.hollows.forEach((c, i) => { if (!S.traps.opened?.[i] && onScreen({ x: c.x - 64, y: c.y }, { x: c.x + 128, y: c.y + 128 })) scenery.fill(ctx, T, c.x - 16, c.y, 96, c.on ? 104 : 64, false); });
    // A warning post: a timber post with a board of red and pale chevrons, at the start of a gauntlet.
    for (const p of traps.signs) {
      if (!onScreen({ x: p.x - 30, y: p.y - 110 }, { x: p.x + 30, y: p.y })) continue;
      ctx.fillStyle = "#4a3322"; ctx.fillRect(p.x - 4, p.y - 96, 8, 96);
      ctx.fillStyle = "#e9e2d0"; ctx.fillRect(p.x - 24, p.y - 104, 48, 26);
      ctx.fillStyle = "#c0392b"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(p.x - 22 + k * 12, p.y - 102); ctx.lineTo(p.x - 14 + k * 12, p.y - 91); ctx.lineTo(p.x - 22 + k * 12, p.y - 80); ctx.lineTo(p.x - 17 + k * 12, p.y - 80); ctx.lineTo(p.x - 9 + k * 12, p.y - 91); ctx.lineTo(p.x - 17 + k * 12, p.y - 102); ctx.fill(); }
    }
    // A binding thread: a glowing rune on each anchor; slack, a faint dotted line; flickering before it pulls taut; taut, a bright gold cord.
    for (const t of traps.threads) {
      if (!onScreen({ x: t.x0 - 64, y: t.y - 30 }, { x: t.x1 + 64, y: t.y + 30 })) continue;
      const { taut, warn } = threadAt(S.time, t.phase);
      ctx.fillStyle = taut ? "#ffe28a" : warn ? `rgba(255,226,138,${0.5 + 0.5 * Math.sin(S.time * 40)})` : "#8a7440";
      for (const x of [t.x0 - 32, t.x1 + 32]) { ctx.fillRect(x - 3, t.y - 14, 6, 28); ctx.fillRect(x - 10, t.y - 3, 20, 6); }
      if (taut) {
        ctx.shadowColor = "#ffd34a"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffd34a"; ctx.fillRect(t.x0, t.y - 4, t.x1 - t.x0, 8);
        ctx.shadowBlur = 0; ctx.fillStyle = "#fff6d0"; ctx.fillRect(t.x0, t.y - 1, t.x1 - t.x0, 2);
      } else if (warn > 0) {
        ctx.fillStyle = `rgba(255,226,138,${(0.3 + 0.6 * warn) * (0.5 + 0.5 * Math.sin(S.time * 40))})`; ctx.fillRect(t.x0, t.y - 1, t.x1 - t.x0, 2);
      } else { ctx.fillStyle = "rgba(255,226,138,0.18)"; for (let x = t.x0; x < t.x1; x += 16) ctx.fillRect(x, t.y - 1, 6, 2); }
    }
    // Floorboards: planks with their grain; charred and glowing behind a fire, and the fire itself licking up off them.
    for (const p of traps.planks) {
      if (!onScreen({ x: p.x0, y: p.y - 90 }, { x: p.x1, y: p.y + 20 })) continue;
      ctx.fillStyle = "#7a4a26"; ctx.fillRect(p.x0, p.y, p.x1 - p.x0, 14);
      ctx.fillStyle = "#5a3418"; for (let x = p.x0; x < p.x1; x += 32) ctx.fillRect(x, p.y, 2, 14); ctx.fillRect(p.x0, p.y + 6, p.x1 - p.x0, 1);
      const f = fireAt(S.time, p);
      if (!f) continue;
      const back = p.dir > 0 ? { x0: Math.max(p.x0, f.x0 - 3 * 64), x1: f.x0 } : { x0: f.x1, x1: Math.min(p.x1, f.x1 + 3 * 64) };
      ctx.fillStyle = "rgba(20,10,8,0.8)"; ctx.fillRect(back.x0, p.y, back.x1 - back.x0, 14);
      ctx.fillStyle = "#ff5a1f"; for (let x = back.x0; x < back.x1; x += 12) if ((x * 7 + Math.floor(S.time * 8)) % 5 === 0) ctx.fillRect(x, p.y + 3, 4, 3);
      for (let x = f.x0; x < f.x1; x += 10) {
        const h = 30 + 26 * Math.abs(Math.sin(S.time * 9 + x * 0.13));
        ctx.fillStyle = "rgba(255,90,20,0.85)"; ctx.fillRect(x, p.y - h, 10, h);
        ctx.fillStyle = "rgba(255,210,80,0.9)"; ctx.fillRect(x + 2, p.y - h * 0.55, 6, h * 0.55);
      }
    }
    // A mortar: a squat iron tube on a timber bed; the red ring where its shell will land, closing as it falls; the shell; the burst.
    for (const m of traps.mortars) {
      if (!onScreen({ x: m.x - 40, y: m.y - 60 }, { x: m.x + 40, y: m.y + 64 })) continue;
      ctx.fillStyle = "#5a3a22"; ctx.fillRect(m.x - 30, m.y - 14, 60, 14); ctx.fillStyle = "#3a2414"; ctx.fillRect(m.x - 30, m.y - 14, 60, 3);
      ctx.fillStyle = "#2b2a30"; ctx.save(); ctx.translate(m.x, m.y - 12); ctx.rotate(-0.5); ctx.fillRect(-12, -40, 24, 44); ctx.fillStyle = "#55535c"; ctx.fillRect(-14, -44, 28, 8); ctx.restore();
    }
    for (const s of S.traps.shells ?? []) {
      const u = s.t / s.T;
      ctx.strokeStyle = `rgba(255,60,40,${0.4 + 0.5 * u})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x1, s.y1 - 3, SHELL_BURST * (1.15 - 0.15 * u), 10, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(255,60,40,${0.12 + 0.18 * u})`; ctx.fill();
      const p = shellAt(s);
      ctx.fillStyle = "#ffb040"; ctx.fillRect(p.x - 2, p.y + 6, 4, 6);
      ctx.fillStyle = "#18171c"; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of S.traps.booms ?? []) {
      const r = 20 + b.t * 4; ctx.fillStyle = `rgba(255,${160 - b.t * 4},60,${1 - b.t / 24})`; ctx.beginPath(); ctx.arc(b.x, b.y - 20, r, 0, Math.PI * 2); ctx.fill();
    }
    // A belt: a band of dark iron slats sliding the way it runs, with brass chevrons pointing that way, and rollers at its ends.
    for (const b of traps.belts) {
      if (!onScreen({ x: b.x0, y: b.y - 10 }, { x: b.x1, y: b.y + 30 })) continue;
      ctx.fillStyle = "#1c1a1f"; ctx.fillRect(b.x0, b.y, b.x1 - b.x0, 16);
      const shift = (((S.time * 60 * BELT_SPEED * b.dir) % 32) + 32) % 32;
      ctx.save(); ctx.beginPath(); ctx.rect(b.x0, b.y, b.x1 - b.x0, 16); ctx.clip();
      ctx.fillStyle = "#3d3a44"; for (let x = b.x0 - 32 + shift; x < b.x1; x += 32) ctx.fillRect(x, b.y + 2, 26, 12);
      ctx.strokeStyle = "#e0b24a"; ctx.lineWidth = 3;
      for (let x = b.x0 - 32 + shift; x < b.x1; x += 32) { ctx.beginPath(); ctx.moveTo(x + 8, b.y + 4); ctx.lineTo(x + 8 + 8 * b.dir, b.y + 8); ctx.lineTo(x + 8, b.y + 12); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = "#8a6a2a"; for (const x of [b.x0, b.x1]) { ctx.beginPath(); ctx.arc(x, b.y + 8, 9, 0, Math.PI * 2); ctx.fill(); }
    }
    // A blade-lift: a guide of faint runes up the way it travels, and a row of floating blades glowing with the hero's water.
    for (const l of traps.lifts) {
      if (!onScreen({ x: l.x - l.w, y: l.y - l.rise - 20 }, { x: l.x + l.w, y: l.y + 20 })) continue;
      ctx.fillStyle = "rgba(120,210,255,0.25)"; for (let y = l.y - l.rise; y < l.y; y += 32) { ctx.fillRect(l.x - l.w / 2 - 6, y, 3, 12); ctx.fillRect(l.x + l.w / 2 + 3, y, 3, 12); }
      const top = liftAt(S.time, l), x0 = l.x - l.w / 2;
      ctx.shadowColor = "#5fd0ff"; ctx.shadowBlur = 22; ctx.fillStyle = "#1f8fd0"; ctx.fillRect(x0, top, l.w, 22); ctx.shadowBlur = 0;
      ctx.fillStyle = "#7fe0ff"; ctx.fillRect(x0 + 3, top + 3, l.w - 6, 6); ctx.fillStyle = "#e8fbff"; ctx.fillRect(x0, top, l.w, 2);
      for (let k = 0; k < l.w / 32; k++) {
        const bx = x0 + 6 + k * 32, bob = Math.sin(S.time * 3 + k) * 2;
        ctx.fillStyle = "#f2f8ff"; ctx.beginPath(); ctx.moveTo(bx, top + 12 + bob); ctx.lineTo(bx + 24, top + 10 + bob); ctx.lineTo(bx + 28, top + 15 + bob); ctx.lineTo(bx, top + 19 + bob); ctx.fill();
        ctx.fillStyle = "#c9a04a"; ctx.fillRect(bx - 5, top + 10 + bob, 5, 11);
      }
      for (let k = 0; k < 3; k++) { const t = (S.time * 1.5 + k / 3) % 1; ctx.fillStyle = `rgba(127,224,255,${0.6 * (1 - t)})`; ctx.fillRect(x0 + 8 + k * (l.w - 16) / 2, top + 22 + t * 26, 4, 4); }
    }
    for (const w of traps.wagons) {
      if (!onScreen({ x: w.from - w.w, y: w.y - 20 }, { x: w.to + w.w, y: w.y + 50 })) continue;
      ctx.fillStyle = DARK; ctx.fillRect(w.from - w.w / 2, w.y + 34, w.to - w.from + w.w, 4);
      for (let px = w.from - w.w / 2; px <= w.to + w.w / 2; px += 64) ctx.fillRect(px - 2, w.y + 34, 4, 10);
      const x = wagonAt(S.time, w), x0 = x - w.w / 2;
      ctx.fillStyle = "#5a3a22"; ctx.fillRect(x0, w.y, w.w, 22);
      ctx.fillStyle = "#3a2414"; for (let px = x0 + 16; px < x0 + w.w; px += 16) ctx.fillRect(px, w.y + 2, 2, 18);
      ctx.fillStyle = IRON; ctx.fillRect(x0, w.y, w.w, 3); ctx.fillRect(x0 + 6, w.y + 8, 4, 8); ctx.fillRect(x0 + w.w - 10, w.y + 8, 4, 8);
      for (const cx of [x0 + 24, x0 + w.w - 24]) {
        ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(cx, w.y + 28, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = IRON; ctx.lineWidth = 2; ctx.beginPath(); const a = x / 10; ctx.moveTo(cx - Math.cos(a) * 8, w.y + 28 - Math.sin(a) * 8); ctx.lineTo(cx + Math.cos(a) * 8, w.y + 28 + Math.sin(a) * 8); ctx.stroke();
      }
    }
    // A bookcase on an iron arm, out of its slot in the wall: it rattles in the slot, rams out, and is drawn slowly back.
    const SPINES = ["#7a2e2e", "#2e4a7a", "#6a5a2a", "#3a6a3a", "#5a2e6a"];
    for (const r of traps.rams) {
      if (!onScreen({ x: r.x - 300, y: r.y - 40 }, { x: r.x + 300, y: r.y + 40 })) continue;
      const { out, warn } = ramAt(S.time, r.phase), jolt = warn ? Math.sin(S.time * 60) * 2 : 0, face = r.x + r.dir * (out * r.reach + 6) + jolt * r.dir;
      ctx.fillStyle = DARK; ctx.fillRect(r.x - (r.dir > 0 ? 8 : 0), r.y - 32, 8, 64);
      if (out > 0) { ctx.fillStyle = IRON; ctx.fillRect(Math.min(r.x, face), r.y - 4, Math.abs(face - r.x), 8); }
      const x0 = r.dir > 0 ? face - 56 : face;
      ctx.fillStyle = "#4a2e1a"; ctx.fillRect(x0, r.y - 30, 56, 60);
      ctx.fillStyle = "#2a190e"; ctx.fillRect(x0 + 3, r.y - 27, 50, 25); ctx.fillRect(x0 + 3, r.y + 2, 50, 25);
      for (let k = 0; k < 10; k++) { ctx.fillStyle = SPINES[(k * 3 + Math.round(r.x)) % SPINES.length]; ctx.fillRect(x0 + 5 + (k % 5) * 10, r.y + (k < 5 ? -25 : 4), 7, 21 - (k % 3) * 3); }
      ctx.fillStyle = warn ? HOT : "#8a6a44"; ctx.fillRect(r.dir > 0 ? x0 + 52 : x0, r.y - 30, 4, 60);
    }
    // A grave-lantern: a post with a green flame, dim while it sleeps; and the shades it has woken, pale copies of the fighter.
    traps.lanterns.forEach((l, i) => {
      if (!onScreen({ x: l.x - 30, y: l.y - 110 }, { x: l.x + 30, y: l.y })) return;
      const L = S.traps, lit = !L.lanternAt || L.step - L.lanternAt[i] >= LANTERN_SLEEP;
      ctx.fillStyle = "#2b2420"; ctx.fillRect(l.x - 4, l.y - 80, 8, 80); ctx.fillRect(l.x - 14, l.y - 84, 28, 6);
      ctx.fillStyle = "#4a3f36"; ctx.fillRect(l.x - 11, l.y - 106, 22, 22);
      const f = lit ? 0.75 + 0.25 * Math.sin(S.time * 9 + i) : 0.18;
      ctx.shadowColor = "#7dffb0"; ctx.shadowBlur = lit ? 18 : 0; ctx.fillStyle = `rgba(125,255,176,${f})`; ctx.fillRect(l.x - 7, l.y - 102, 14, 14); ctx.shadowBlur = 0;
    });
    for (const s of S.traps.shades ?? []) {
      const age = S.traps.step - s.born, l = traps.lanterns[s.from];
      const p = age < SHADE_LAG ? { x: l.x, y: l.y - 60 - (age / SHADE_LAG) * 20 } : S.traps.trail[0];
      if (!p) continue;
      const a = age < SHADE_LAG ? 0.25 + 0.35 * (age / SHADE_LAG) : Math.min(0.75, (SHADE_LAG + SHADE_LIFE - age) / 40);
      ctx.globalAlpha = a; ctx.shadowColor = "#a8ffd0"; ctx.shadowBlur = 16; ctx.fillStyle = "#c8ffe0";
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 10, 18, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(p.x, p.y - 46, 13, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "#0b1a14"; ctx.fillRect(p.x - 7, p.y - 50, 4, 5); ctx.fillRect(p.x + 3, p.y - 50, 4, 5); ctx.globalAlpha = 1;
    }
    // A tide pool: dark green water with a rippling top, bubbles coming up just before it floods, and tide marks behind it.
    for (const p of traps.tides) {
      if (!onScreen({ x: p.x0, y: p.y - TIDE_H - 20 }, { x: p.x1, y: p.y })) continue;
      const { level, stirring } = tideAt(S.time, p.x0), top = p.y - TIDE_H * level;
      for (const gx of [p.x0, p.x1 - 8]) {
        ctx.fillStyle = "#2b2420"; ctx.fillRect(gx, p.y - TIDE_H - 8, 8, TIDE_H + 8);
        ctx.fillStyle = "#c9b98f"; for (let k = 1; k <= 3; k++) ctx.fillRect(gx - 3, p.y - (TIDE_H * k) / 3, 14, 3);
      }
      ctx.fillStyle = "rgba(10,55,45,0.8)"; ctx.fillRect(p.x0 + 8, top, p.x1 - p.x0 - 16, p.y - top);
      ctx.fillStyle = "rgba(200,255,225,0.95)";
      for (let x = p.x0 + 8; x < p.x1 - 8; x += 8) ctx.fillRect(x, top + Math.sin(S.time * 4 + x * 0.05) * 2 - 2, 8, 4);
      for (let k = 0; k < (p.x1 - p.x0) / 40 * (0.3 + stirring * 2); k++) { const t = (S.time * (1 + stirring * 2) + k * 0.37) % 1; ctx.fillRect(p.x0 + 10 + ((k * 53) % (p.x1 - p.x0 - 20)), p.y - t * Math.max(14, p.y - top), 4, 4); }
    }
    // A grave: a mound of turned earth with a leaning marker; it shivers as it stirs, and grey hands reach up out of it.
    traps.graves.forEach((g, i) => {
      const x = g.x - g.w / 2;
      if (!onScreen({ x, y: g.y - 90 }, { x: x + g.w, y: g.y })) return;
      const st = S.traps.graves?.[i] ?? { mode: 0, t: 0 }, shiver = st.mode === 1 ? Math.sin(S.time * 60) * 2 : 0;
      const mist = ctx.createLinearGradient(0, g.y - 70, 0, g.y);
      mist.addColorStop(0, "rgba(200,255,220,0)"); mist.addColorStop(1, `rgba(200,255,220,${st.mode === 1 ? 0.45 + 0.2 * Math.sin(S.time * 30) : 0.22})`);
      ctx.fillStyle = mist; ctx.fillRect(x, g.y - 70, g.w, 70);
      ctx.fillStyle = "#7a5c40"; ctx.beginPath(); ctx.ellipse(g.x + shiver, g.y, g.w / 2, 14, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#a07a55"; for (let k = 0; k < g.w / 12; k++) ctx.fillRect(x + 6 + k * 12 + shiver, g.y - 6 - ((k * 7) % 6), 6, 4);
      for (let m = 0; m < g.w / 64; m++) { const mx = x + 32 + m * 64; ctx.save(); ctx.translate(mx + shiver, g.y - 6); ctx.rotate(((m % 2) - 0.5) * 0.25); ctx.fillStyle = "#2a2622"; ctx.fillRect(-11, -50, 22, 50); ctx.fillStyle = "#cfc8b8"; ctx.fillRect(-9, -48, 18, 46); ctx.fillRect(-16, -38, 32, 9); ctx.fillStyle = "#8f887a"; ctx.fillRect(-2, -44, 4, 36); ctx.restore(); }
      const up = st.mode === 2 ? Math.min(1, (GRAVE_GRASP - st.t) / 6) : st.mode === 3 ? Math.max(0, 1 - (GRAVE_REST - st.t) / 12) : st.mode === 1 ? 0.3 : 0;
      if (up <= 0) return;
      ctx.fillStyle = "#e4ece0";
      for (let k = 0; k < g.w / 22; k++) {
        const hx = x + 10 + k * 22 + ((k * 13) % 7), h = up * (34 + ((k * 17) % 16)), sway = Math.sin(S.time * 7 + k) * 3 * up;
        ctx.fillRect(hx + sway, g.y - h, 6, h); ctx.fillRect(hx + sway - 3, g.y - h - 6, 3, 8); ctx.fillRect(hx + sway + 1, g.y - h - 9, 2, 10); ctx.fillRect(hx + sway + 4, g.y - h - 8, 2, 9); ctx.fillRect(hx + sway + 7, g.y - h - 5, 3, 7);
      }
    });
    // The Witness's eyes: an almond lid in the rock that opens on a pale iris; and the wisps they send, trailing light.
    traps.eyes.forEach((eye, i) => {
      if (!onScreen({ x: eye.x - 40, y: eye.y - 40 }, { x: eye.x + 40, y: eye.y + 40 })) return;
      const { open } = eyeAt(S.time, i);
      ctx.fillStyle = "#14100f"; ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 24, 14, 0, 0, Math.PI * 2); ctx.fill();
      if (open > 0.02) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 22, 12 * open, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = "#e9f4e6"; ctx.fillRect(eye.x - 24, eye.y - 14, 48, 28);
        ctx.fillStyle = "#5fbf8f"; ctx.beginPath(); ctx.arc(eye.x, eye.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.arc(eye.x, eye.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = "#6e5a4a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(eye.x, eye.y, 24, 14, 0, 0, Math.PI * 2); ctx.stroke();
    });
    for (const w of S.traps.wisps ?? []) {
      const fade = Math.min(1, w.life / 40, (WISP_LIFE - w.life + 10) / 20);
      for (let k = 3; k >= 0; k--) { ctx.globalAlpha = fade * (k ? 0.18 : 0.9); ctx.fillStyle = k ? "#9fffd0" : "#f0fff6"; ctx.beginPath(); ctx.arc(w.x - w.vx * k * 4, w.y - w.vy * k * 4, k ? 12 - k * 2 : 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // A path of the dead: a pale ledge with wisps rising from it, flickering as it fades; a faint outline while it is gone.
    for (const p of traps.spirits) {
      const x = p.x - p.w / 2;
      if (!onScreen({ x, y: p.y - 30 }, { x: x + p.w, y: p.y + 30 })) continue;
      const { solid, fade } = spiritAt(S.time, p.set), tint = p.set ? "200,255,230" : "220,235,255";
      if (!solid) { ctx.strokeStyle = `rgba(${tint},0.22)`; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.strokeRect(x + 1, p.y + 1, p.w - 2, 20); ctx.setLineDash([]); continue; }
      const a = (1 - fade * 0.8) * (fade > 0 ? 0.6 + 0.4 * Math.sin(S.time * 50) : 1);
      ctx.globalAlpha = a; ctx.shadowColor = `rgb(${tint})`; ctx.shadowBlur = 14;
      ctx.fillStyle = `rgb(${tint})`; ctx.fillRect(x, p.y, p.w, 22);
      ctx.shadowBlur = 0; ctx.fillStyle = p.set ? "#7fe0b0" : "#9cc4f0"; ctx.fillRect(x + 3, p.y + 6, p.w - 6, 13);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x, p.y, p.w, 3); ctx.globalAlpha = 1;
      for (let k = 0; k < p.w / 32; k++) { const t = (S.time * 0.7 + k * 0.29) % 1; ctx.fillStyle = `rgba(${tint},${(1 - t) * 0.6 * a})`; ctx.fillRect(x + 12 + k * 32 + Math.sin(S.time * 3 + k) * 4, p.y - t * 30, 3, 6); }
    }
    // A gate: an upright ring of its hero's element, sparks spiralling into it; the two of a pair share a hue.
    traps.gates.forEach((gate, i) => {
      for (const end of [gate.a, gate.b]) {
        if (!onScreen({ x: end.x - 40, y: end.y - 110 }, { x: end.x + 40, y: end.y })) continue;
        const cy = end.y - 52;
        ctx.save(); ctx.filter = `hue-rotate(${i * 70}deg)`;
        for (const [w, color] of [[10, RAMP[1]], [5, RAMP[2]], [2, RAMP[3]]] as const) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(end.x, cy, 24 + Math.sin(S.time * 4) * 2, 48, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 0.25; ctx.fillStyle = RAMP[2]; ctx.beginPath(); ctx.ellipse(end.x, cy, 20, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        for (let k = 0; k < 6; k++) { const t = (S.time * 0.8 + k / 6) % 1, a = t * Math.PI * 4 + k; ctx.fillStyle = RAMP[3]; ctx.fillRect(end.x + Math.cos(a) * 24 * (1 - t), cy + Math.sin(a) * 48 * (1 - t), 3, 3); }
        ctx.restore();
      }
    });
    // A soldier frozen in ice: a figure in a pale block, blade raised; it shakes and cracks before it slashes, then sinks back.
    traps.frozen.forEach((f, i) => {
      if (!onScreen({ x: f.x - 160, y: f.y - 130 }, { x: f.x + 160, y: f.y })) return;
      const st = S.traps.frozen[i] ?? { mode: 0, t: 0 }, jolt = st.mode === 1 ? Math.sin(S.time * 70) * 2 : 0, x = f.x + jolt;
      ctx.fillStyle = st.mode === 2 ? "rgba(200,235,255,0.25)" : "rgba(170,220,255,0.55)"; ctx.fillRect(x - 24, f.y - 104, 48, 104);
      ctx.strokeStyle = "rgba(235,250,255,0.9)"; ctx.lineWidth = 2; ctx.strokeRect(x - 24, f.y - 104, 48, 104);
      ctx.strokeStyle = "#1c2a3a"; ctx.fillStyle = "#1c2a3a"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, f.y - 82, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, f.y - 74); ctx.lineTo(x - f.dir * 4, f.y - 40); ctx.lineTo(x - f.dir * 12, f.y - 4); ctx.moveTo(x - f.dir * 4, f.y - 40); ctx.lineTo(x + f.dir * 10, f.y - 6); ctx.stroke();
      const raised = st.mode === 2 ? 0.6 : st.mode === 3 ? -0.3 : -1.1, hand = { x: x + f.dir * 10, y: f.y - 62 };
      ctx.beginPath(); ctx.moveTo(x, f.y - 66); ctx.lineTo(hand.x, hand.y); ctx.stroke();
      ctx.strokeStyle = "#d8e4f0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x + f.dir * Math.cos(raised) * 44, hand.y + Math.sin(raised) * 44); ctx.stroke();
      if (st.mode === 1) { ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 20, f.y - 90); ctx.lineTo(x - 4, f.y - 60); ctx.lineTo(x - 14, f.y - 30); ctx.moveTo(x + 18, f.y - 80); ctx.lineTo(x + 6, f.y - 50); ctx.stroke(); }
      if (st.mode === 2) { ctx.strokeStyle = RAMP[3]; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, f.y - 50, FROZEN_REACH * 0.8, f.dir > 0 ? -1.2 : Math.PI - 0.4, f.dir > 0 ? 0.4 : Math.PI + 1.2); ctx.stroke(); ctx.strokeStyle = RAMP[2]; ctx.lineWidth = 2; ctx.stroke(); }
    });
    // Ice: a pale glaze over the ground, with a glint that slides along it.
    for (const [x0, top, x1] of traps.ice) {
      if (!onScreen({ x: x0, y: top - 10 }, { x: x1, y: top + 10 })) continue;
      ctx.fillStyle = "rgba(150,215,255,0.75)"; ctx.fillRect(x0, top - 6, x1 - x0, 12);
      ctx.fillStyle = "rgba(235,250,255,0.95)"; ctx.fillRect(x0, top - 6, x1 - x0, 3);
      ctx.fillStyle = "rgba(220,245,255,0.9)"; for (let px = x0 + 10; px < x1 - 6; px += 30) { ctx.fillRect(px, top - 12, 3, 6); ctx.fillRect(px + 9, top - 9, 2, 3); }
      const glint = x0 + (((S.time * 120 + x0) % (x1 - x0 + 80)) - 40);
      if (glint > x0 && glint < x1 - 24) { ctx.fillStyle = "rgba(255,255,255,1)"; ctx.fillRect(glint, top - 6, 24, 3); }
    }
    // A gust: its vent, a few motes stirring before it blows, then streaks racing along its rows the way it blows.
    for (const g of traps.gusts) {
      const far = g.x + g.dir * g.reach;
      if (!onScreen({ x: Math.min(g.x, far), y: g.y - 70 }, { x: Math.max(g.x, far), y: g.y + 70 })) continue;
      const { blow, stir } = gustAt(S.time, g.phase);
      ctx.fillStyle = DARK; ctx.fillRect(g.x - (g.dir > 0 ? 10 : 0), g.y + 6, 10, 52);
      ctx.fillStyle = blow > 0 || stir ? RAMP[2] : RAMP[0]; for (let k = 0; k < 4; k++) ctx.fillRect(g.x - (g.dir > 0 ? 8 : -2), g.y + 12 + k * 12, 6, 4);
      const motes = stir ? 4 : blow > 0 ? 16 : 0;
      for (let k = 0; k < motes; k++) {
        const t = (S.time * (stir ? 0.6 : 2.2) + k * 0.137) % 1, y = g.y - 54 + ((k * 37) % 108);
        ctx.globalAlpha = (stir ? 0.5 : 0.75 * blow) * (1 - t); ctx.fillStyle = k % 3 ? RAMP[3] : RAMP[2];
        ctx.fillRect(g.x + g.dir * t * g.reach - (g.dir > 0 ? 18 : 0), y, stir ? 3 : 18, 2);
      }
      ctx.globalAlpha = 1;
    }
    // A bell on a short chain: still, then swinging, then tolling a ring of its hero's element that spreads and fades.
    for (const b of traps.bells) {
      if (!onScreen({ x: b.x - b.reach, y: b.y - b.reach }, { x: b.x + b.reach, y: b.y + b.reach })) continue;
      const { swing, ring } = bellAt(S.time, b);
      if (ring !== null) {
        const fade = 1 - ring / b.reach;
        ctx.globalAlpha = fade; ctx.strokeStyle = RAMP[2]; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(b.x, b.y + 14, ring, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = RAMP[3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y + 14, ring, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = IRON; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y - 32); ctx.lineTo(b.x, b.y - 16); ctx.stroke();
      ctx.save(); ctx.translate(b.x, b.y - 16); ctx.rotate(swing);
      ctx.fillStyle = "#a8742e"; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-12, 22, -22, 34); ctx.lineTo(22, 34); ctx.quadraticCurveTo(12, 22, 8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#d8a45a"; ctx.fillRect(-20, 30, 40, 4); ctx.fillStyle = "#6e4a1c"; ctx.beginPath(); ctx.arc(0, 36, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // A jet: its nozzle glows and sputters, then it blasts a beam of its element: a crackling zigzag for lightning, bands for the rest.
    for (const j of traps.jets) {
      const far = j.x + j.dir * j.reach;
      if (!onScreen({ x: Math.min(j.x, far) - 20, y: j.y - 40 }, { x: Math.max(j.x, far) + 20, y: j.y + 40 })) continue;
      const { on, warn } = jetAt(S.time, j.phase);
      ctx.fillStyle = DARK; ctx.fillRect(j.x - (j.dir > 0 ? 10 : 0), j.y - 16, 10, 32);
      ctx.fillStyle = warn || on ? RAMP[2] : RAMP[0]; ctx.fillRect(j.x - (j.dir > 0 ? 7 : -1), j.y - 9, 6, 18);
      if (warn) for (let k = 0; k < 4; k++) { const t = (S.time * 3 + k * 0.25) % 1; ctx.fillStyle = RAMP[k % 2 ? 3 : 2]; ctx.fillRect(j.x + j.dir * t * 40, j.y + Math.sin(S.time * 40 + k) * 8, 3, 3); }
      if (!on) continue;
      if (element === "volt") {
        for (const [width, color] of [[6, RAMP[1]], [2, RAMP[3]]] as const) {
          ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(j.x, j.y);
          for (let s = 1; s <= 10; s++) ctx.lineTo(j.x + j.dir * (j.reach * s) / 10, j.y + (s < 10 ? Math.sin(S.time * 90 + s * 2.7) * 14 : 0));
          ctx.stroke();
        }
        continue;
      }
      for (const [k, color] of [[1, RAMP[0]], [0.7, RAMP[1]], [0.42, RAMP[2]], [0.18, RAMP[3]]] as const) {
        const bands = Math.max(3, Math.round(j.reach / 14));
        ctx.fillStyle = color;
        for (let b = 0; b < bands; b++) {
          const t = b / bands, tall = 44 * k * (0.75 + 0.25 * t) * (0.85 + 0.15 * Math.sin(S.time * 33 + b * 1.9));
          ctx.fillRect(Math.min(j.x + j.dir * t * j.reach, j.x + j.dir * (t + 1 / bands) * j.reach), j.y - tall / 2 + Math.sin(S.time * 25 + b) * 2, j.reach / bands + 1, tall);
        }
      }
    }
    // A blade on a chain, a toothed wheel turning as it swings, with a smear where it has just been.
    for (const b of traps.blades) {
      if (!onScreen({ x: b.x - b.len, y: b.y }, { x: b.x + b.len, y: b.y + b.len + 40 })) continue;
      for (const back of [0.08, 0.04]) { const { tip } = bladeAt(S.time - back, b); ctx.fillStyle = `rgba(233,226,238,${back * 2})`; ctx.beginPath(); ctx.arc(tip.x, tip.y, BLADE_R, 0, Math.PI * 2); ctx.fill(); }
      const { tip } = bladeAt(S.time, b);
      ctx.strokeStyle = IRON; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
      // In the Ember's places a blade is a censer: a bowl of coals on its chain, tilting as it swings and shedding sparks.
      if (L?.theme === "ember" || L?.theme === "shrine") {
        const { a } = bladeAt(S.time, b);
        for (let k = 0; k < 4; k++) { const life = (S.time * 2 + k * 0.25) % 1; ctx.fillStyle = `rgba(255,170,70,${1 - life})`; ctx.fillRect(tip.x - Math.sin(a) * 30 * life + (k - 1.5) * 6, tip.y - 10 + life * 34, 3, 3); }
        ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(-a);
        ctx.fillStyle = "#a8742e"; ctx.beginPath(); ctx.arc(0, -4, BLADE_R, 0, Math.PI); ctx.fill();
        ctx.fillStyle = "#6e4a1c"; ctx.fillRect(-BLADE_R - 3, -8, BLADE_R * 2 + 6, 6);
        ctx.fillStyle = HOT; ctx.beginPath(); ctx.ellipse(0, -9, BLADE_R - 6, 7, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#ffd45a"; for (let k = -2; k <= 2; k++) ctx.fillRect(k * 7 - 2, -14 - Math.abs(Math.sin(S.time * 17 + k)) * 6, 4, 5);
        ctx.restore();
        continue;
      }
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(S.time * 9);
      ctx.fillStyle = IRON; ctx.beginPath();
      for (let k = 0; k < 20; k++) { const r = k % 2 ? BLADE_R - 6 : BLADE_R + 3, a = (k / 20) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = HOT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, BLADE_R - 9, 0.3, 1.6); ctx.stroke();
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // A slot in the rock glows before it looses; its bolt is gone once it has struck.
    traps.bolts.forEach((b, i) => {
      const { shot, at, warn } = boltAt(S.time, b);
      if (onScreen({ x: b.x - 20, y: b.y - 20 }, { x: b.x + 20, y: b.y + 20 })) {
        ctx.fillStyle = DARK; ctx.fillRect(b.x - (b.dir > 0 ? 12 : 0), b.y - 12, 12, 24);
        ctx.fillStyle = warn ? HOT : "rgba(255,90,54,0.25)"; ctx.globalAlpha = warn ? 0.6 + 0.4 * Math.sin(S.time * 40) : 1;
        ctx.fillRect(b.x - (b.dir > 0 ? 9 : -3) , b.y - 4, 6, 8); ctx.globalAlpha = 1;
      }
      if (at === null || S.traps.struck[i] === shot || !onScreen({ x: at - 40, y: b.y - 10 }, { x: at + 40, y: b.y + 10 })) return;
      const tail = at - b.dir * 34;
      ctx.strokeStyle = IRON; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tail, b.y); ctx.lineTo(at, b.y); ctx.stroke();
      ctx.fillStyle = HOT; ctx.beginPath(); ctx.moveTo(at + b.dir * 8, b.y); ctx.lineTo(at - b.dir * 2, b.y - 5); ctx.lineTo(at - b.dir * 2, b.y + 5); ctx.fill();
      ctx.fillStyle = "#e9e2ee"; ctx.fillRect(Math.min(tail, tail + b.dir * 6), b.y - 4, 6, 8);
    });
    // A block of stone on two chains, teeth under it; it rattles before it falls.
    traps.crushers.forEach((c, i) => {
      const st = S.traps.crushers[i], x = c.x - c.w / 2;
      if (!st || !onScreen({ x, y: c.hang }, { x: x + c.w, y: c.y + c.drop + CRUSH_H })) return;
      const jolt = st.mode === 1 ? Math.sin(S.time * 70) * 2.5 : 0, y = c.y + st.y;
      ctx.strokeStyle = IRON; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.moveTo(x + 18, c.hang); ctx.lineTo(x + 18 + jolt, y); ctx.moveTo(x + c.w - 18, c.hang); ctx.lineTo(x + c.w - 18 + jolt, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#3b3540"; ctx.fillRect(x + jolt, y, c.w, CRUSH_H - 12);
      ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(x + jolt, y, c.w, 4);
      ctx.strokeStyle = DARK; ctx.lineWidth = 2; ctx.strokeRect(x + jolt + 1, y + 1, c.w - 2, CRUSH_H - 14);
      ctx.fillStyle = st.mode === 1 || st.mode === 2 ? HOT : IRON; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const tx = x + jolt + (k + 0.5) * (c.w / 6); ctx.moveTo(tx - 7, y + CRUSH_H - 12); ctx.lineTo(tx, y + CRUSH_H); ctx.lineTo(tx + 7, y + CRUSH_H - 12); }
      ctx.fill();
    });
  }

  function drawStatics() {
    for (const s of S.statics) {
      const { min, max } = s.bounds;
      if (!onScreen(min, max)) continue;
      // Under a sky, the islands of a fight of waves are stone with grass on it, as a duel's ledges are; on paper they are ink.
      const w = max.x - min.x, h = max.y - min.y, T = theme() ?? (S.sky && playing() ? THEMES.duel : null);
      // In the black room only the floor shows, as a line.
      if (S.dark) { if (s.label === "ground") { ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(min.x, min.y, w, 2); } continue; }
      if (T && s.label === "fill") { scenery.fill(ctx, T, min.x, min.y, w, h); continue; }
      if (T) { drawSlab(ctx, T, s.label as "ground" | "ledge" | "wall", min.x, min.y, w, h); continue; }
      ctx.fillStyle = place().ground; ctx.fillRect(min.x, min.y, w, h);
      if (s.label !== "wall") { ctx.fillStyle = PAPER; ctx.fillRect(min.x + 3, min.y + 6, w - 6, 1.5); }
      // Against a sky, ink needs an edge to be seen by.
      if (S.sky && playing()) { ctx.strokeStyle = "rgba(251,251,249,0.75)"; ctx.lineWidth = 2; ctx.strokeRect(min.x, min.y, w, h); }
    }
  }

  /** What stands in a level to be looked at, and the plants that throw: behind the fighters, or in front of them. */
  function drawDecor(front: boolean, onRock = false) {
    const L = S.level, T = theme();
    if (!L || !T) return;
    const near = (d: Decor) => d.x > camX - 700 && d.x < camX + cssW / scale + 700 && d.y > camY - 700 && d.y < camY + cssH / scale + 900;
    for (const [i, d] of (L.decor ?? []).entries()) {
      const onWall = "piece" in d && d.set === "scenery" && !!SCENERY[d.piece]?.wall;
      if (!!d.front !== front || !near(d) || onWall !== onRock) continue;
      if ("plant" in d) drawPlant(ctx, d.plant, d.x, d.y, d.k ?? 1, S.time + d.x * 0.013, true, d.flip);
      else if (d.set === "scenery") { const m = SCENERY[d.piece]; if (!m || scenery.gone(i)) continue;
        drawPiece(ctx, "scenery", d.piece, d.x, d.y + scenery.hangs(d), d.k ?? m.k, true, d.flip, front || m.wall ? 1 : Math.max(T.dim, 0.85), scenery.skew(d, sv)); }
      else drawPiece(ctx, d.set ?? T.set, d.piece, d.x, d.y, d.k ?? T.k, d.set ? d.set !== "mossy" : T.pixel, d.flip, front ? 1 : T.dim);
    }
    if (!front && !onRock) (L.springs ?? []).forEach((spring, i) => drawPlant(ctx, i % 2 ? "plantjump2" : "plantjump", spring.x, spring.y + 4, 1.5, S.sprung[i] === undefined ? 0 : S.time - S.sprung[i], false));
  }

  /** What gives off light in a level besides its scenery: the way out, each clue still to be found (a warm glow that
   * leads the eye to it), the fighter, the grave-lanterns and the grates of fire. */
  function levelLights(): [number, number, number, string][] {
    const L = S.level; if (!L) return [];
    const out: [number, number, number, string][] = [[L.exit.x, L.exit.y, 220, S.sealed ? "220,60,40" : "120,255,214"]];
    L.clues.forEach((c, i) => { if (!S.cluesFound.includes(i)) out.push([c.x, c.y, 120 + Math.sin(S.time * 2 + i) * 20, "255,215,140"]); });
    if (S.hero && playing()) out.push([S.hero.body.position.x, S.hero.body.position.y - 20, 170, "255,240,220"]);
    for (const l of L.traps?.lanterns ?? []) out.push([l.x, l.y - 30, 130, "150,230,200"]);
    for (const f of L.traps?.flames ?? []) out.push([f.x, f.y - 20, 110, "255,140,50"]);
    return out;
  }

  /** The way out of a level, and what is still to be found in it. */
  function drawLevelMarks() {
    const L = S.level;
    if (!L || !S.match.quest) return;
    const { x, y } = L.exit, pulse = 0.5 + Math.sin(S.time * 3) * 0.2;
    if (theme()) {
      // The gate stands on the ground the way out is over; the glow is its doorway.
      if (L.theme && SCENERY[`gate-${L.theme}`]) drawPiece(ctx, "scenery", `gate-${L.theme}`, x, y + 44, SCENERY[`gate-${L.theme}`].k, true);
      else drawPiece(ctx, "gate", "gate", x, y + 44, 3.5, true);
      ctx.fillStyle = S.sealed ? "rgba(212,42,30,0.28)" : `rgba(120,255,214,${pulse * 0.5})`;
      ctx.beginPath(); ctx.ellipse(x + 3, y + 10, 30, 36, 0, Math.PI, 0); ctx.lineTo(x + 33, y + 44); ctx.lineTo(x - 27, y + 44); ctx.fill();
    } else {
    ctx.fillStyle = `rgba(242,178,0,${pulse * 0.35})`; ctx.fillRect(x - 34, y - 96, 68, 136);
    ctx.strokeStyle = place().ground; ctx.lineWidth = 6; ctx.strokeRect(x - 34, y - 96, 68, 136);
    ctx.fillStyle = `rgba(242,178,0,${pulse})`; ctx.fillRect(x - 22, y - 84, 44, 124);
    }
    // The pieces of the key still hidden, and the shut room they open: a red field along its edges.
    for (const key of S.keys) {
      if (key.found) continue;
      const bob = Math.sin(S.time * 4 + key.x) * 5;
      ctx.save(); ctx.translate(key.x, key.y + bob);
      ctx.fillStyle = `rgba(120,255,214,${0.18 + pulse * 0.2})`; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
      blitSprite(ctx, SPRITES.key, -12, -22, 24);
      ctx.restore();
    }
    if (S.locked && S.bossRoom) {
      const [x0, y0, x1, y1] = S.bossRoom;
      ctx.fillStyle = `rgba(212,42,30,${0.25 + pulse * 0.3})`;
      ctx.fillRect(x0 - 8, y0, 8, y1 - y0); ctx.fillRect(x1, y0, 8, y1 - y0); ctx.fillRect(x0 - 8, y0 - 8, x1 - x0 + 16, 8);
    }
    L.clues.forEach((clue, i) => {
      if (S.cluesFound.includes(i)) return;
      const w = 26 + Math.sin(S.time * 5) * 4;
      blitSprite(ctx, SPRITES.clue, clue.x - w / 2, clue.y - w / 2, w);
    });
  }

  function drawProps() {
    for (const b of S.props) {
      if (!onScreen(b.bounds.min, b.bounds.max)) continue;
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
      // An iron ball or a wooden crate, the sprite's outline on the body's edge (sprites.ts).
      const ball = b.label === "ball", w = ball ? (b.circleRadius ?? 18) * 2 * (21 / 19) : (b.size ?? 40) * (22 / 20);
      blitSprite(ctx, ball ? SPRITES.ball : SPRITES.crate, -w / 2, -w / 2, w);
      ctx.restore();
    }
  }

  function chargeBall(p: Vec, r: number, color: string) {
    blitOrb(ctx, color, p.x, p.y, r + Math.sin(S.time * 40) * 2, S.time);
  }

  const hands = (F: Fighter): Vec => { const s = F.skel!; return { x: (s.fistF.x + s.fistB.x) / 2, y: (s.fistF.y + s.fistB.y) / 2 }; };

  function drawBeam(F: Fighter, s: SpecialState) {
    const c = F.char!, o = hands(F), a = s.ang || 0, width = Number(s.p.width), len = Number(s.p.len);
    const w = width + Math.sin(S.time * 55) * width * 0.16;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(Math.atan2(Math.sin(a), F.facing * Math.cos(a)));
    // The beam's middle, its frames tiled along its length and cut off at its end (fxsprites.ts).
    const frame = pixmap(frameAt(fxOf(c.orb).beam, S.time)), h = w + 16, unit = (frame.width * h) / frame.height, smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    for (let at = 0; at < len; at += unit) {
      const part = Math.min(1, (len - at) / unit);
      ctx.drawImage(frame, 0, 0, frame.width * part, frame.height, at, -h / 2, unit * part, h);
    }
    ctx.imageSmoothingEnabled = smooth;
    if (c.element === "volt") {
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 30; x < len; x += 30) ctx.lineTo(x, (Math.random() - 0.5) * w * 1.6);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    blitOrb(ctx, c.orb, 0, 0, w * 0.85 + 4, S.time);
    ctx.restore();
  }

  /** What a special shows besides its pose. */
  function drawSpecial(F: Fighter, s: SpecialState) {
    const c = F.char!, at = F.body.position;
    switch (s.def.kind) {
      case "beam":
        if (s.t < 44) chargeBall(hands(F), 4 + s.t / 3, c.orb); else if (s.t < 104) drawBeam(F, s);
        break;
      case "nova":
        if (s.t >= 42) break;
        ctx.beginPath(); ctx.arc(at.x, at.y, 20 + s.t * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.fx},0.18)`; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      case "bigorb":
        if (s.t < 18) chargeBall({ x: at.x, y: F.skel!.head.y - 46 }, 8 + s.t * 1.2, c.orb);
        break;
      case "vortex": {
        if (s.t >= 86 || !s.c) break;
        const grow = Math.min(1, s.t / 12);
        ctx.lineWidth = 3;
        for (let arm = 0; arm < 3; arm++) {
          ctx.beginPath();
          for (let i = 0; i <= 30; i++) {
            const a = S.time * 9 + arm * 2.09 + i * 0.22, r = (8 + i * 8.5) * grow;
            ctx.lineTo(s.c.x + Math.cos(a) * r, s.c.y + Math.sin(a) * r * 0.55);
          }
          ctx.strokeStyle = `rgba(${c.fx},0.75)`; ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(s.c.x, s.c.y, 260 * grow, 140 * grow, 0, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      }
    }
  }

  function drawFighter(F: Fighter) {
    if (!F.alive || !F.skel || !onScreen(F.body.bounds.min, F.body.bounds.max)) return;
    const sp = F.special, time = S.time;
    const charging = F.charging || (sp && sp.t < 44 && (sp.def.kind === "beam" || sp.def.kind === "nova"));
    if (F.cast) {
      const big = F.maxHp > 150;
      drawCast(ctx, F.cast, castFrame(F, F.cast, time), F.body.position.x, F.body.bounds.max.y, F.facing, F.flash > 0 && F.flash % 4 < 2 ? 0.45 : 1, F.squash * 0.5, F.big);
      // A boss's health is across the foot of the screen (drawScreen), not over its head.
      if (F.hp < F.maxHp && !F.boss) {
        const w = big ? 120 : 36, x = F.body.position.x - w / 2, y = F.skel.head.y - (big ? 110 : 26);
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x - 1, y - 1, w + 2, big ? 8 : 6);
        ctx.fillStyle = RED; ctx.fillRect(x, y, w * Math.max(0, F.hp / F.maxHp), big ? 6 : 4);
      }
      return;
    }
    const x = F.body.position.x, feet = F.body.bounds.max.y, at = F.peer?.at ?? frameOf(F, time);
    // A paler cloak: the dash is spent until the fighter touches the ground.
    const look = { skin: F.skin, spent: F.isPlayer && S.match.dashes === 0 }, turn = turnOf(F);
    if (F.char && (F.od > 0 || charging)) drawAura(ctx, x, feet + 4, F.skel.head.y, F.od > 0 ? 1 : 0.6 + F.aura / 250, F.char.fx, time);
    // Afterimages, from where the hips were: the body is 84 tall and the hips sit at its middle.
    F.trail.forEach((sk, i) => drawFigure(ctx, look, at, sk.hip.x, sk.hip.y + 40, turn, 0.1 + 0.07 * i));
    if (sp) drawSpecial(F, sp);
    drawFigure(ctx, look, at, x, feet, turn, F.flash > 0 && F.flash % 4 < 2 ? 0.45 : 1, undefined, F.squash);
    if (F.burn > 0) { ctx.fillStyle = "rgba(255,122,26,0.5)"; ctx.beginPath(); ctx.arc(F.skel.head.x, F.skel.head.y - 4, 13 + Math.sin(time * 30) * 2, Math.PI, 0); ctx.fill(); }
    // A guard: the bubble a blow breaks on.
    if (F.isPlayer ? S.guard > 0 : F.peer?.guard) {
      const strength = F.isPlayer ? S.guard : 1;
      ctx.beginPath(); ctx.arc(x, feet - 42, 52, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,235,255,${0.12 + 0.2 * strength})`; ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * strength})`; ctx.lineWidth = 3; ctx.stroke();
    }
    if (F.tag && !F.boss) { ctx.textAlign = "center"; ctx.font = '700 13px "Evil Empire", sans-serif'; ctx.fillStyle = INK; ctx.fillText(F.tag, x, F.skel.head.y - 34); }
    if (F.peer) {
      // Another player: their name, and a pip for each life they have left.
      ctx.textAlign = "center"; ctx.font = '700 13px "Evil Empire", sans-serif'; ctx.fillStyle = F.color === "#111111" ? INK : F.color;
      ctx.fillText(F.peer.name, x, F.skel.head.y - 34);
      for (let i = 0; i < F.peer.lives; i++) ctx.fillRect(x - F.peer.lives * 5 + i * 10 + 1, F.skel.head.y - 30, 7, 4);
    }
    if (F.caster) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(F.skel.head.x, F.skel.head.y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    if (!F.isPlayer && F.hp < F.maxHp) {
      const x = F.body.position.x - 18, y = F.skel.head.y - 22;
      ctx.fillStyle = RULE; ctx.fillRect(x, y, 36, 4);
      // A teammate's (co-op) in green: it is on this fighter's side.
      ctx.fillStyle = S.coop && F.peer ? "#2f9e44" : RED; ctx.fillRect(x, y, 36 * Math.max(0, F.hp / F.maxHp), 4);
    }
  }

  // Co-op (docs/coop-plan.md): where a fighter of the group lies down. This fighter's own shows how long a teammate has
  // stood by it; a teammate's asks to be stood by. One out of revives is only marked.
  function drawDowned() {
    const mark = (x: number, feet: number, held: number, out: boolean, own: boolean) => {
      const pulse = 0.55 + 0.45 * Math.sin(S.time * 6);
      ctx.lineWidth = 4; ctx.strokeStyle = out ? "rgba(140,140,140,0.6)" : `rgba(255,214,102,${pulse})`;
      ctx.beginPath(); ctx.ellipse(x, feet, 70, 14, 0, 0, Math.PI * 2); ctx.stroke();
      if (held > 0) { ctx.strokeStyle = "#8dffb0"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, feet - 70, 26, -Math.PI / 2, -Math.PI / 2 + held * Math.PI * 2); ctx.stroke(); }
      ctx.textAlign = "center"; ctx.font = '700 15px "Evil Empire", sans-serif'; ctx.lineJoin = "round";
      const text = out ? "OUT" : own ? (held > 0 ? "BEING REVIVED" : "DOWN · A TEAMMATE CAN REVIVE YOU") : "DOWN · STAND HERE TO REVIVE";
      ctx.lineWidth = 5; ctx.strokeStyle = "rgba(10,8,6,0.9)"; ctx.strokeText(text, x, feet - 110);
      ctx.fillStyle = out ? "#bbbbbb" : "#ffe9b0"; ctx.fillText(text, x, feet - 110);
    };
    if (S.down) mark(S.down.x, S.down.y, S.down.held, S.down.out, true);
    for (const F of S.allies) if (!F.alive && F.peer) mark(F.body.position.x, F.body.bounds.max.y, 0, F.peer.lives <= 0, false);
  }

  /** The knocked out: the death animation, carried by the ragdoll's fall and facing the way it flies. */
  function drawRagdolls() {
    for (const r of S.ragdolls) {
      const torso = r.parts[0];
      // A character of the cast falls where it stood: its own death, not the ragdoll's tumble.
      if (r.cast) { drawCast(ctx, r.cast, castDeath(r.cast, (540 - r.life) * (1000 / 60)), torso.position.x, torso.position.y + 34, torso.velocity.x < 0 ? 1 : -1, Math.min(1, r.life / 60)); continue; }
      drawFigure(ctx, { skin: r.skin }, deathFrame((540 - r.life) * (1000 / 60)), torso.position.x, torso.position.y + 34, torso.velocity.x < 0 ? 1 : -1, Math.min(1, r.life / 60));
    }
  }

  function drawOrbs() {
    for (const o of S.orbs) {
      o.trail.forEach((p, i) => {
        ctx.globalAlpha = (i + 1) / (o.trail.length + 1) * 0.35;
        ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(p.x, p.y, o.r * (0.5 + i / 12), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (o.disc) {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.spin);
        ctx.beginPath(); ctx.ellipse(0, 0, o.r * 1.5, o.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = o.color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, o.r * 0.6, o.r * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.restore();
        continue;
      }
      blitOrb(ctx, o.color, o.x, o.y, o.r * (o.big ? 1.15 : 1.25), S.time, o.x * 0.05);
    }
  }

  function drawEffects() {
    const time = S.time;
    for (const e of S.effects) {
      switch (e.kind) {
        // A pillar is drawn by its flame effect (sim.ts, "flame").
        case "pillar": break;
        case "quake":
          ctx.fillStyle = INK;
          for (let i = 0; i < 4; i++) {
            const sx = e.x - e.dir * i * 18, h = 34 - i * 7 + Math.sin(time * 30 + i) * 4;
            ctx.beginPath(); ctx.moveTo(sx - 10, e.y); ctx.lineTo(sx - e.dir * 2, e.y - h); ctx.lineTo(sx + 10, e.y); ctx.fill();
          }
          ctx.fillStyle = "#ff7a1a"; ctx.fillRect(e.x - 14, e.y - 3, 28, 3);
          break;
        case "cyclone":
          for (let i = 0; i < 9; i++) {
            const yy = e.y - 10 - i * 26, w = 18 + i * 7, off = Math.sin(time * 14 + i * 0.8) * 10;
            ctx.beginPath(); ctx.ellipse(e.x + off, yy, w, 8 + i, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(140,233,154,0.35)"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
          }
          break;
        case "echo": {
          const a = e.t > 34 ? 1 - (e.t - 34) / 6 : 1;
          const look = { skin: e.skin };
          e.trail.forEach((tx, i) => drawFigure(ctx, look, { anim: "dash", frame: 2 }, tx, e.y + 42, e.dir, a * 0.1 * (i + 1)));
          drawFigure(ctx, look, { anim: "dash", frame: 2 }, e.x, e.y + 42, e.dir, a * 0.7);
          break;
        }
        case "bolt": {
          ctx.globalAlpha = e.life / 10;
          ctx.lineJoin = "round";
          const path = () => { ctx.beginPath(); e.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); };
          path(); ctx.strokeStyle = INK; ctx.lineWidth = e.width + 3; ctx.stroke();
          path(); ctx.strokeStyle = e.color; ctx.lineWidth = e.width; ctx.stroke();
          path(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, e.width / 3); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
    for (const r of S.rings) {
      ctx.globalAlpha = Math.min(1, r.life / 10);
      // An enemy's special about to land is marked in red, its ground tinted, and it throbs (sim.ts, foeArt).
      ctx.lineWidth = 6; ctx.strokeStyle = r.danger ? `rgba(235,40,28,${0.65 + 0.3 * Math.sin(S.time * 0.5)})` : `rgba(${heroFx()},0.7)`;
      ctx.beginPath();
      if (r.flat) ctx.ellipse(r.x, r.y, r.r, r.r * 0.18, 0, 0, Math.PI * 2); else ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      if (r.danger) { ctx.fillStyle = "rgba(235,40,28,0.16)"; ctx.fill(); }
      ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const b of S.bursts) {
      const k = 1 - b.life / b.max, r = b.r * (0.6 + k * 0.7);
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = b.rot + (i / 18) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r;
        ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = b.color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of S.particles) {
      ctx.fillStyle = `rgba(${p.color},${p.life / p.max})`;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.textAlign = "center"; ctx.font = '700 17px "Evil Empire", sans-serif';
    for (const fl of S.floaters) {
      if (fl.warn) {
        // An enemy's special by name: pale gold edged in black and red, larger, readable on any sky.
        const a = Math.min(1, fl.life / 12);
        ctx.font = '700 24px "Evil Empire", sans-serif'; ctx.lineJoin = "round";
        ctx.lineWidth = 7; ctx.strokeStyle = `rgba(20,4,4,${a})`; ctx.strokeText(fl.text, fl.x, fl.y);
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(200,30,22,${a})`; ctx.strokeText(fl.text, fl.x, fl.y);
        ctx.fillStyle = `rgba(255,236,190,${a})`; ctx.fillText(fl.text, fl.x, fl.y);
        ctx.font = '700 17px "Evil Empire", sans-serif';
        continue;
      }
      ctx.fillStyle = fl.red ? `rgba(212,42,30,${Math.min(1, fl.life / 20)})` : theme() || S.dark || (S.sky && playing() && skyIsDark(S.sky)) ? `rgba(240,240,235,${Math.min(1, fl.life / 20)})` : `rgba(17,17,17,${Math.min(1, fl.life / 20)})`;
      ctx.fillText(fl.text, fl.x, fl.y);
    }
  }

  function drawMinimap() {
    // A level of rooms gets a map with its own shape; the islands, a strip.
    const deep = S.level?.bounds, wide = S.worldMax - S.worldMin;
    const mw = coarse ? Math.min(260, cssW - 250) : Math.min(340, cssW * 0.3), mh = deep ? Math.min(150, Math.max(60, mw * (deep.bottom - deep.top) / wide)) : 34;
    if (mw < 100) return;
    const mx = coarse ? cssW - mw - 16 : 16, my = coarse ? 14 : cssH - mh - 16;
    const sx = (x: number) => mx + (x - S.worldMin) / (S.worldMax - S.worldMin) * mw;
    const sy = (y: number) => (deep ? my + (y - deep.top) / (deep.bottom - deep.top) * mh : my + 4 + (y + 500) / 1500 * (mh - 8));
    if (deep) {
      // A level of rooms: its rock pale on a dark plate, and on it what a fighter is looking for: the pieces of the
      // key still hidden, the boss's room (red while it is shut) and the way out.
      ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
      ctx.fillStyle = "rgba(6,10,14,0.8)"; ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "rgba(150,172,188,0.5)";
      for (const s of S.statics) if (s.label !== "ledge") ctx.fillRect(sx(s.bounds.min.x), sy(s.bounds.min.y), Math.max(1, sx(s.bounds.max.x) - sx(s.bounds.min.x)), Math.max(1, sy(s.bounds.max.y) - sy(s.bounds.min.y)));
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
      ctx.strokeRect(sx(camX), sy(camY), (cssW / scale) / wide * mw, (cssH / scale) / (deep.bottom - deep.top) * mh);
      if (S.bossRoom) { const [x0, y0, x1, y1] = S.bossRoom; ctx.strokeStyle = S.locked ? RED : "#e0b84a"; ctx.lineWidth = 1.5; ctx.strokeRect(sx(x0), sy(y0), sx(x1) - sx(x0), sy(y1) - sy(y0)); }
      if (S.level) { ctx.fillStyle = "#e0b84a"; ctx.fillRect(sx(S.level.exit.x) - 2.5, sy(S.level.exit.y) - 2.5, 5, 5); }
      ctx.fillStyle = "#78ffd6";
      for (const key of S.keys) if (!key.found) { ctx.beginPath(); ctx.moveTo(sx(key.x), sy(key.y) - 4); ctx.lineTo(sx(key.x) + 3.5, sy(key.y)); ctx.lineTo(sx(key.x), sy(key.y) + 4); ctx.lineTo(sx(key.x) - 3.5, sy(key.y)); ctx.fill(); }
      // What is still to be found besides the key: a dot in its own colour (relics.ts).
      for (const relic of S.relics) if (!relic.found) {
        // A square, a diamond or a circle, as in the campaign's lists (relics.ts, RELIC_MARK).
        const x = sx(relic.x), y = sy(relic.y);
        ctx.fillStyle = RELICS[relic.kind].colour; ctx.beginPath();
        if (relic.kind === "puzzle") ctx.rect(x - 2.5, y - 2.5, 5, 5); else if (relic.kind === "soul") { ctx.moveTo(x, y - 3.5); ctx.lineTo(x + 3.5, y); ctx.lineTo(x, y + 3.5); ctx.lineTo(x - 3.5, y); ctx.closePath(); } else ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = RED;
      for (const E of S.enemies) ctx.fillRect(sx(E.body.position.x) - 1.5, sy(E.body.position.y) - 1.5, 3, 3);
      const H = S.hero;
      if (H && H.alive) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx(H.body.position.x), sy(H.body.position.y), 3.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      return;
    }
    ctx.fillStyle = "rgba(251,251,249,0.88)"; ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.fillStyle = INK;
    for (const s of S.statics) ctx.fillRect(sx(s.bounds.min.x), sy(s.bounds.min.y), Math.max(1, sx(s.bounds.max.x) - sx(s.bounds.min.x)), deep ? Math.max(1, sy(s.bounds.max.y) - sy(s.bounds.min.y)) : s.label === "ground" ? 2 : 1);
    ctx.strokeStyle = GREY;
    ctx.strokeRect(sx(camX), my + 1.5, Math.max(4, (cssW / scale) / (S.worldMax - S.worldMin) * mw), mh - 3);
    ctx.fillStyle = RED;
    for (const E of S.enemies) ctx.fillRect(sx(E.body.position.x) - 1.5, sy(E.body.position.y) - 1.5, 3, 3);
    // The group, in gold: where each teammate is.
    ctx.fillStyle = "#ffd666";
    for (const F of S.allies) ctx.fillRect(sx(F.body.position.x) - 2, sy(F.body.position.y) - 2, 4, 4);
    const H = S.hero;
    if (H && H.alive) { ctx.fillStyle = H.color; ctx.beginPath(); ctx.arc(sx(H.body.position.x), sy(H.body.position.y), 3.5, 0, Math.PI * 2); ctx.fill(); }
  }

  /** How much of a boss's health its bar last showed, of all of it: it follows the health down slowly. */
  let bossWas = 1;
  /** An item's picture, `size` across, its top left at (x, y): square pixels, as everything else is. */
  function drawItem(item: ItemId | Sprite, x: number, y: number, size: number) {
    blitSprite(ctx, typeof item === "string" ? ITEMS[item] : item, Math.round(x), Math.round(y), size);
  }
  /** The Puzzle Piece, Soul Stone Fragment and Thread of the Gods still to be found in a level, each in its own light. */
  function drawRelics() {
    for (const relic of S.relics) {
      if (relic.found) continue;
      const bob = Math.sin(S.time * 3 + relic.x) * 6, colour = RELICS[relic.kind].colour, glow = ctx.createRadialGradient(relic.x, relic.y + bob, 2, relic.x, relic.y + bob, 40);
      glow.addColorStop(0, colour + "aa"); glow.addColorStop(1, colour + "00");
      ctx.fillStyle = glow; ctx.fillRect(relic.x - 40, relic.y + bob - 40, 80, 80);
      drawItem(RELIC_ICONS[relic.kind], relic.x - 18, relic.y - 20 + bob, 36);
    }
  }
  /** The fairy of light (twenty Soul Stone Fragments): it trails a little behind and above the fighter, bobbing, and
   *  leaves a fading wake. */
  let fairy: { x: number; y: number; trail: Vec[] } | null = null;
  function drawFairy(realDt: number) {
    if (!S.fairy || !S.hero) { fairy = null; return; }
    const H = S.hero, want = { x: H.body.position.x - H.facing * 42, y: H.body.position.y - 78 + Math.sin(S.time * 3.2) * 9 };
    // Left far behind (a fighter brought back to life elsewhere), it is simply there again.
    if (!fairy || Math.hypot(want.x - fairy.x, want.y - fairy.y) > 400) fairy = { ...want, trail: [] };
    const k = Math.min(1, realDt * 0.006);
    fairy.x += (want.x - fairy.x) * k; fairy.y += (want.y - fairy.y) * k;
    fairy.trail.push({ x: fairy.x, y: fairy.y }); if (fairy.trail.length > 14) fairy.trail.shift();
    fairy.trail.forEach((p, i) => { ctx.fillStyle = `rgba(200,240,255,${(i / fairy!.trail.length) * 0.35})`; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); });
    const glow = ctx.createRadialGradient(fairy.x, fairy.y, 1, fairy.x, fairy.y, 22);
    glow.addColorStop(0, "rgba(255,255,255,0.95)"); glow.addColorStop(0.3, "rgba(170,230,255,0.55)"); glow.addColorStop(1, "rgba(170,230,255,0)");
    ctx.fillStyle = glow; ctx.fillRect(fairy.x - 22, fairy.y - 22, 44, 44);
    // Wings that beat.
    const beat = Math.abs(Math.sin(S.time * 22)) * 5 + 2;
    ctx.fillStyle = "rgba(230,250,255,0.7)";
    ctx.beginPath(); ctx.ellipse(fairy.x - 5, fairy.y - 3, beat, 3, -0.6, 0, Math.PI * 2); ctx.ellipse(fairy.x + 5, fairy.y - 3, beat, 3, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(fairy.x - 2, fairy.y - 2, 4, 4);
  }
  /** An earned outfit (Gilded, Godthread) glitters: a few points of light about the fighter, coming and going. */
  function drawSparkle() {
    if (!S.sparkle || !S.hero?.alive) return;
    const H = S.hero, t = S.time;
    for (let i = 0; i < 5; i++) {
      const phase = (t * 1.3 + i * 0.37) % 1, a = Math.sin(phase * Math.PI), seed = Math.floor(t * 1.3 + i * 0.37) * 7 + i * 13;
      const x = H.body.position.x + ((seed * 37) % 60) - 30, y = H.body.position.y + ((seed * 53) % 90) - 60 - phase * 12;
      ctx.fillStyle = `rgba(255,250,220,${a * 0.9})`; ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2);
    }
  }

  /** What lies about to be picked up: bobbing in a little light, and blinking as its time runs out. */
  function drawDrops() {
    const hollows = S.level?.traps?.hollows ?? [];
    for (const d of S.drops) {
      if (d.life < 180 && Math.floor(d.life / 8) % 2) continue;
      // Not through the rock of a hidden chamber nobody has been inside.
      if (hollows.some((c, i) => !S.traps.opened?.[i] && d.x > c.x && d.x < c.x + 64 && d.y > c.y - 32 && d.y < c.y + 64)) continue;
      const bob = d.vy === 0 ? Math.sin(S.time * 4 + d.x) * 3 : 0, glow = ctx.createRadialGradient(d.x, d.y + bob, 2, d.x, d.y + bob, 30);
      glow.addColorStop(0, "rgba(255,240,190,0.55)"); glow.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = glow; ctx.fillRect(d.x - 30, d.y + bob - 30, 60, 60);
      drawItem(d.item, d.x - 16, d.y - 18 + bob, 32);
    }
  }
  /** The bag, while it holds anything: a box for each kind of thing, how many, and the chosen one lit and named. */
  function drawBag() {
    if (!S.bag.length) return;
    const cell = coarse ? 38 : 44, gap = 6, w = S.bag.length * cell + (S.bag.length - 1) * gap;
    const x0 = coarse ? (cssW - w) / 2 : cssW - w - 18, y0 = coarse ? 60 : cssH - cell - 34;
    S.bag.forEach((held, i) => {
      const x = x0 + i * (cell + gap), chosen = i === S.chosen;
      ctx.fillStyle = chosen ? "rgba(40,28,10,0.85)" : "rgba(0,0,0,0.6)"; ctx.fillRect(x, y0, cell, cell);
      ctx.strokeStyle = chosen ? "#e0b84a" : "rgba(255,255,255,0.3)"; ctx.lineWidth = chosen ? 2.5 : 1; ctx.strokeRect(x + 0.5, y0 + 0.5, cell - 1, cell - 1);
      drawItem(held.item, x + (cell - 28) / 2, y0 + (cell - 28) / 2 - 2, 28);
      if (held.count > 1) {
        ctx.font = '700 12px "Evil Empire", sans-serif'; ctx.textAlign = "right";
        ctx.fillStyle = "#000"; ctx.fillText(`×${held.count}`, x + cell - 2, y0 + cell - 3);
        ctx.fillStyle = "#f6efe0"; ctx.fillText(`×${held.count}`, x + cell - 3, y0 + cell - 4);
      }
    });
    const chosen = S.bag[S.chosen];
    if (!chosen) return;
    ctx.font = '700 12px "Evil Empire", sans-serif'; ctx.textAlign = coarse ? "center" : "right"; ctx.letterSpacing = "1px";
    const tx = coarse ? cssW / 2 : x0 + w, label = coarse ? ITEMS[chosen.item].name.toUpperCase() : `${ITEMS[chosen.item].name.toUpperCase()}   T USE · R NEXT`;
    const ty = coarse ? y0 + cell + 15 : y0 + cell + 17;
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillText(label, tx + 1, ty + 1);
    ctx.fillStyle = "#f6dfa6"; ctx.fillText(label, tx, ty);
    ctx.letterSpacing = "0px";
  }

  function drawScreen() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const top = ((S.level?.bounds ? S.level.bounds.bottom + 260 : FOG_Y) - camY) * scale;
    const g = ctx.createLinearGradient(0, top, 0, cssH);
    const fog = S.dark ? "0,0,0" : theme()?.fog ?? (S.sky && playing() ? (skyIsDark(S.sky) ? "10,12,20" : "235,238,240") : "251,251,249");
    g.addColorStop(0, `rgba(${fog},0)`); g.addColorStop(1, `rgba(${fog},1)`);
    ctx.fillStyle = g; ctx.fillRect(0, top, cssW, Math.max(0, cssH - top));
    if (S.flashT > 0 && S.hero) { ctx.fillStyle = `rgba(${heroFx()},${S.flashT / 22 * 0.5})`; ctx.fillRect(0, 0, cssW, cssH); }
    if (S.red > 0) { ctx.fillStyle = `rgba(212,42,30,${(S.red / 30) * 0.55})`; ctx.fillRect(0, 0, cssW, cssH); }
    if (S.slowMs > 0) {
      const bar = Math.min(1, S.slowMs / 300) * cssH * 0.06;
      ctx.fillStyle = INK; ctx.fillRect(0, 0, cssW, bar); ctx.fillRect(0, cssH - bar, cssW, bar);
    }
    // An enemy out of sight is pointed to from the edge of the screen nearest it, so that none comes from nowhere:
    // those within a couple of screens, and not in the black room.
    if (playing() && !S.dark) for (const E of S.enemies) {
      if (!E.alive || E.shade) continue;
      const x = (E.body.position.x - camX) * scale, y = (E.body.position.y - camY) * scale;
      if ((x > 0 && x < cssW && y > 0 && y < cssH) || x < -cssW * 1.2 || x > cssW * 2.2 || y < -cssH * 1.5 || y > cssH * 2.5) continue;
      const px = Math.max(22, Math.min(cssW - 22, x)), py = Math.max(96, Math.min(cssH - 96, y)), turn = Math.atan2(y - py, x - px);
      ctx.save(); ctx.translate(px, py); ctx.rotate(turn);
      ctx.fillStyle = E.boss ? "#e0b84a" : RED; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    }
    // A boss: its name and its health across the foot of the screen, what a blow has just taken shown paler for a
    // moment before it goes.
    const boss = S.enemies.find((E) => E.boss && E.alive);
    if (boss) {
      const w = Math.min(560, cssW - 48), x = (cssW - w) / 2, y = cssH - 58, left = Math.max(0, boss.hp / boss.maxHp);
      bossWas = bossWas < left ? left : Math.max(left, bossWas - 0.004);
      ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(x - 3, y - 3, w + 6, 16);
      ctx.fillStyle = "#f2e2b0"; ctx.fillRect(x, y, w * bossWas, 10);
      ctx.fillStyle = RED; ctx.fillRect(x, y, w * left, 10);
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, y - 3.5, w + 7, 17);
      if (boss.tag) {
        ctx.font = '700 15px "Evil Empire", sans-serif'; ctx.textAlign = "center"; ctx.letterSpacing = "3px";
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillText(boss.tag.toUpperCase(), cssW / 2 + 1, y - 11);
        ctx.fillStyle = "#f6efe0"; ctx.fillText(boss.tag.toUpperCase(), cssW / 2, y - 12);
        ctx.letterSpacing = "0px";
      }
    } else bossWas = 1;
    if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade})`; ctx.fillRect(0, 0, cssW, cssH); }
    if (playing() && !S.dark) drawBag();
    // No map while shut in with a boss: there is nowhere to go, and it would hide a corner of the fight.
    if (playing() && !S.dark && !(boss && S.locked)) drawMinimap();
  }

  /** What the picture as a whole should do this frame (post/post.ts): nothing, for a player who has asked for less motion. */
  function effects(): Fx {
    const H = S.hero, m = S.match, on = playing() && !!H;
    const low = on && m.alive ? Math.max(0, 1 - m.hp / (0.3 * (H!.maxHp || 1))) : 0;
    const ripples = (system || calm) ? [] : S.rings.slice(-4).map((ring): [number, number, number, number] =>
      [(ring.x - camX) * scale / cssW, (ring.y - camY) * scale / cssH, ring.r * scale / cssH, Math.min(1, ring.life / 10)]);
    return {
      glitch: (system || calm) || !on ? 0 : Math.min(1, S.deathMs / 500), split: (system || calm) ? 0 : Math.min(1.4, low * (0.75 + 0.25 * Math.sin(S.time * 7)) + S.punch * 5),
      grey: on ? Math.min(0.85, Math.max(S.slowMs, S.deathMs) / 300) : 0, blur: m.screen === "Play" && m.paused ? 1 : 0, ripples, time: S.time,
      // The lit circle round the fighter and the guide while he talks.
      spot: on && S.guide && guideShown > 0.02 ? [((H!.body.position.x + S.guide.x) / 2 - camX) * scale / cssW, (S.guide.y - 60 - camY) * scale / cssH, 250 * scale / cssH, guideShown] : null,
    };
  }

  return {
    resize, effects,
    /** Moves the camera by `realDt` milliseconds and draws the scene. */
    draw(realDt: number) {
      updateCamera(realDt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackground();
      if (S.level !== levelLoaded) { levelLoaded = S.level; const T = theme(); if (T) void loadPlaces([T.set, "scenery", "gate", "plants", "fields"]); }
      sceneDt = realDt / 1000; sv = sceneView(); scenery.enter(S.level); scenery.backdrop(ctx, sv);
      worldTransform();
      drawRooms(true); drawDecor(false); drawStatics(); drawDecor(false, true); drawRooms(false);
      scenery.ground(ctx, sv, (x0, y0, x1, y1) => onScreen({ x: x0, y: y0 }, { x: x1, y: y1 }));
      drawTraps(); drawLevelMarks(); drawProps(); drawRagdolls();
      S.enemies.forEach(drawFighter);
      S.allies.forEach(drawFighter);
      if (S.coop) drawDowned();
      if (S.hero && playing()) drawFighter(S.hero);
      scenery.ambient(ctx, sv);
      guideShown += ((S.talking ? 1 : 0) - guideShown) * Math.min(1, realDt * 0.006);
      if (S.guide && guideShown > 0.02 && S.hero) drawGuide(ctx, S.guide.x, S.guide.y, S.hero.body.position.x < S.guide.x ? -1 : 1, guideShown, S.time);
      drawOrbs();
      drawDrops();
      drawRelics();
      if (S.hero && playing()) { drawFairy(realDt); drawSparkle(); }
      drawEffects();
      // Every effect is painted pixel by pixel in code, so there is a budget of pixels a frame: over it, each is painted
      // afresh only every second, third or fourth frame, in turn, and shown as it was in between. At the pace effects
      // move no eye can tell, and the frame keeps its time. A phone has a smaller budget.
      const area = S.sprites.reduce((sum, s) => sum + effectArea(s), 0), every = Math.min(4, Math.ceil(area / (coarse ? 90000 : 150000)));
      drawn++;
      S.sprites.forEach((s, i) => drawEffect(ctx, s, every <= 1 || (i + drawn) % every === 0));
      // The next wave's sky, made ready while this one is fought, so that its arrival does not stall a frame.
      if (S.nextSky && S.nextSky !== readied) { readied = S.nextSky; void loadSky(S.nextSky); }
      drawDecor(true);
      scenery.light(ctx, sv, levelLights());
      drawScreen();
    },
  };
}

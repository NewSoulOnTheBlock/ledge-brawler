// Runs in the page, served by the game's own dev server: the real engine and renderer of apps/app, on a canvas of
// its own, stepped a frame at a time so every picture is of a known moment. Nothing here is part of the game.
import Matter from "matter-js";
import * as G from "/gen/app.ts";
import { CHARS, SLOTS } from "/src/game/data.ts";
import { loadFigures } from "/src/game/figure.ts";
import { createView } from "/src/game/render.ts";
import { createGame } from "/src/game/sim.ts";

const W = 1280, H = 720, SCALE = Math.min(H / 900, W / 760);
/** Resolves once the character sheets are in, so that no picture is taken without its fighter. */
export const ready = () => loadFigures().then(() => true);

const quiet = new Proxy({}, { get: () => () => {} });

/** A fight for `fighter`, after the events in `prep`, on its own canvas. */
function stage(fighter, prep = []) {
  let m = G.initial;
  const send = (e) => { if (!G.enabled(m, e)) return undefined; m = G.step(m, e); return m; };
  const said = [];
  const game = createGame({ get: () => m, send }, { sfx: quiet, banner: (t) => said.push(t), callout: (t) => said.push(t) });
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:99`;
  document.body.append(canvas);
  const view = createView(canvas, game);
  view.resize();
  send({ type: "enter" }); send({ type: "focus", pick: fighter }); send({ type: "fight" });
  for (const e of prep) send(e);
  game.begin();
  const st = {
    game, canvas, said, send, match: () => m, hero: () => game.scene.hero,
    run(n = 1) { for (let i = 0; i < n; i++) { game.frame(1000 / 60); view.draw(1000 / 60); } },
    until(cond, max = 300) { for (let i = 0; i < max && !cond(); i++) st.run(); return cond(); },
    tap(k, hold = 1) { game.press(k); st.run(hold); game.release(k); },
    /** A picture w by h world pixels around the world point (cx, cy), once the camera has caught up with the hero. */
    shot(cx, cy, w, h, outW) {
      const camX = game.scene.camX;
      const sx = (cx - camX) * SCALE, sy = (cy - game.scene.camY) * SCALE;
      const dpr = canvas.width / W, out = document.createElement("canvas");
      out.width = outW; out.height = Math.round(outW * h / w);
      const g = out.getContext("2d");
      g.fillStyle = "#fbfbf9"; g.fillRect(0, 0, out.width, out.height);
      g.drawImage(canvas, (sx - w * SCALE / 2) * dpr, (sy - h * SCALE / 2) * dpr, w * SCALE * dpr, h * SCALE * dpr, 0, 0, out.width, out.height);
      return out.toDataURL("image/png").split(",")[1];
    },
    portrait(size = 380) { const p = st.hero().body.position; return st.shot(p.x + st.hero().facing * 30, p.y - 20, size, size, 384); },
    /** The whole view, or with a width in world pixels, that much of it around the hero. */
    wide(w) { const p = st.hero().body.position; return w ? st.shot(p.x + st.hero().facing * 60, p.y - 90, w, w * 9 / 16, 800) : st.shot(p.x + st.hero().facing * 50, game.scene.camY + 450, W / SCALE, H / SCALE, 800); },
    draw: (dt) => view.draw(dt),
    close() { canvas.remove(); },
  };
  st.run(45);
  return st;
}

const half = (st, prev) => () => { const a = st.hero().atk; return a && a !== prev && a.t / a.def.dur > 0.5; };

/** Presses attack buttons one after another, each as the move before it passes its half, so they chain. */
function chain(st, buttons) {
  let prev = null;
  buttons.forEach((b, i) => {
    st.tap(b);
    if (i === buttons.length - 1) return;
    st.until(half(st, prev), 60);
    prev = st.hero().atk;
  });
  st.until(() => st.hero().atk && st.hero().atk !== prev, 60);
}

const INPUTS = {
  three: (st) => chain(st, ["punch", "punch", "punch"]),
  whirl: (st) => chain(st, ["kick", "kick", "kick"]),
  launch: (st) => chain(st, ["punch", "punch", "kick"]),
  storm: (st) => chain(st, ["kick", "punch", "punch"]),
  sweep: (st) => { st.game.press("down"); st.run(2); st.tap("kick"); st.game.release("down"); },
  hammer: (st) => { st.tap("jump"); st.run(16); st.game.press("down"); st.tap("punch"); st.game.release("down"); },
  elbow: (st) => { st.tap("right", 2); st.run(2); st.tap("right", 2); st.run(1); st.tap("punch"); },
  vanish: (st) => { st.tap("left", 2); st.run(2); st.tap("right", 2); st.run(1); st.tap("kick"); },
  juggle: (st) => { st.tap("jump"); st.run(8); chain(st, ["punch", "punch", "kick"]); },
  sky: (st) => { st.tap("right", 2); st.run(1); st.tap("down", 2); st.run(1); st.tap("right", 2); st.run(1); st.tap("punch"); },
};

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const FULL = [{ type: "charge", steps: 80 }];
const WAVE3 = [{ type: "advance" }, { type: "arrive" }, { type: "arrive" }, { type: "fell" }, { type: "fell" }, { type: "advance" }, { type: "arrive" }, { type: "arrive" }, { type: "arrive" }, { type: "fell" }, { type: "fell" }, { type: "fell" }, { type: "advance" }];

export function fighters() {
  return CHARS.map((c, i) => {
    const st = stage(i);
    st.game.press("charge"); st.run(24);
    const png = st.portrait(300);
    st.close();
    return {
      id: c.id, name: c.name, sub: c.title, png, text: c.blurb, r: 0,
      tags: [`${G.healthOf(i)} HP`, `${c.airJumps + 1} jumps`, c.element],
      list: c.specials.map((s, j) => ({ name: s.name, text: `${G.specialCost(j) / 1000} aura` })),
      fields: { Health: G.healthOf(i), Speed: c.spd, Power: c.pow, "Air jumps": c.airJumps, "Blast cost": G.blastCostOf(i) / 1000, "Flight drain per second": +(G.flyDrainOf(i) * 60 / 1000).toFixed(2), "Aura per hit": G.hitGainOf(i) / 1000 },
    };
  });
}

export function combos(fighter) {
  const c = CHARS[fighter];
  return SLOTS.map((slot) => {
    const st = stage(fighter);
    INPUTS[slot](st);
    const a = st.hero().atk, want = c.slots[slot][0];
    const ok = !!a && a.name === want;
    if (ok) st.until(() => !st.hero().atk || st.hero().atk.t / a.def.dur >= (a.def.active[0] + Math.min(1, a.def.active[1])) / 2, 80);
    const row = {
      id: `${c.id}-${slot}`, name: c.slots[slot][1], sub: `${c.name} combo`, png: st.portrait(), ok,
      fields: { Fighter: c.name, ...(ok ? { Damage: a.def.dmg, "Steps long": a.def.dur, Hitstop: a.def.stop } : {}) },
      tags: ok ? [a.def.heavy ? "Heavy" : "Light", ...(a.def.rehit ? ["Multi-hit"] : []), ...(a.def.air ? ["Air"] : [])] : [],
    };
    st.close();
    return row;
  });
}

/** Lets a first wave land near the hero, so a special has someone to hit. */
function withEnemies(st) {
  st.until(() => st.game.scene.enemies.length >= 2 && st.game.scene.enemies.every((E) => E.grounded), 420);
}

export function specials(fighter) {
  const c = CHARS[fighter];
  return c.specials.map((s, j) => {
    let row;
    for (let tries = 0; tries < 5 && !row?.ok; tries++) row = special(fighter, s, j);
    return row;
  });
}

function special(fighter, s, j) {
  const c = CHARS[fighter];
  {
    const st = stage(fighter, [...FULL, { type: "advance" }]);
    withEnemies(st);
    st.send({ type: "charge", steps: 80 });
    const E = st.game.scene.enemies[0];
    if (E) st.hero().facing = Math.sign(E.body.position.x - st.hero().body.position.x) || 1;
    st.tap(`s${j + 1}`);
    const sp = st.hero().special, ok = !!sp;
    if (ok) st.until(() => !st.hero().special || sp.t >= sp.dur * (s.kind === "cyclone" || s.kind === "echo" ? 0.95 : 0.6), 200);
    if (s.kind === "cyclone") st.run(30);
    // A fighter knocked out or thrown off the island mid-special is not a picture of the special.
    const seen = ok && st.match().alive && Math.abs(st.hero().body.position.y - st.game.scene.camY - 450) < 400;
    const row = { id: `${c.id}-${kebab(s.name)}`, name: s.name, sub: `${c.name} special`, png: st.wide(s.kind === "beam" || s.kind === "echo" ? 1300 : 900), ok: seen, fields: { Fighter: c.name, "Aura cost": G.specialCost(j) / 1000, Slot: j + 1 }, tags: [s.kind] };
    st.close();
    return row;
  }
}

export function powers() {
  const rows = [];
  let st = stage(0);
  st.tap("blast"); st.run(14);
  rows.push({ id: "blast", name: "Energy Blast", png: st.wide(700), text: "A bolt of aura fired from the fist. Costs Volt 4, Ember 10 and the others 8." });
  st.close();
  st = stage(4);
  st.tap("fly"); st.game.press("jump"); st.run(40); st.game.release("jump"); st.game.press("right"); st.run(30);
  rows.push({ id: "flight", name: "Flight", png: st.wide(700), text: "Takes 5 aura to take off, then drains aura each step until it runs out.", ok: st.match().flying });
  st.close();
  st = stage(1);
  st.game.press("charge"); st.run(40);
  rows.push({ id: "charge", name: "Charge", png: st.portrait(320), text: "Three quarters of a point of aura each step while held." });
  st.close();
  st = stage(3, FULL);
  st.game.press("charge"); st.until(() => st.match().overdrive > 0, 80); st.game.release("charge"); st.run(50); st.game.press("right"); st.run(20);
  rows.push({ id: "overdrive", name: "Overdrive", png: st.portrait(320), text: "Fifty steps of charging at full aura. 900 steps of free powers, more speed and 1.5 times the damage.", ok: st.match().overdrive > 0 });
  st.close();
  st = stage(2);
  st.tap("jump"); st.run(10); st.game.press("right"); st.tap("dash"); st.run(8);
  rows.push({ id: "dash", name: "Dash", png: st.wide(700), ok: st.match().dashes === 0 && !!st.hero().dash, text: "Fires the fighter the way the stick points. One each time it leaves the ground: the head goes hollow until it lands. Control comes back after nine steps, and a jump out of it keeps its speed." });
  st.close();
  st = stage(0);
  const wall = st.game.scene.statics.find((x) => x.label === "wall");
  Matter.Body.setPosition(st.hero().body, { x: wall.bounds.min.x - 15, y: wall.bounds.max.y - 46 });
  Matter.Body.setVelocity(st.hero().body, { x: 0, y: 0 });
  st.hero().facing = 1;
  st.game.press("grab"); st.run(50); st.game.press("up"); st.run(14);
  rows.push({ id: "wall-climb", name: "Wall climb", png: st.wide(600), ok: st.hero().climb !== 0, text: "Hold to grip any wall, climb it, and jump off. Runs on 110 stamina that is never shown: holding costs 10 a second, climbing 45, a jump straight up 27.5." });
  st.close();
  return rows;
}

export function enemies() {
  const rows = [];
  let st = stage(0, [{ type: "advance" }]);
  st.until(() => st.game.scene.enemies.some((E) => E.atk), 600);
  st.run(4);
  rows.push({ id: "brawler", name: "Brawler", sub: "Every wave", png: st.wide(700), text: "Runs at the fighter, jumps gaps, and throws jabs, crosses and kicks. Health is 26 plus 6 for each wave.", fields: { "Health in wave 1": 32, "Health per wave": 6 } });
  st.close();
  for (let tries = 0; tries < 12; tries++) {
    st = stage(2, WAVE3);
    st.until(() => st.game.scene.enemies.length >= 4, 400);
    const caster = st.game.scene.enemies.find((E) => E.caster);
    if (caster) {
      const fired = st.until(() => st.game.scene.orbs.some((o) => !o.hero), 900) && st.match().alive;
      if (!fired && tries < 11) { st.close(); continue; }
      st.run(6);
      rows.push({ id: "caster", name: "Caster", sub: "From wave 3", png: st.wide(1100), ok: st.game.scene.orbs.some((o) => !o.hero), text: "Marked by a red dot. Keeps its distance and fires blasts. About one enemy in three from the third wave on.", fields: { "Health in wave 3": 44, "Health per wave": 6 } });
      st.close();
      break;
    }
    st.close();
  }
  return rows;
}

export function islands() {
  const st = stage(0);
  const grounds = st.game.scene.statics.filter((s) => s.label === "ground").sort((a, b) => a.bounds.min.x - b.bounds.min.x);
  const ledges = st.game.scene.statics.filter((s) => s.label !== "ground");
  st.close();
  return grounds.map((g, i) => {
    const s2 = stage(0);
    const cx = (g.bounds.min.x + g.bounds.max.x) / 2;
    Matter.Body.setPosition(s2.hero().body, { x: cx, y: g.bounds.min.y - 60 });
    s2.run(50);
    const row = {
      id: `island-${i}`, name: i === 0 ? "West Island" : i === 1 ? "The Arena" : `Island ${i - 1}`, png: s2.wide(),
      fields: { Width: Math.round(g.bounds.max.x - g.bounds.min.x), "Ledges and walls": ledges.filter((l) => l.bounds.max.x > g.bounds.min.x && l.bounds.min.x < g.bounds.max.x).length, "Crates and balls": s2.game.scene.props.filter((p) => p.position.x > g.bounds.min.x && p.position.x < g.bounds.max.x).length },
    };
    s2.close();
    return row;
  });
}

export function props() {
  const st = stage(0);
  st.run(20);
  const of = (label) => st.game.scene.props.filter((p) => p.label === label).sort((a, b) => Math.abs(a.position.x - 560) - Math.abs(b.position.x - 560))[0];
  const crate = of("crate"), ball = of("ball");
  const rows = [
    { id: "crate", name: "Crate", png: st.shot(crate.position.x, crate.position.y - 10, 200, 200, 320), text: "Stacks, slides and flies when hit. Comes back from the sky after falling off." },
    { id: "ball", name: "Ball", png: st.shot(ball.position.x, ball.position.y - 30, 200, 200, 320), text: "Light and bouncy. A kick sends it across the island." },
  ];
  st.close();
  return rows;
}

/** Plays a scripted fight in real time and records the canvas. `script` is [milliseconds, key, "down" | "up" | "tap"]. */
export async function clip(fighter, prep, script, seconds) {
  const st = stage(fighter, prep);
  const rec = new MediaRecorder(st.canvas.captureStream(30), { mimeType: "video/webm", videoBitsPerSecond: 2500000 });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  const start = performance.now();
  const todo = script.slice();
  await new Promise((done) => {
    let last = start;
    requestAnimationFrame(function tick(now) {
      const t = now - start;
      while (todo.length && todo[0][0] <= t) {
        const [, key, how] = todo.shift();
        if (how !== "up") st.game.press(key);
        if (how !== "down") setTimeout(() => st.game.release(key), how === "tap" ? 40 : 0);
      }
      const dt = Math.min(100, now - last); last = now;
      st.game.frame(dt); st.draw(dt);
      if (t < seconds * 1000) requestAnimationFrame(tick); else done();
    });
  });
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.stop();
  await stopped;
  const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const summary = { wave: st.match().wave, kos: st.match().kos, best: st.match().best, said: [...new Set(st.said)] };
  st.close();
  return { webm: btoa(bin), summary };
}

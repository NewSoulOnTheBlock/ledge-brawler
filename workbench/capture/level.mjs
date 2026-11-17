// Shoots a campaign level of the running game (http://localhost:5199) at places along it, with the fighter set down
// there: node level.mjs <level id> <x,y> [<x,y> ...]. The real engine and renderer, on a canvas of their own. The spot
// "boss" is the level's last room with its key found, "spawn" where the fighter starts, "room:<i>" the middle of a run of ground i-th along the level, "time" how long a step of the game and a drawn frame take there (ms), "slay" strikes the boss down and stops a moment after, and "wait"
// lets a second and a half pass where the fighter is.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const [id, ...spots] = process.argv.slice(2);
// GPU=1 draws on this machine's graphics card instead of the software one headless browsers use (timings then mean something for WebGL).
const browser = await chromium.launch(process.env.GPU ? { args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5199/");
await page.evaluate(async (id) => {
  const [G, sim, render, levels, cast, places, figure, Matter, sky, parley] = await Promise.all(["/gen/app.ts", "/src/game/sim.ts", "/src/game/render.ts", "/src/game/levels.ts", "/src/game/cast.ts", "/src/game/places.ts", "/src/game/figure.ts", "/node_modules/.vite/deps/matter-js.js", "/src/game/sky.ts", "/src/story/parley.ts"].map((m) => import(/* @vite-ignore */ m)));
  await Promise.all([cast.loadCast(), places.loadPlaces(), figure.loadFigures()]);
  const level = levels.allLevels().find((each) => each.id === id) ?? [...levels.SURVIVAL_STAGES, ...levels.VERSUS_STAGES].find((each) => each?.id === id);
  if (level.sky) await sky.loadSky(level.sky);
  let m = G.initial;
  const send = (e) => { if (!G.enabled(m, e)) return undefined; m = G.step(m, e); return m; };
  const quiet = new Proxy({}, { get: () => () => {} });
  const game = sim.createGame({ get: () => m, send }, { sfx: quiet, banner() {}, callout() {} });
  document.body.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;left:0;top:0;width:1280px;height:720px";
  document.body.append(canvas);
  const view = render.createView(canvas, game);
  view.resize();
  send({ type: "enter" }); send({ type: "focus", pick: 4 }); send({ type: "embark" });
  game.begin(level);
  window.shoot = (x, y) => {
    const M = Matter.default ?? Matter;
    M.Body.setPosition(game.scene.hero.body, { x, y }); M.Body.setVelocity(game.scene.hero.body, { x: 0, y: 0 });
    return window.wait();
  };
  window.wait = () => {
    for (let i = 0; i < 90; i++) { game.frame(1000 / 60); view.draw(1000 / 60); }
    const boss = game.scene.enemies.find((E) => E.boss);
    return { foes: game.scene.enemies.map((E) => E.cast), hp: m.hp, boss: boss && { hp: Math.round(boss.hp), of: boss.maxHp, move: boss.boss.move, tag: boss.tag, x: Math.round(boss.body.position.x), y: Math.round(boss.body.position.y) } };
  };
  window.slay = () => {
    const M = Matter.default ?? Matter, boss = game.scene.enemies.find((E) => E.boss);
    if (!boss) return "no boss";
    boss.hp = 1;
    M.Body.setPosition(game.scene.hero.body, { x: boss.body.position.x - 100, y: boss.body.bounds.max.y - 44 }); game.scene.hero.facing = 1;
    let after = 0;
    for (let i = 0; i < 400 && after < 14; i++) {
      if (i % 14 === 0) game.press("punch");
      game.frame(1000 / 60); view.draw(1000 / 60);
      if (!game.scene.enemies.some((E) => E.boss)) after++;
    }
    return { fell: after > 0, foes: game.scene.enemies.length, kos: m.kos ?? m.score, slowMs: Math.round(game.scene.slowMs) };
  };
  // Waits for the graphics card to finish the frame (a one-pixel read), so a timing counts its work too.
  const sync = () => canvas.getContext("2d").getImageData(0, 0, 1, 1);
  window.time = () => {
    const st = game.scene.time, t0 = performance.now(); for (let i = 0; i < 60; i++) game.frame(1000 / 60); const t1 = performance.now(), advanced = +(game.scene.time - st).toFixed(2); for (let i = 0; i < 60; i++) { view.draw(1000 / 60); sync(); }
    return { simMs: +((t1 - t0) / 60).toFixed(2), drawMs: +((performance.now() - t1) / 60).toFixed(2), bodies: game.scene.statics?.length, foes: game.scene.enemies.length, advanced };
  };
  window.spawn = () => [level.spawn.x, level.spawn.y];
  window.room = (i) => { const tops = [...(level.tops ?? [])].filter((t) => t[2] >= 192).sort((a, b) => a[0] - b[0]); const t = tops[Math.floor((i / 10) * tops.length) % tops.length]; return t ? [t[0] + t[2] / 2, t[1] - 44] : [level.spawn.x, level.spawn.y]; };
  window.boss = () => {
    const room = game.scene.bossRoom;
    if (!room) return null;
    for (const key of game.scene.keys) key.found = true;
    game.title(parley.PARLEY[id]?.who ?? null);
    return [room[0] + 180, room[3] - 80];
  };
}, id);
for (const [i, spot] of spots.entries()) {
  const at = spot === "boss" ? await page.evaluate(() => window.boss()) : spot === "spawn" ? await page.evaluate(() => window.spawn()) : spot.startsWith("room:") ? await page.evaluate((i) => window.room(i), +spot.slice(5)) : spot === "wait" || spot === "slay" || spot === "time" ? null : spot.split(",").map(Number);
  console.log(spot, JSON.stringify(at ? await page.evaluate(([x, y]) => window.shoot(x, y), at) : spot === "wait" ? await page.evaluate(() => window.wait()) : spot === "slay" ? await page.evaluate(() => window.slay()) : spot === "time" ? await page.evaluate(() => window.time()) : "no boss room"));
  await page.screenshot({ path: `${out}${id}-at-${i + 1}.png` });
}
console.log(JSON.stringify({ errors }));
await browser.close();

// Photographs a fighter's specials in a fight of waves of the running game (http://localhost:5199), the real engine and
// renderer on a canvas of their own: node arts.mjs <fighter 0-4> [slot ...] (slots from 1; the greater arts, 4 5 6, by
// default). Each special is used with full aura once the first foes are in, and shot at four moments into it.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const [fighter = "0", ...slots] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
await page.goto("http://localhost:5199/");
await page.evaluate(async (pick) => {
  const [G, sim, render, cast, places, figure] = await Promise.all(["/gen/app.ts", "/src/game/sim.ts", "/src/game/render.ts", "/src/game/cast.ts", "/src/game/places.ts", "/src/game/figure.ts"].map((m) => import(/* @vite-ignore */ m)));
  await Promise.all([cast.loadCast(), places.loadPlaces(), figure.loadFigures()]);
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
  send({ type: "enter" }); send({ type: "focus", pick }); send({ type: "fight" });
  game.begin(null);
  const run = (n) => { for (let i = 0; i < n; i++) { game.frame(1000 / 60); view.draw(1000 / 60); } };
  // The first wave in, and close.
  run(360);
  window.use = (slot) => {
    // Foes to use it on: the next wave in, if this one is gone.
    for (let i = 0; i < 900 && game.scene.enemies.filter((E) => E.alive).length < 2; i++) run(1);
    send({ type: "charge", steps: 900 });
    game.press(`s${slot}`);
    run(2);
    return { special: game.scene.hero.special?.def.name ?? null, aura: m.aura, foes: game.scene.enemies.length };
  };
  window.run = (n) => { run(n); return { foes: game.scene.enemies.filter((E) => E.alive).length, kos: m.kos, hp: m.hp, effects: game.scene.effects.length, sprites: game.scene.sprites.length }; };
}, Number(fighter));
for (const slot of slots.length ? slots.map(Number) : [4, 5, 6]) {
  console.log(`s${slot}`, JSON.stringify(await page.evaluate((s) => window.use(s), slot)));
  for (const [i, n] of [18, 28, 36, 50].entries()) {
    const state = await page.evaluate((k) => window.run(k), n);
    await page.screenshot({ path: `${out}art-${fighter}-${slot}-${i + 1}.png` });
    if (i === 3) console.log("   after", JSON.stringify(state));
  }
  await page.evaluate(() => window.run(180));
}
console.log(JSON.stringify({ errors }));
await browser.close();

// A duel between two pages over the real relay, the real engine and the real versus.ts, with the network made worse
// on purpose: node netlab.mjs [lag ms] [jitter ms] [seconds] [address]. Then A's page dies without
// leaving, and B's list is read as it notices. Lag and jitter are added to everything each
// page hears (in order, as a WebSocket keeps it). Player A walks back and forth; player B records where it draws A
// on every frame. Reports how far behind B's picture of A runs, how often A seems to stop while it is moving, how
// often it jumps, and how rough its motion is.
import { chromium } from "playwright";
const [lag = 0, jitter = 0, secs = 12] = process.argv.slice(2, 5).map(Number);
const base = process.argv[5] ?? "http://localhost:5199/";
const code = "lab" + Math.random().toString(36).slice(2, 7);
const browser = await chromium.launch();
const errors = [];

// Wraps the relay's room so that what it delivers comes late: `lag` plus up to `jitter` more, never out of order.
const slow = ({ lag, jitter }) => {
  let held;
  Object.defineProperty(window, "MP", {
    configurable: true,
    get: () => held,
    set(mp) {
      // The SDK's exports cannot be written over, so a copy of it is what the game is given.
      const join = mp.join.bind(mp);
      held = { ...mp, join: async (options) => {
        const room = await join(options);
        let last = 0;
        const later = (fn) => (...args) => { const at = Math.max(last, performance.now() + lag + Math.random() * jitter); last = at; setTimeout(() => fn(...args), at - performance.now()); };
        const onState = room.onState.bind(room), on = room.on.bind(room);
        room.onState = (fn) => onState(later(fn));
        room.on = (type, fn) => on(type, later(fn));
        window.room = room;
        // Every message this game sends, counted.
        window.sent = 0;
        const set = room.me.set.bind(room.me), send = room.send.bind(room);
        room.me.set = (fields) => { window.sent++; set(fields); };
        room.send = (type, data) => { window.sent++; send(type, data); };
        return room;
      } };
    },
  });
};

async function player(name, fighter) {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await context.addInitScript(slow, { lag, jitter });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + String(e).slice(0, 200)));
  await page.goto(base);
  await page.evaluate(async ({ code, name, fighter }) => {
    const [G, sim, levels, versus, cast, places, figure] = await Promise.all(["/gen/app.ts", "/src/game/sim.ts", "/src/game/levels.ts", "/src/versus.ts", "/src/game/cast.ts", "/src/game/places.ts", "/src/game/figure.ts"].map((m) => import(m)));
    await Promise.all([cast.loadCast(), places.loadPlaces(), figure.loadFigures()]);
    let m = G.initial;
    const rules = { get: () => m, send: (e) => { if (!G.enabled(m, e)) return undefined; m = G.step(m, e); return m; } };
    let net = null;
    const quiet = new Proxy({}, { get: () => () => {} });
    const ui = { sfx: quiet, banner() {}, callout() {}, strike: (to, b) => net?.strike(to, b), shot: (o) => net?.shot(o), downed: (by) => net?.downed(by), fx: (s) => net?.fx(s) };
    const game = sim.createGame(rules, ui);
    rules.send({ type: "enter" }); rules.send({ type: "focus", pick: fighter }); rules.send({ type: "duel" });
    game.begin(versus.stageFor(levels.DUEL, code, 0));
    window.lab = { game, rules, standing: null, log: [] };
    net = await versus.joinVersus(code, name, levels.DUEL, game, rules, (s) => { window.lab.standing = s; });
    window.lab.net = net;
    let last = performance.now();
    setInterval(() => {
      const now = performance.now(), dt = Math.min(100, now - last); last = now;
      net.tick(); game.frame(dt);
      const peer = game.scene.enemies.find((E) => E.peer), me = game.scene.hero;
      window.lab.log.push([Date.now(), me ? me.body.position.x : null, peer ? peer.body.position.x : null]);
    }, 1000 / 60);
  }, { code, name, fighter });
  return page;
}

const a = await player("Walker", 0), b = await player("Watcher", 2);
// Both in, then A walks: right and left in turn, a second and a half each.
for (let i = 0; i < 40 && !(await b.evaluate(() => (window.lab.standing?.rivals.length ?? 0) >= 2)); i++) await b.waitForTimeout(250);
const together = await b.evaluate(() => window.lab.standing?.rivals.length ?? 0);
await a.evaluate(() => { window.lab.log.length = 0; }); await b.evaluate(() => { window.lab.log.length = 0; });
const walk = Date.now();
while (Date.now() - walk < secs * 1000) {
  const right = Math.floor((Date.now() - walk) / 1500) % 2 === 0;
  await a.evaluate((r) => { const g = window.lab.game; g.release(r ? "left" : "right"); g.press(r ? "right" : "left"); }, right);
  await a.waitForTimeout(100);
}
const rate = async (page, ms) => { const n0 = await page.evaluate(() => window.sent); await page.waitForTimeout(ms); return Math.round((await page.evaluate(() => window.sent) - n0) / (ms / 1000)); };
const walking = await rate(a, 1500);
await a.evaluate(() => { const g = window.lab.game; g.release("left"); g.release("right"); });
await a.waitForTimeout(800);
console.log("messages a second from A: walking", walking, "· standing", await rate(a, 3000));
const truth = await a.evaluate(() => window.lab.log.map(([t, x]) => [t, x]));
const seen = await b.evaluate(() => window.lab.log.map(([t, , x]) => [t, x]).filter(([, x]) => x !== null));

// Where A truly was at wall-clock time t, between its samples.
const at = (t) => { let i = truth.findIndex(([u]) => u >= t); if (i <= 0) return truth[Math.max(0, i)]?.[1] ?? null; const [t0, x0] = truth[i - 1], [t1, x1] = truth[i]; return x0 + (x1 - x0) * ((t - t0) / Math.max(1, t1 - t0)); };
// The delay that best lines B's picture up with the truth.
let best = { delay: 0, err: Infinity };
for (let d = 0; d <= 1200; d += 10) {
  let sum = 0, n = 0;
  for (const [t, x] of seen) { const want = at(t - d); if (want !== null) { sum += Math.abs(want - x); n++; } }
  if (n && sum / n < best.err) best = { delay: d, err: sum / n };
}
// Frame to frame: how often A seems to stand still while it truly moves, how often it jumps, and how uneven it is.
const steps = seen.slice(1).map(([t, x], i) => ({ dx: x - seen[i][1], dt: t - seen[i][0], moving: Math.abs((at(t - best.delay) ?? 0) - (at(seen[i][0] - best.delay) ?? 0)) > 0.5 }));
const moving = steps.filter((s) => s.moving), speeds = moving.map((s) => Math.abs(s.dx) / Math.max(1, s.dt)).sort((p, q) => p - q), typical = speeds[Math.floor(speeds.length / 2)] || 0;
const stalls = moving.filter((s) => Math.abs(s.dx) < 0.05).length, snaps = moving.filter((s) => Math.abs(s.dx) / Math.max(1, s.dt) > typical * 3).length;
const jerk = moving.slice(1).reduce((sum, s, i) => sum + Math.abs(s.dx / Math.max(1, s.dt) - moving[i].dx / Math.max(1, moving[i].dt)), 0) / Math.max(1, moving.length - 1);
console.log(JSON.stringify({ lag, jitter, together, frames: seen.length, delayMs: best.delay, errPx: +best.err.toFixed(1), stallPct: +(100 * stalls / Math.max(1, moving.length)).toFixed(1), snapPct: +(100 * snaps / Math.max(1, moving.length)).toFixed(1), jerk: +jerk.toFixed(4), errors }));
// Real blows: each in turn stands beside where it sees the other and punches. Both should be hurt.
const beside = async (page, other) => {
  const was = await other.evaluate(() => window.lab.rules.get().hp);
  for (let i = 0; i < 6; i++) {
    await page.evaluate(async () => {
      const M = (await import("/node_modules/.vite/deps/matter-js.js")).default, g = window.lab.game, peer = g.scene.enemies.find((E) => E.peer);
      if (!peer) return;
      M.Body.setPosition(g.scene.hero.body, { x: peer.body.position.x - 50, y: peer.body.position.y }); M.Body.setVelocity(g.scene.hero.body, { x: 0, y: 0 });
      g.scene.hero.facing = 1; g.press("punch");
    });
    await page.waitForTimeout(350);
  }
  await other.waitForTimeout(600 + lag + jitter);
  return was - (await other.evaluate(() => window.lab.rules.get().hp));
};
console.log("real blows, health lost:", JSON.stringify({ byA: await beside(a, b), byB: await beside(b, a) }));
// B loses its connection for a moment, and then for longer than the relay holds a seat. Each time, A should see B
// again afterwards, moving.
const cut = async (ms) => {
  const cdp = await b.context().newCDPSession(b);
  await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await b.waitForTimeout(ms);
  const during = await b.evaluate(() => window.lab.standing?.status);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  for (let i = 0; i < 40; i++) {
    const seen = await a.evaluate(() => { const p = window.lab.game.scene.enemies.find((E) => E.peer); return p ? [p.body.position.x, window.lab.standing?.rivals.length] : null; });
    if (seen && seen[1] >= 2 && !(await b.evaluate(() => window.lab.standing?.rivals.some((r) => r.quiet)))) break;
    await b.waitForTimeout(500);
  }
  await b.evaluate(() => { const g = window.lab.game; g.press("right"); });
  const x0 = await a.evaluate(() => window.lab.game.scene.enemies.find((E) => E.peer)?.body.position.x ?? null);
  await b.waitForTimeout(800);
  await b.evaluate(() => window.lab.game.release("right"));
  const x1 = await a.evaluate(() => window.lab.game.scene.enemies.find((E) => E.peer)?.body.position.x ?? null);
  return { offlineFor: ms, statusDuring: during, afterStatus: await b.evaluate(() => window.lab.standing?.status), aSeesB: x0 !== null, bMovesForA: x0 !== null && x1 !== null && Math.abs(x1 - x0) > 20 };
};
// (Set CUTS=1 for this: it takes a minute.)
if (process.env.CUTS) console.log("connection lost:", JSON.stringify([await cut(6000), await cut(34000)]));
// A game that lies: A tells B of blows that cannot be right. Only the first, an ordinary one, should land.
const hp = () => b.evaluate(() => window.lab.rules.get().hp);
const to = await b.evaluate(() => window.room.sessionId);
const forged = async (label, blows) => {
  const was = await hp();
  await a.evaluate(({ to, blows }) => { for (const blow of blows) window.room.send("hit", { to, kx: 1, ky: -1, ...blow }); }, { to, blows });
  await b.waitForTimeout(700 + lag + jitter);
  return [label, was - (await hp())];
};
console.log("forged blows, health each took:", JSON.stringify([
  await forged("ordinary", [{ n: 900001, round: 0, dmg: 5 }]),
  await forged("told again", [{ n: 900001, round: 0, dmg: 5 }]),
  await forged("another round", [{ n: 900002, round: 7, dmg: 5 }]),
  await forged("9999 damage", [{ n: 900003, round: 0, dmg: 9999 }]),
  await forged("100 at once", Array.from({ length: 100 }, (_, i) => ({ n: 900010 + i, round: 0, dmg: 1 }))),
]));
// What B shows of A: its ping. Then A's page dies without leaving, as a crashed tab does: B should show it lagging,
// and then drop it.
const roster = () => b.evaluate(() => (window.lab.standing?.rivals ?? []).map((r) => ({ name: r.name, ping: r.ping, quiet: r.quiet })));
console.log("B's roster:", JSON.stringify(await roster()));
await a.context().close();
await b.waitForTimeout(4000);
console.log("4 s after A died:", JSON.stringify(await roster()));
await b.waitForTimeout(5500);
console.log("9.5 s after A died:", JSON.stringify(await roster()));
await b.evaluate(() => window.lab.net?.leave());
await browser.close();

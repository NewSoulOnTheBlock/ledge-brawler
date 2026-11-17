// A co-op group on the running game (http://localhost:5199, or the address given), over the real relay, the real
// engine and the real coop.ts: node coop.mjs [players 2-5] [address] [lag ms] [jitter ms].
// Player A opens a table, the others come by its invite link, each takes a blade, A chooses chapter 1 of their
// campaign and sets out. Then: everyone is in the same level and sees the others; A's game alone runs the enemies and
// the others draw stand-ins for them in about the same places; a guest's blows land on A's enemies; a piece of the
// key found by one is found for all; a fighter knocked out is revived by a teammate standing by it; and when one
// reaches the way out the level is cleared for everyone. With lag, it is added to everything each page hears.
import { chromium } from "playwright";
const players = Math.max(2, Math.min(5, Number(process.argv[2] ?? 2)));
const base = process.argv[3] ?? "http://localhost:5199/";
const [lag = 0, jitter = 0] = process.argv.slice(4, 6).map(Number);
const browser = await chromium.launch();
const errors = [], out = {};
const BLADES = ["The Forbidden", "The Ember", "The Exile", "The Hollow", "The Architect"];

// As netlab.mjs: what the relay delivers comes `lag` plus up to `jitter` later, in order.
const slow = ({ lag, jitter }) => {
  if (!lag && !jitter) return;
  let held;
  Object.defineProperty(window, "MP", {
    configurable: true, get: () => held,
    set(mp) {
      const join = mp.join.bind(mp);
      held = { ...mp, join: async (options) => {
        const room = await join(options);
        let last = 0;
        const later = (fn) => (...args) => { const at = Math.max(last, performance.now() + lag + Math.random() * jitter); last = at; setTimeout(() => fn(...args), at - performance.now()); };
        const onState = room.onState.bind(room), on = room.on.bind(room);
        room.onState = (fn) => onState(later(fn)); room.on = (type, fn) => on(type, later(fn));
        return room;
      } };
    },
  });
};

async function open(url, i) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${"ABCDE"[i]}: ${String(e).slice(0, 200)}`));
  await page.addInitScript(slow, { lag, jitter });
  // A fresh campaign for each, with its first chapter of every protagonist open.
  await page.addInitScript(() => { try { localStorage.setItem("coached", "1"); } catch {} });
  await page.goto(url);
  return page;
}
// Sets this page's fighter down at (x, y), through the physics engine as the game itself would.
const place = (page, x, y) => page.evaluate(async ([x, y]) => {
  const M = await import("/node_modules/.vite/deps/matter-js.js"), Body = (M.default ?? M).Body, H = window.fiveBlades.game.scene.hero;
  Body.setPosition(H.body, { x, y }); Body.setVelocity(H.body, { x: 0, y: 0 });
}, [x, y]);
const state = (page) => page.evaluate(() => {
  const { game, rules } = window.fiveBlades, S = game.scene, m = rules.get();
  return { screen: m.screen, quest: m.quest, alive: m.alive, lives: m.lives, cleared: m.cleared, level: S.level?.id ?? null, coop: S.coop, allies: S.allies.length,
    foes: S.enemies.filter((E) => E.alive && !E.peer).map((E) => ({ uid: E.uid, remote: E.remote, x: Math.round(E.body.position.x), y: Math.round(E.body.position.y), hp: Math.round(E.hp) })),
    talking: S.talking, keys: S.keys.map((k) => k.found), hero: S.hero && { x: Math.round(S.hero.body.position.x), y: Math.round(S.hero.body.position.y) } };
});

// A opens a table.
const A = await open(base, 0);
await A.getByRole("button", { name: "Campaign" }).click();
await A.getByRole("button", { name: /Play together/ }).click();
await A.getByRole("button", { name: "Open a new table" }).click();
const link = await A.getByLabel("Invite link").inputValue({ timeout: 20000 });
await A.getByRole("radio", { name: BLADES[0] }).click();
await A.getByRole("radio", { name: /^1\./ }).first().click();
out.link = link;

// The others come by the link, each takes a blade and is ready.
const pages = [A];
for (let i = 1; i < players; i++) {
  const P = await open(link, i);
  await P.getByRole("radio", { name: BLADES[i] }).click({ timeout: 20000 });
  await P.getByRole("button", { name: "Ready" }).click();
  pages.push(P);
}
await A.getByRole("button", { name: "Set out" }).waitFor({ timeout: 20000 });
await A.waitForTimeout(1500);
await A.screenshot({ path: "shots/latest/coop-table.png" });
await A.getByRole("button", { name: "Set out" }).click({ timeout: 20000 });
await A.waitForTimeout(4000);
// The guide talks first: A (the host) reads it through, as a player would (Skip, heed one voice, Begin), and the level
// goes on for all. B's level waits while A's guide talks, and B is shown what is said.
out.guestHears = await pages[1].getByRole("region", { name: / speaks$/ }).isVisible().catch(() => false);
for (let i = 0; i < 15; i++) {
  const button = A.getByRole("region", { name: / speaks$/ }).getByRole("button").first();
  if (!(await button.isVisible().catch(() => false))) break;
  await button.click(); await A.waitForTimeout(250);
}
await A.waitForTimeout(1500);
out.started = await Promise.all(pages.map(state));

// Everyone walks towards the first ambush; A's game springs it and runs its enemies.
const walk = (page, ms) => page.evaluate((ms) => new Promise((done) => { const { game } = window.fiveBlades; game.press("right"); setTimeout(() => { game.release("right"); done(); }, ms); }), ms);
for (let tries = 0; tries < 8 && !(await state(A)).foes.length; tries++) await Promise.all(pages.map((p) => walk(p, 1500)));
await A.waitForTimeout(1500);
const [a, b] = await Promise.all([state(A), state(pages[1])]);
// Where B draws each of A's enemies, against where A has it: the gap is the delay of the picture, a few frames.
const gaps = a.foes.map((f) => { const g = b.foes.find((each) => each.uid === f.uid); return g ? [g.x - f.x, g.y - f.y] : null; });
out.enemies = { host: a.foes.length, hostRemote: a.foes.filter((f) => f.remote).length, guest: b.foes.length, guestRemote: b.foes.filter((f) => f.remote).length, gaps };

// B strikes the nearest of A's enemies: set beside it, a few punches. A's enemy loses health.
if (a.foes.length) {
  const target = a.foes[0], before = target.hp;
  for (let i = 0; i < 8; i++) {
    const at = await pages[1].evaluate((uid) => { const E = window.fiveBlades.game.scene.enemies.find((each) => each.uid === uid); return E && { x: E.body.position.x, y: E.body.position.y }; }, target.uid);
    if (!at) break;
    await place(pages[1], at.x - 45, at.y);
    await pages[1].evaluate(() => { const { game } = window.fiveBlades; game.scene.hero.facing = 1; game.press("punch"); });
    await pages[1].waitForTimeout(110);
    await pages[1].evaluate(() => window.fiveBlades.game.release("punch"));
    await pages[1].waitForTimeout(130);
  }
  await A.waitForTimeout(800);
  const after = (await state(A)).foes.find((f) => f.uid === target.uid);
  out.guestBlows = { before, after: after ? after.hp : "fell" };
}

// A piece of the key: B takes the first, and A's game knows it found.
const key = await pages[1].evaluate(() => window.fiveBlades.game.scene.keys.find((k) => !k.found) ?? null);
if (key) await place(pages[1], key.x, key.y);
const keyed = key ? "moved" : "no keys";
await A.waitForTimeout(1500);
out.keys = { b: (await state(pages[1])).keys, a: (await state(A)).keys, keyed };

// Down and revived: B is knocked out; A stands by it until it is up again.
await pages[1].evaluate(() => { const { game, rules } = window.fiveBlades; for (let i = 0; i < 12 && rules.get().alive; i++) game.scene.hero && game.struck("test", { dmg: 60, kx: 0, ky: -2, heavy: true }); });
await A.waitForTimeout(1200);
const downAt = await pages[1].evaluate(() => window.fiveBlades.game.scene.down);
out.down = { downed: !!downAt, livesBefore: (await state(pages[1])).lives };
if (downAt) {
  const samples = [];
  for (let i = 0; i < 24; i++) {
    await place(A, downAt.x + 20, downAt.y - 40); await A.waitForTimeout(200);
    if (i % 4 === 0) samples.push(await Promise.all([A.evaluate(() => { const { rules, game } = window.fiveBlades; return { aAlive: rules.get().alive, aHp: rules.get().hp, foes: game.scene.enemies.filter((E) => E.alive).length }; }),
      pages[1].evaluate(() => { const S = window.fiveBlades.game.scene, a = S.allies.find((F) => F.peer && F.peer.name); return { held: S.down ? Math.round(S.down.held * 100) / 100 : null, seenA: S.allies.map((F) => [Math.round(F.body.position.x - (S.down?.x ?? 0)), Math.round(F.body.bounds.max.y - (S.down?.y ?? 0)), F.alive]).slice(0, 4) }; })]));
  }
  out.down.samples = samples;
  const s = await state(pages[1]);
  out.down.revived = s.alive; out.down.livesAfter = s.lives;
}

await Promise.all(pages.map((p, i) => p.screenshot({ path: `shots/latest/coop-${"abcde"[i]}.png` })));
// The host goes, without a word (its page closed): whoever sat down next takes the level over, and its enemies with it.
const beforeGo = await state(pages[1]);
await A.context().close();
const rest = pages.slice(1);
await rest[0].waitForTimeout(10000);
const after = await Promise.all(rest.map(state));
out.handover = { foesBefore: beforeGo.foes.length, newHost: after.map((s) => s.coop?.host), foes: after.map((s) => ({ all: s.foes.length, remote: s.foes.filter((f) => f.remote).length })), allies: after.map((s) => s.allies) };
// The way out, reached by the new host: everyone left has the level cleared.
// Whoever of them is still standing goes (in a fight of ten, a fighter standing still for the test is soon down).
const standing = (await Promise.all(rest.map(async (p) => [p, (await state(p)).alive]))).find(([, up]) => up)?.[0] ?? rest[0];
out.exitBy = rest.indexOf(standing) + 1;
const exit = await standing.evaluate(() => { const S = window.fiveBlades.game.scene; S.level.guarded = false; S.keys.forEach((k) => { k.found = true; }); return S.level.exit; });
await place(standing, exit.x, exit.y - 10);
await standing.waitForTimeout(3000);
out.cleared = await Promise.all(rest.map(async (p) => (await state(p)).cleared));
console.log(JSON.stringify({ players, lag, jitter, ...out, errors: errors.filter((e) => !/privy|Content Security|403|iframe/i.test(e)) }, null, 1));
await browser.close();

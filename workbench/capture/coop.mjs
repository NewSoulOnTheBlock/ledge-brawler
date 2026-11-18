// A co-op group on the running game (http://localhost:5199, or the address given), with the arena server running
// beside it (apps/app/arena/README.md), over the real engine and the real together.ts: node coop.mjs [players 2-5] [address].
// Each presses Play together and Find a group, and the arena should seat them all at one table; each takes a blade, A
// (the first, who leads) chooses chapter 1 of their campaign and sets out. Then: everyone is in the same level and
// sees the others; the arena runs the enemies, and every game, A's too, draws them where it says; a guest's blows land
// on them; a piece of the key found by one is found for all; a fighter knocked out is revived by a teammate standing by
// it; when A goes, the level and its enemies go on for the others; and when one reaches the way out the level is
// cleared for everyone.
import { chromium } from "playwright";
const players = Math.max(2, Math.min(5, Number(process.argv[2] ?? 2)));
const base = process.argv[3] ?? "http://localhost:5199/";
const browser = await chromium.launch();
const errors = [], out = {};
const BLADES = ["The Forbidden", "The Ember", "The Exile", "The Hollow", "The Architect"];

async function open(url, i) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 640 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${"ABCDE"[i]}: ${String(e).slice(0, 200)}`));
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

/** Play together, and a group found by the arena's matchmaking. */
async function find(page) {
  await page.getByRole("button", { name: "Campaign" }).click();
  await page.getByRole("button", { name: /Play together/ }).click();
  await page.getByRole("button", { name: "Find a group" }).click();
  return page.getByLabel("Invite link").inputValue({ timeout: 20000 });
}
const A = await open(base, 0);
const link = await find(A);
await A.getByRole("radio", { name: BLADES[0] }).click();
await A.getByRole("radio", { name: /^1\./ }).first().click();
out.link = link;

// The others find the same group with no link, each takes a blade and is ready.
const pages = [A], links = [link];
for (let i = 1; i < players; i++) {
  const P = await open(base, i);
  links.push(await find(P));
  await P.getByRole("radio", { name: BLADES[i] }).click({ timeout: 20000 });
  await P.getByRole("button", { name: "Ready" }).click();
  pages.push(P);
}
out.oneTable = links.every((each) => each === link);
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

// Everyone walks towards the first ambush; the arena springs it and runs its enemies.
// Everyone is set down in the first ambush's room, where its enemies wait (levels.ts, forbidden-1).
const room = await A.evaluate(() => { const L = window.fiveBlades.game.scene.level; return L.ambushes[0].foes[0]; });
for (let tries = 0; tries < 20 && !(await state(A)).foes.length; tries++) { await Promise.all(pages.map((p, i) => place(p, room.x - 120 + i * 30, room.y - 40))); await A.waitForTimeout(300); }
await A.waitForTimeout(1500);
const [a, b] = await Promise.all([state(A), state(pages[1])]);
// Where B draws each enemy, against where A draws it: both draw the arena's, so the gap is the jitter between them.
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
// The leader goes, without a word (its page closed): the level and its enemies go on at the arena for the others.
const beforeGo = await state(pages[1]);
await A.context().close();
const rest = pages.slice(1);
await rest[0].waitForTimeout(10000);
const after = await Promise.all(rest.map(state));
out.handover = { foesBefore: beforeGo.foes.length, guests: after.map((s) => s.coop?.host === false), foes: after.map((s) => ({ all: s.foes.length, remote: s.foes.filter((f) => f.remote).length })), allies: after.map((s) => s.allies) };
// The way out, reached by the new host: everyone left has the level cleared.
// Whoever of them is still standing goes (in a fight of ten, a fighter standing still for the test is soon down).
const standing = (await Promise.all(rest.map(async (p) => [p, (await state(p)).alive]))).find(([, up]) => up)?.[0] ?? rest[0];
out.exitBy = rest.indexOf(standing) + 1;
const exit = await standing.evaluate(() => { const S = window.fiveBlades.game.scene; S.level.guarded = false; S.keys.forEach((k) => { k.found = true; }); return S.level.exit; });
await place(standing, exit.x, exit.y - 10);
await standing.waitForTimeout(3000);
out.cleared = await Promise.all(rest.map(async (p) => (await state(p)).cleared));
console.log(JSON.stringify({ players, ...out, errors: errors.filter((e) => !/privy|Content Security|403|iframe/i.test(e)) }, null, 1));
await browser.close();

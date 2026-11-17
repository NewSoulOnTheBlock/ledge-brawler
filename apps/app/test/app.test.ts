// The arena of src/game/sim.ts against the match it reports to: what the spec cannot see is whether the physics
// says what happened. Stepped without a canvas, a sixtieth of a second at a time.
import { createServer } from "node:http";
import { Effect, Redacted } from "effect";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { FetchHttpClient } from "effect/http";
import Matter from "matter-js";
import { afterEach, expect, it, vi } from "vitest";
import { type Room, Refused, joinArena } from "../src/arena/link.ts";
import { pot } from "../src/arena/pot.vibe";
import type { BoutWord } from "../src/arena/protocol.ts";
import type { Pro } from "../src/arena/arena.ts";
import { serve } from "../src/arena/serve.ts";
import { DUEL, allLevels } from "../src/game/levels.ts";
import { type Standing, type Versus, joinVersus } from "../src/versus.ts";
import { within } from "../src/story/within.ts";
import { type Sfx, type Ui, createGame } from "../src/game/sim.ts";
import { runtimeOn } from "../src/runtime.ts";
import { rulesOf } from "../src/useMatch.ts";

const silent = new Proxy({}, { get: () => () => undefined }) as Sfx;

function arena() {
  const rules = rulesOf(runtimeOn(KeyValueStore.layerMemory));
  const said: string[] = [];
  const ui: Ui = { sfx: silent, banner: (text) => said.push(text), callout: (text) => said.push(text), clue: (fact) => said.push(fact), used: () => said.push("used") };
  const game = createGame(rules, ui);
  const steps = (n: number) => { for (let i = 0; i < n; i++) game.frame(1000 / 60); };
  /** Steps with the arena to itself: any enemy is dropped out of the arena as it arrives, so nothing interrupts. */
  const alone = (n: number) => { for (let i = 0; i < n; i++) { for (const enemy of game.scene.enemies) Matter.Body.setPosition(enemy.body, { x: 6000, y: 1760 }); game.frame(1000 / 60); } };
  return { rules, game, said, steps, alone };
}

// spec/app/index.md, "Story: Fight the waves"; spec/app/index.md, "Story: Charge and spend aura"; spec/app/index.md, "Story: Stay alive"
it("Fight the waves: a first wave arrives, a charge breaks into Overdrive, and a fall costs health", () => {
  const { rules, game, said, steps, alone } = arena();
  rules.send({ type: "enter" });
  rules.send({ type: "focus", pick: 2 });
  rules.send({ type: "fight" });
  game.begin();

  // spec/app/index.md, "Enemies of a wave arrive one at a time"
  steps(160);
  const first = rules.get();
  expect([first.wave, first.waiting + first.foes, game.scene.enemies.length]).toEqual([1, 2, first.foes]);
  expect(said).toContain("Wave 1");

  // spec/app/index.md, "Charging adds three quarters of a point of aura each step, up to full"
  // The enemies are moved under the islands first, so that nothing interrupts the charge.
  const hero = game.scene.hero!;

  // spec/app/index.md, "Every hit on an enemy is counted, and hits that follow closely build a combo"
  // Falling onto an enemy's head is a hit, and throws the fighter back up.
  for (let i = 0; i < 900 && !game.scene.enemies.some((e) => e.grounded); i++) steps(1);
  const target = game.scene.enemies.find((e) => e.grounded)!, counted = rules.get().hits;
  // On open ground in the middle of the arena, the enemy stood still and the fighter held over its head until the
  // feet come down on it.
  for (let i = 0; i < 40 && rules.get().hits === counted; i++) {
    Matter.Body.setPosition(target.body, { x: 800, y: 638 });
    Matter.Body.setVelocity(target.body, { x: 0, y: 0 });
    Matter.Body.setPosition(hero.body, { x: 800, y: target.body.bounds.min.y - 44 });
    Matter.Body.setVelocity(hero.body, { x: 0, y: 6 });
    steps(1);
  }
  expect(rules.get().hits).toBe(counted + 1);
  expect(hero.body.velocity.y).toBeLessThan(0);

  // Back on the ground where the fight began, before charging.
  Matter.Body.setPosition(hero.body, { x: 560, y: 600 });
  Matter.Body.setVelocity(hero.body, { x: 0, y: 0 });
  alone(50);
  game.press("charge");
  alone(140);
  game.release("charge");
  expect(rules.get().overdrive).toBeGreaterThan(0);
  expect(said).toContain("Overdrive");

  // spec/app/index.md, "Only an enemy in the arena can be knocked out, and each one counts"
  // The enemies moved under the islands fell out of the arena while the charge was held.
  expect(game.scene.enemies.length).toBe(rules.get().foes);
  expect(rules.get().kos).toBeGreaterThan(0);

  // spec/app/index.md, "Falling off the islands costs 25 health and ends flight"
  const before = rules.get().hp;
  Matter.Body.setPosition(hero.body, { x: hero.body.position.x, y: 1750 });
  // Long enough to outlast a freeze left by the blast of Overdrive.
  alone(12);
  expect(rules.get().hp).toBe(before - 25);
  expect(hero.body.position.y).toBeLessThan(1000);

  // Between waves the place goes dark and comes back under another sky.
  const sky = game.scene.sky, wave = rules.get().wave;
  let darkest = 0;
  for (let i = 0; i < 400 && rules.get().wave === wave; i++) { alone(1); darkest = Math.max(darkest, game.scene.fade); }
  expect([rules.get().wave, darkest, game.scene.sky !== sky]).toEqual([wave + 1, 1, true]);

  // spec/app/index.md, "A fighter knocked out against the waves starts over from the first"
  // One life: fall until the health is gone, and the fight begins again with nothing kept.
  for (let fall = 0; fall < 8 && rules.get().alive; fall++) { Matter.Body.setPosition(game.scene.hero!.body, { x: game.scene.hero!.body.position.x, y: 1750 }); alone(12); }
  expect(rules.get().alive).toBe(false);
  for (let i = 0; i < 400 && !rules.get().alive; i++) alone(1);
  // Back at full health: at least what it had before its first fall.
  expect([rules.get().alive, rules.get().wave, rules.get().kos, rules.get().hp >= before]).toEqual([true, 0, 0, true]);
});

// spec/app/index.md, "Story: Dash and climb"
// The feel of the fighter is in numbers the spec does not hold: how many steps to full speed and to a stop, how high a
// jump goes, how far a dash carries. Measured here on the first island, before the first wave arrives.
it("Dash and climb: quick to start and stop, a jump of three body heights, one dash an airtime, a grip that tires", () => {
  const { rules, game, alone: steps } = arena();
  rules.send({ type: "enter" });
  rules.send({ type: "fight" });
  game.begin();
  const hero = game.scene.hero!, at = () => hero.body.position, speed = () => Math.abs(hero.body.velocity.x);
  steps(40);

  // Six steps to full speed, five to a stop.
  game.press("right"); steps(6);
  const top = speed();
  steps(4);
  expect(speed()).toBeCloseTo(top, 1);
  game.release("right"); steps(5);
  expect(speed()).toBeLessThan(0.2);

  // About three times the fighter's own height, with the jump held.
  const ground = at().y;
  game.press("jump");
  let peak = ground;
  for (let i = 0; i < 80; i++) { steps(1); peak = Math.min(peak, at().y); }
  game.release("jump");
  expect((ground - peak) / 84).toBeGreaterThan(2.7);
  expect((ground - peak) / 84).toBeLessThan(3.3);
  expect(at().y).toBeCloseTo(ground, 0);

  // spec/app/index.md, "A fighter has one dash, and gets it back by touching the ground"
  game.press("jump"); steps(12); game.release("jump");
  const from = at().x;
  game.press("right"); game.press("dash"); steps(14); game.press("dash"); steps(2);
  game.release("right");
  expect(at().x - from).toBeGreaterThan(110);
  expect(rules.get().dashes).toBe(0);
  steps(60);
  expect(rules.get().dashes).toBe(1);

  // spec/app/index.md, "Holding a wall costs a little stamina each step, and climbing up it costs more"
  const wall = game.scene.statics.find((s) => s.label === "wall")!;
  Matter.Body.setPosition(hero.body, { x: wall.bounds.min.x - 15, y: wall.bounds.max.y - 50 });
  Matter.Body.setVelocity(hero.body, { x: 0, y: 0 });
  hero.facing = 1;
  game.press("grab"); steps(30);
  const held = at().y, rested = rules.get().stamina;
  steps(30);
  expect(at().y).toBeCloseTo(held, 0);
  expect(rules.get().stamina).toBeLessThan(rested);
  game.press("up"); steps(10);
  expect(at().y).toBeLessThan(held - 15);
  game.release("up");
  // Off the wall and away: a wall jump, which costs no stamina.
  const before = rules.get().stamina;
  game.press("left"); game.press("jump"); steps(3);
  expect(hero.body.velocity.x).toBeLessThan(-5);
  expect(rules.get().stamina).toBe(before);
});

// spec/app/index.md, "Story: Play a level of a campaign"
// A level is crossed, not survived: its enemies wait where it puts them, its clue is somewhere to be reached, and
// the way out ends it. The fighter is set down at each place in turn; getting there is the player's part.
it("Play a level of a campaign: its rooms can be crossed, ambushes spring as they are entered, a clue is found, and the way out opens when its guards are down", () => {
  const { rules, game, said, steps } = arena();
  const LEVELS = allLevels(), level = LEVELS[0];
  // Every level is laid out from its seed and proved crossable as it is made (rooms.ts): being here at all is that proof.
  expect(LEVELS.map((each) => [each.rooms![0] * each.rooms![1] >= 24, each.clues.length >= 2, each.guarded])).toEqual(LEVELS.map(() => [true, true, true]));
  rules.send({ type: "enter" });
  rules.send({ type: "embark" });
  game.begin(level);
  const hero = game.scene.hero!;
  const stand = (x: number, y: number) => { Matter.Body.setPosition(hero.body, { x, y }); Matter.Body.setVelocity(hero.body, { x: 0, y: 0 }); steps(2); };

  // spec/app/index.md, "The next wave starts only when no enemy is left, and brings one more enemy than its number, eight at most"
  // No wave comes on its own in a level, however long the fighter waits: only what the room it starts in holds, which
  // meets it at once. With those gone nothing else comes, and it stands where it was put, not falling.
  const inRoom = (a: (typeof level.ambushes)[number], at: { x: number; y: number }) => at.x > a.zone![0] && at.x < a.zone![2] && at.y > a.zone![1] && at.y < a.zone![3];
  const met = level.ambushes.filter((a) => inRoom(a, level.spawn)).reduce((sum, a) => sum + a.foes.length, 0);
  steps(3);
  expect(rules.get().foes).toBe(met);
  for (const enemy of game.scene.enemies) Matter.Body.setPosition(enemy.body, { x: enemy.body.position.x, y: game.scene.voidY + 100 });
  steps(200);
  expect([rules.get().quest, rules.get().foes, Math.abs(hero.body.position.y - level.spawn.y) < 60]).toEqual([true, 0, true]);

  // spec/app/index.md, "A level brings its enemies where it places them, never more than eight waiting at once"
  const first = level.ambushes.find((a) => !inRoom(a, level.spawn) && !inRoom(a, level.exit))!;
  stand(first.foes[0].x, first.foes[0].y);
  expect([rules.get().foes, game.scene.enemies.length]).toEqual([first.foes.length, first.foes.length]);
  stand(first.foes[0].x + 10, first.foes[0].y);
  expect(rules.get().foes).toBe(first.foes.length);

  const clue = level.clues[0];
  stand(clue.x, clue.y);
  expect(said).toContain(clue.fact);

  // spec/app/index.md, "Reaching the way out clears the level, once, and only for a living fighter on a quest"
  // The way out is in the boss's room, which is shut until the three pieces of its key are found: the fighter is turned back at its door.
  const lair = level.ambushes[level.ambushes.length - 1];
  stand(level.exit.x, level.exit.y);
  expect([game.scene.keys.length, game.scene.locked, inRoom(lair, hero.body.position), game.scene.enemies.some((E) => E.final)]).toEqual([3, true, false, false]);
  for (const key of game.scene.keys) stand(key.x, key.y);
  expect(game.scene.keys.every((key) => key.found)).toBe(true);
  // The way out is guarded: being at it brings its guards, and it stays shut until they are gone. The first of them is
  // the boss, four times the size and the health, and the room is shut behind the fighter while it stands.
  stand(level.exit.x, level.exit.y);
  expect([rules.get().cleared, game.scene.sealed, game.scene.enemies.some((E) => E.final)]).toEqual([false, true, true]);
  const boss = game.scene.enemies.find((E) => E.boss)!;
  expect([boss.big, boss.maxHp >= 4 * 26, game.scene.locked]).toEqual([4, true, true]);
  stand(lair.zone![0] - 300, level.exit.y);
  expect(inRoom(lair, { x: hero.body.position.x + 1, y: hero.body.position.y })).toBe(true);
  for (const guard of game.scene.enemies.filter((E) => E.final)) Matter.Body.setPosition(guard.body, { x: guard.body.position.x, y: game.scene.voidY + 100 });
  steps(3);
  stand(level.exit.x, level.exit.y);
  expect(rules.get().cleared).toBe(true);
  const stopped = game.scene.time;
  steps(30);
  expect(game.scene.time).toBe(stopped);
  rules.send({ type: "leave" });
  expect([rules.get().screen, rules.get().quest]).toEqual(["Select", false]);

  // The guide waits where a level starts, and while he talks nothing in it moves.
  rules.send({ type: "embark" });
  game.begin(level);
  expect([level.talk!.length >= 3, game.scene.guide !== null]).toEqual([true, true]);
  game.talk(true);
  const held = { ...game.scene.hero!.body.position };
  game.press("right"); steps(40);
  expect([game.scene.hero!.body.position.x, rules.get().foes]).toEqual([held.x, 0]);
  game.talk(false); game.press("right"); steps(40);
  expect(game.scene.hero!.body.position.x).toBeGreaterThan(held.x + 20);
  game.release("right");
  rules.send({ type: "openMoves" }); rules.send({ type: "change" });

  // A level's plants throw and its spikes hurt.
  const wild = LEVELS.find((each) => each.springs!.length > 0 && each.hazards!.length > 0)!;
  // A spike outside the boss's room, which is shut to a fighter without its key.
  const spike = wild.hazards!.find((hazard) => !inRoom(wild.ambushes[wild.ambushes.length - 1], { x: hazard.x, y: hazard.y - 44 }))!;
  rules.send({ type: "embark" });
  game.begin(wild);
  const walker = game.scene.hero!;
  const put = (x: number, y: number) => { Matter.Body.setPosition(walker.body, { x, y }); Matter.Body.setVelocity(walker.body, { x: 0, y: 0 }); steps(2); };
  put(wild.springs![0].x, wild.springs![0].y - 44);
  expect(walker.body.velocity.y).toBeLessThan(-15);
  // spec/app/index.md, "Being hit costs health and gives 3 aura; a hit that takes the last health is a knockout"
  const before = rules.get().hp;
  put(spike.x, spike.y - 44);
  expect(rules.get().hp).toBe(before - spike.dmg);

  // spec/app/index.md, "A level starts from the select screen like a fight, but as a quest with three lives"
  // spec/app/index.md, "Only a knocked-out fighter revives, with full health and at least 40 aura"
  // A life lost on a quest sends the fighter back to where the level starts, and the third is the last.
  rules.send({ type: "openMoves" }); rules.send({ type: "change" }); rules.send({ type: "embark" });
  game.begin(wild);
  const from = { ...game.scene.hero!.body.position };
  // Knocked out on the spike, then waited for until it stands again, if it will: where it stands then is where it was put back.
  const fall = () => { for (let hit = 0; hit < 80 && rules.get().alive; hit++) { Matter.Body.setPosition(game.scene.hero!.body, { x: spike.x, y: spike.y - 44 }); steps(20); } for (let wait = 0; wait < 400 && !rules.get().alive; wait++) steps(1); };
  const where = () => { const at = game.scene.hero!.body.position; return Math.hypot(at.x - from.x, at.y - from.y) < 80; };
  expect(rules.get().lives).toBe(3);
  fall(); expect([rules.get().alive, rules.get().lives, where()]).toEqual([true, 2, true]);
  fall(); expect([rules.get().alive, rules.get().lives, where()]).toEqual([true, 1, true]);
  fall(); expect([rules.get().alive, rules.get().lives]).toEqual([false, 1]);
  // spec/app/index.md, "A fighter out of lives on a quest can be let off once, and goes on with its last life"
  game.bargain(); steps(5);
  expect([rules.get().alive, rules.get().lives, where()]).toEqual([true, 1, true]);
  fall(); game.bargain(); steps(5);
  expect([rules.get().alive, rules.get().spared]).toEqual([false, true]);

  // The black room a fighter tries a new power in (story/within.ts): what stands there only stands and does not fall,
  // the power never runs out, and using it is told.
  rules.send({ type: "openMoves" }); rules.send({ type: "change" }); rules.send({ type: "train", vigor: 0, learned: 1 }); rules.send({ type: "embark" });
  game.begin(within(wild.hero)); game.trial(0); steps(30);
  game.press("s1"); steps(2); game.release("s1"); steps(300);
  expect([game.scene.dark, game.scene.enemies.length, game.scene.enemies.every((E) => E.alive && E.hp >= 1), rules.get().aura >= 100000, rules.get().hp === game.scene.hero!.maxHp, said.includes("used")]).toEqual([true, 3, true, true, true, true]);
});

// spec/app/index.md, "Story: Fight other players"
// A duel as one player's game lives it: a stand-in rival while nobody else is there, another player's fighter
// placed where their game says, a blow of theirs taken, the guard, and three lives spent.
it("Fight other players: a rival stands in, a blow from another player lands, the guard holds, and lives run out", () => {
  const { rules, game, steps } = arena();
  rules.send({ type: "enter" });
  // spec/app/index.md, "A duel starts from the select screen like a fight, with three lives and no waves"
  rules.send({ type: "duel" });
  game.begin(DUEL);
  steps(200);
  expect([rules.get().lives, rules.get().wave, game.scene.enemies.map((E) => E.tag)]).toEqual([3, 0, ["CPU"]]);

  // Another player arrives: the stand-in goes, and their fighter is where their game says it is.
  const peer = { id: "p2", name: "Tide-1", fighter: 2, x: 900, y: 600, vx: 0, vy: 0, facing: -1, hp: 90, lives: 3, alive: true, glow: false, guard: false, over: false, special: null, at: { anim: "idle" as const, frame: 0 } };
  game.peers([peer]);
  steps(3);
  expect(game.scene.enemies.map((E) => [E.peer?.name, Math.round(E.body.position.x)])).toEqual([["Tide-1", 900]]);

  // spec/app/index.md, "Being hit costs health and gives 3 aura; a hit that takes the last health is a knockout"
  const full = rules.get().hp;
  game.struck("p2", { dmg: 10, kx: 0, ky: 0 });
  expect(rules.get().hp).toBe(full - 10);
  // Guarded, the same blow costs a fifth.
  steps(60);
  game.press("guard"); steps(3);
  game.struck("p2", { dmg: 10, kx: 0, ky: 0 });
  expect(rules.get().hp).toBe(full - 12);
  game.release("guard");

  // spec/app/index.md, "Only a knocked-out fighter revives, with full health and at least 40 aura"
  // Each return costs a life, and from the last there is none.
  for (const left of [2, 1]) { steps(60); game.struck("p2", { dmg: 500, kx: 0, ky: 0 }); steps(400); expect([rules.get().alive, rules.get().lives]).toEqual([true, left]); }
  steps(60); game.struck("p2", { dmg: 500, kx: 0, ky: 0 }); steps(400);
  expect([rules.get().alive, rules.get().lives]).toEqual([false, 1]);
  // spec/app/index.md, "A duel can be fought again from the start, at any moment of it"
  rules.send({ type: "rematch" }); game.begin(DUEL);
  expect([rules.get().alive, rules.get().lives]).toEqual([true, 3]);
});

// ---------- the arena server (src/arena/) ----------
// Its journeys run the real server on a free port and meet it as the game does, through src/arena/link.ts over real
// WebSockets. Its clock runs on, and a test moves it ahead, so rounds and returns to the fight come when a test says.

const servers: { close(): Promise<void> }[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => s.close())); vi.unstubAllEnvs(); });

/** Polls `seen` until it holds, for up to two seconds. */
async function until<T>(seen: () => T, what: string): Promise<NonNullable<T>> {
  for (let t = 0; t < 200; t++) { const v = seen(); if (v) return v; await new Promise((done) => setTimeout(done, 10)); }
  throw new Error(`never: ${what}`);
}

/** An arena on its own clock, and players who sit down at it as the game would. */
async function arenaServer(pro?: Pro) {
  const clock = { ahead: 0 }, now = () => Date.now() + clock.ahead;
  const serving = await serve(0, { now, pro });
  servers.push(serving);
  const url = `ws://localhost:${serving.port}/play`;
  /** A player's seat, and the bout as the server last told it. */
  async function player(name: string, seek: Partial<Parameters<typeof joinArena>[0]> = {}) {
    const room = await joinArena({ kind: "duel", name, fighter: 0, vigor: 0, ...seek }, url);
    const seen = { bout: null as BoutWord | null, hits: [] as { from: string; dmg: number }[] };
    room.onBout((bout) => { seen.bout = bout; });
    room.on("hit", (data: { dmg: number }, from) => { seen.hits.push({ from, dmg: data.dmg }); });
    servers.push({ close: () => room.leave() });
    return { room, seen, mine: () => seen.bout?.fighters[room.sessionId] };
  }
  /** Where a fighter says it is, packed as versus.ts packs it: in the middle of a jab, or of a special, or guarding. */
  const at = (room: Room, x: number, how: { special?: boolean; guard?: boolean } = {}) =>
    room.me.set({ s: [x, 600, 0, 0, 1, 100, 3, 1, 0, how.guard ? 1 : 0, 1, 0, "m:jab:3", 0, how.special ? "0:5::" : "", now()].join(",") });
  return { url, player, at, later: (ms: number) => { clock.ahead += ms; } };
}

// spec/app/lobby.md, "Story: Find a match"
it("Find a match: players looking for a duel or a group are put together, invitations reach their table, and a full table is full", async () => {
  const { player, url } = await arenaServer();
  // spec/app/lobby.md, "A player looking for a match sits at an open table of that kind with a free seat, or, only when there is none, opens a new one"
  const ada = await player("Ada"), bo = await player("Bo");
  expect(bo.room.code).toBe(ada.room.code);
  // Looking for a group is another kind of table.
  const cy = await player("Cy", { kind: "group" }), di = await player("Di", { kind: "group" });
  expect([cy.room.code === ada.room.code, di.room.code]).toEqual([false, cy.room.code]);
  // spec/app/lobby.md, "A player with an invitation opens a private table, or sits at the table it names while it has a free seat"
  const host = await player("Host", { code: "friends" });
  expect(host.room.code).toBe("friends");
  const stranger = await player("Stranger");
  expect(stranger.room.code).toBe(ada.room.code);
  for (const name of ["F2", "F3", "F4", "F5"]) expect((await player(name, { code: "friends" })).room.code).toBe("friends");
  await expect(joinArena({ kind: "duel", name: "F6", fighter: 0, vigor: 0, code: "friends" }, url)).rejects.toMatchObject({ why: "full" });
  // A pro match's table is reached only by paying for it.
  await expect(joinArena({ kind: "duel", name: "Sneak", fighter: 0, vigor: 0, code: "pro7" }, url)).rejects.toBeInstanceOf(Refused);
  // Two more fill the open duel table, and the next one looking opens another.
  await player("E1"); await player("E2");
  expect((await player("E3")).room.code).not.toBe(ada.room.code);
});

// spec/app/bout.md, "Story: Fight for the pot"
it("Fight for the pot: the server begins rounds, lands only blows that could have landed, keeps health and lives, and names the winner", async () => {
  const { player, at, later } = await arenaServer();
  // Trained health counts, up to what training can give (spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen").
  const ada = await player("Ada", { fighter: 1, vigor: 20 }), bo = await player("Bo", { fighter: 2, vigor: 500 });
  await until(() => ada.mine() && bo.mine(), "both seated");
  expect([ada.mine()!.most, bo.mine()!.most]).toEqual([145, 140]);
  at(ada.room, 500); at(bo.room, 560);
  const blow = (from: typeof ada, to: typeof bo, dmg: number, n: number, round = 1) => from.room.send("hit", { to: to.room.sessionId, n, round, dmg, kx: 4, ky: -2 });

  // spec/app/bout.md, "A round begins between two or more, when no round is being fought, and gives everyone full health and three lives"
  // No blow counts before the round begins.
  blow(ada, bo, 30, 1, 0);
  await until(() => typeof ada.seen.bout?.next === "number", "the round coming");
  later(3_000);
  await until(() => ada.seen.bout?.fighting && ada.seen.bout.round === 1, "round 1");
  expect(bo.mine()!.hp).toBe(140);
  at(ada.room, 500); at(bo.room, 560);

  // spec/app/bout.md, "A blow lands only between two different fighters who are both standing, in a round that is not over, and does from 1 to 60"
  blow(ada, bo, 999, 2);
  await until(() => bo.mine()!.hp === 80, "a blow, held to 60");
  // Its game is told the health the server took, not what the striker's game claimed.
  expect(bo.seen.hits).toEqual([{ from: ada.room.sessionId, dmg: 60 }]);
  // Told twice, from the round before, or from across the arena, it does nothing.
  blow(ada, bo, 10, 2); blow(ada, bo, 10, 3, 0);
  at(ada.room, 4000); await until(() => true, ""); blow(ada, bo, 10, 4);
  at(ada.room, 500); at(bo.room, 560, { special: true });
  // In the middle of a special the fighter cannot be touched.
  await new Promise((done) => setTimeout(done, 60)); blow(ada, bo, 10, 5);
  at(bo.room, 560, { guard: true });
  // A held guard lets a fifth through.
  await new Promise((done) => setTimeout(done, 60)); blow(ada, bo, 20, 6);
  await until(() => bo.mine()!.hp === 76, "the guarded blow");
  expect(bo.seen.hits.length).toBe(2);

  // spec/app/bout.md, "A fall off the islands costs a standing fighter 25 health, and may knock it out, with no knockout scored"
  at(bo.room, 560);
  bo.room.fell();
  await until(() => bo.mine()!.hp === 51, "the fall");
  // spec/app/bout.md, "A blow that takes the last health knocks its fighter out: a life is lost, and the striker scores a knockout"
  blow(ada, bo, 60, 7);
  await until(() => bo.mine()!.lives === 2, "a knockout");
  expect([bo.mine()!.hp, ada.mine()!.kos]).toEqual([0, 1]);
  // spec/app/bout.md, "A knocked-out fighter with lives left comes back with its most health"
  blow(ada, bo, 10, 8);
  later(2_000);
  await until(() => bo.mine()!.hp === 140, "back on its feet");
  expect(bo.mine()!.lives).toBe(2);

  // spec/app/bout.md, "A round is over when at most one fighter has lives left"
  let n = 9;
  for (const lives of [1, 0]) {
    // The striker's game says where it is many times a second; here, before each blow.
    for (let hp = 140; hp > 0; hp -= 60) { later(1_000); at(ada.room, 500); blow(ada, bo, 60, n++); await until(() => bo.mine()!.hp === Math.max(0, hp - 60), "a blow"); }
    expect(bo.mine()!.lives).toBe(lives);
    later(2_000); await until(() => lives === 0 || bo.mine()!.hp === 140, "back up");
  }
  await until(() => ada.seen.bout?.over, "the round over");
  expect([ada.seen.bout!.winner, ada.mine()!.kos]).toEqual([ada.room.sessionId, 3]);
  // spec/app/bout.md, "Once a round is over, nothing changes how it ended until the next one begins"
  blow(bo, ada, 30, 1);
  // The next round comes by itself, and everyone starts it whole.
  await until(() => typeof ada.seen.bout?.next === "number", "the next round coming");
  later(6_000);
  await until(() => ada.seen.bout?.round === 2 && ada.seen.bout.fighting, "round 2");
  expect([ada.mine(), bo.mine()]).toEqual([{ hp: 145, most: 145, lives: 3, kos: 0 }, { hp: 140, most: 140, lives: 3, kos: 0 }]);
  // A round between two is over the moment one of them goes.
  await bo.room.leave();
  await until(() => ada.seen.bout?.over, "the other gone");
  expect(ada.seen.bout!.winner).toBe(ada.room.sessionId);
});

// spec/app/bout.md, "Story: Fight for the pot"
it("Fight for the pot: a pro match seats only paid entries, locks once its fight begins, and its winner's entry is told to the site", async () => {
  // The site's pot (server/api/pro-arena.js) at its network boundary: what the arena asks, answered as the site would.
  const asked: Record<string, unknown>[] = [];
  const site = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const said = JSON.parse(body) as Record<string, unknown>;
      asked.push({ ...said, authorization: req.headers.authorization });
      const answer = said.action !== "seat" ? { ok: true } : said.token === "good" && (said.entry === 11 || said.entry === 12) ? { match: 7 } : { error: "That entry has no match to play." };
      res.writeHead("error" in answer ? 400 : 200, { "content-type": "application/json" }).end(JSON.stringify(answer));
    });
  });
  await new Promise<void>((done) => site.listen(0, done));
  servers.push({ close: () => new Promise((done) => site.close(() => done())) });
  const address = site.address();
  const pro = await Effect.runPromise(Effect.provide(pot(`http://localhost:${typeof address === "object" && address ? address.port : 0}`, Redacted.make("arena-secret")), FetchHttpClient.layer));
  const { player, at, later, url } = await arenaServer(pro);

  // A seat only for an entry the site says is paid and the player's own.
  await expect(joinArena({ kind: "duel", name: "Thief", fighter: 0, vigor: 0, pro: { entry: 13, token: "good" } }, url)).rejects.toMatchObject({ why: "pro" });
  const ada = await player("Ada", { pro: { entry: 11, token: "good" } }), bo = await player("Bo", { pro: { entry: 12, token: "good" } });
  expect([ada.room.code, bo.room.code, ada.room.pro]).toEqual(["pro7", "pro7", true]);
  // The same entry cannot sit twice.
  await expect(joinArena({ kind: "duel", name: "Ada again", fighter: 0, vigor: 0, pro: { entry: 11, token: "good" } }, url)).rejects.toMatchObject({ why: "pro" });
  at(ada.room, 500); at(bo.room, 560);
  // A pro round waits longer, for every paid seat to arrive; when it begins the match takes no more entries.
  await until(() => typeof ada.seen.bout?.next === "number", "the round coming");
  later(3_000); await new Promise((done) => setTimeout(done, 80));
  expect(ada.seen.bout?.fighting).toBe(false);
  later(12_000);
  await until(() => ada.seen.bout?.fighting, "the pro round");
  await until(() => asked.some((a) => a.action === "fight"), "the match locked");
  let n = 1;
  for (let lives = 3; lives > 0; lives--) {
    for (let hp = 100; hp > 0; hp -= 60) { later(1_000); at(ada.room, 500); ada.room.send("hit", { to: bo.room.sessionId, n: n++, round: 1, dmg: 60 }); await until(() => bo.mine()!.hp === Math.max(0, hp - 60), "a blow"); }
    later(2_000); await until(() => lives === 1 || bo.mine()!.hp === 100, "back up");
  }
  await until(() => ada.seen.bout?.over, "the match won");
  // spec/app/bout.md, "A round is over when at most one fighter has lives left"
  const result = await until(() => asked.find((a) => a.action === "result"), "the result told");
  expect(result).toEqual({ action: "result", match: 7, winner: 11, authorization: "Bearer arena-secret" });
  // One round only: a pot is fought for once.
  later(10_000); await new Promise((done) => setTimeout(done, 80));
  expect([ada.seen.bout?.round, ada.seen.bout?.next]).toEqual([1, null]);
});

// spec/app/lobby.md, "Story: Find a match"
it("Find a match: a dropped connection gets its seat back, and what a game sends that makes no sense is ignored", async () => {
  const { url } = await arenaServer();
  const open = () => new Promise<WebSocket & { heard: Record<string, unknown>[] }>((done) => {
    const socket = Object.assign(new WebSocket(url), { heard: [] as Record<string, unknown>[] });
    socket.onmessage = (event) => socket.heard.push(JSON.parse(String(event.data)) as Record<string, unknown>);
    socket.onopen = () => done(socket);
  });
  const first = await open();
  for (const junk of ["not json", "[]", JSON.stringify({ t: "seek", kind: "arena" }), JSON.stringify({ t: "set", f: "x" }), JSON.stringify({ t: "say", type: "x".repeat(40) })]) first.send(junk);
  first.send(JSON.stringify({ t: "seek", kind: "duel", name: "Ada", fighter: 3, vigor: 0 }));
  const seat = await until(() => first.heard.find((w) => w.t === "seated"), "a seat") as { id: string; key: string; code: string };
  first.close();
  await new Promise((done) => setTimeout(done, 50));
  const second = await open();
  // A wrong key is no way back into the seat.
  second.send(JSON.stringify({ t: "seek", kind: "duel", name: "Ada", fighter: 3, vigor: 0, resume: { id: seat.id, key: "guess" } }));
  const other = await until(() => second.heard.find((w) => w.t === "seated"), "a seat") as { id: string };
  expect(other.id).not.toBe(seat.id);
  const third = await open();
  third.send(JSON.stringify({ t: "seek", kind: "duel", name: "Ada", fighter: 3, vigor: 0, resume: { id: seat.id, key: seat.key } }));
  expect(await until(() => third.heard.find((w) => w.t === "seated"), "the seat back")).toMatchObject({ id: seat.id, code: seat.code });
  second.close(); third.close();
});

// spec/app/index.md, "Story: Fight other players"; spec/app/bout.md, "Story: Fight for the pot"
// Two players' games, each its own arena of sim.ts stepped a sixtieth of a second at a time, at one table of the
// arena server through versus.ts: the round the server begins starts in both, a punch thrown in one lands in the other
// by way of the server, and a fall costs what the server takes.
it("Fight other players: two games at the arena start the server's round together, a punch lands through the server, and a fall costs what it takes", async () => {
  const { url, later } = await arenaServer();
  vi.stubEnv("VITE_ARENA_URL", url);
  async function duelist(name: string) {
    const rules = rulesOf(runtimeOn(KeyValueStore.layerMemory));
    let net: Versus | null = null;
    const ui: Ui = { sfx: silent, banner: () => undefined, callout: () => undefined, strike: (to, blow) => net?.strike(to, blow), shot: (orb) => net?.shot(orb), fx: (sprite) => net?.fx(sprite), fell: () => net?.fell() };
    const game = createGame(rules, ui);
    rules.send({ type: "enter" }); rules.send({ type: "duel" }); game.begin(DUEL);
    const seen = { standing: { rivals: [], status: "joining" } as Standing };
    net = await joinVersus(undefined, name, DUEL, game, rules, (standing) => { seen.standing = standing; });
    const playing = net;
    servers.push({ close: () => Promise.resolve(playing.leave()) });
    return { rules, game, net: playing, seen, hero: () => game.scene.hero! };
  }
  const ada = await duelist("Ada"), bo = await duelist("Bo");
  expect(bo.net.code).toBe(ada.net.code);
  /** Both games, frame by frame as the page plays them, until `done` holds. */
  async function play(done: () => boolean, what: string, most = 600) {
    for (let i = 0; i < most; i++) {
      for (const p of [ada, bo]) { p.net.tick(); p.game.frame(1000 / 60); }
      if (done()) return;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    throw new Error(`never: ${what} (${JSON.stringify([ada.seen.standing, bo.seen.standing])})`);
  }
  // spec/app/bout.md, "A round begins between two or more, when no round is being fought, and gives everyone full health and three lives"
  await play(() => ada.seen.standing.status === "starting" && bo.seen.standing.status === "starting", "the round announced");
  later(3_000);
  await play(() => ada.seen.standing.status === "fighting" && bo.seen.standing.status === "fighting" && ada.seen.standing.rivals.length === 2, "the round begun");
  // Face to face on the middle ledge, Bo standing still.
  const stand = (p: typeof ada, x: number, facing: number) => { Matter.Body.setPosition(p.hero().body, { x, y: 600 }); Matter.Body.setVelocity(p.hero().body, { x: 0, y: 0 }); p.hero().facing = facing; };
  const full = bo.rules.get().hp;
  await play(() => { stand(bo, 560, -1); stand(ada, 500, 1); return ada.game.scene.enemies.some((E) => E.peer && Math.abs(E.body.position.x - 560) < 2); }, "Bo seen where Bo is");
  // spec/app/bout.md, "A blow lands only between two different fighters who are both standing, in a round that is not over, and does from 1 to 60"
  await play(() => { stand(bo, 560, -1); ada.game.press("punch"); ada.game.release("punch"); return bo.rules.get().hp < full; }, "a punch landing", 300);
  const punched = bo.rules.get().hp;
  expect(punched).toBeGreaterThan(full - 60);
  // spec/app/bout.md, "A fall off the islands costs a standing fighter 25 health, and may knock it out, with no knockout scored"
  Matter.Body.setPosition(bo.hero().body, { x: 560, y: 1750 });
  await play(() => bo.rules.get().hp <= punched - 25, "the fall");
  // The server took the same: its word does not lower Bo's health further.
  await play(() => false, "", 30).catch(() => undefined);
  expect(bo.rules.get().hp).toBe(punched - 25);
});

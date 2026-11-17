// The arena of src/game/sim.ts against the match it reports to: what the spec cannot see is whether the physics
// says what happened. Stepped without a canvas, a sixtieth of a second at a time.
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import Matter from "matter-js";
import { expect, it } from "vitest";
import { DUEL, allLevels } from "../src/game/levels.ts";
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

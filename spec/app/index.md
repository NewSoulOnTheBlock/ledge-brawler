# App

What the application in `apps/app` does: Five Blades (first built as Ledge Brawler), a stick-figure
fighting game for one player. The player picks one of five fighters and
fights endless waves of enemies across floating islands.

This spec owns the match: which screen is showing, the fighter's health and
aura, Overdrive, flight, its dash and climbing stamina, the waves and the
score. Where bodies are, what
touches what, and how long things take are the physics of the arena, which
reports here what happened.

Health is whole points. Aura is counted in thousandths of a point, so a full
bar of 100 is 100000. Time is counted in steps of the arena, sixty a second.

## Story: Choose a fighter

> As a player, I want to look over the five fighters and pick one, so that I
> fight with the one that suits me.

### A match holds its screen, its fighter, and how the fight stands

It starts on the title screen with the first fighter, Ink, at full health.

```quint
type Screen = Title | Select | Play

type Match = {
  screen: Screen,
  fighter: int,
  paused: bool,
  hp: int,
  alive: bool,
  aura: int,
  held: int,
  overdrive: int,
  flying: bool,
  wave: int,
  waiting: int,
  foes: int,
  kos: int,
  hits: int,
  combo: int,
  best: int,
  found: Set[int],
  stamina: int,
  dashes: int,
  owed: bool,
  quest: bool,
  cleared: bool,
  duel: bool,
  lives: int,
  learned: int,
  vigor: int,
  spared: bool,
  world: bool,
  hasDash: bool
}

pure val initial: Match = {
  screen: Title, fighter: 0, paused: false, hp: 100, alive: true, aura: 40000, held: 0, overdrive: 0,
  flying: false, wave: 0, waiting: 0, foes: 0, kos: 0, hits: 0, combo: 0, best: 0, found: Set(),
  stamina: 110000, dashes: 1, owed: false, quest: false, cleared: false, duel: false, lives: 0, learned: 5, vigor: 0, spared: false,
  world: false, hasDash: false
}
```

### There are five fighters, each with its own health

Ink has 100, Ember 125, Tide 90, Volt 85 and Moss 95.

```quint
pure val fighters = 5

pure def healthOf(f: int): int =
  if (f == 1) 125 else if (f == 2) 90 else if (f == 3) 85 else if (f == 4) 95 else 100
```

### A fighter can be trained for up to 50 more health, on the select screen

What a player has built its fighter into goes with it into every kind of fight: against the waves, on a quest and
in a duel alike. Its full health is its own and what it was trained for. With its training it is told how many of
its five things its campaign has taught it, one for each chapter finished: its first, second and third special,
then Overdrive, then flight. Each of its first three chapters teaches two specials: one of its first three, and the
one of its last three that goes with it. Choosing another fighter starts from that fighter's own health, knowing all five.

```quint
pure val vigorValues = Set(-1, 0, 10, 50, 51)

pure val learnedValues = Set(-1, 0, 2, 4, 5, 6)

pure def full(m: Match): int = healthOf(m.fighter) + m.vigor

pure def canTrain(m: Match, vigor: int, learned: int): bool =
  m.screen == Select and 0 <= vigor and vigor <= 50 and 0 <= learned and learned <= 5

pure def train(m: Match, vigor: int, learned: int): Match =
  { ...m, vigor: vigor, learned: learned, hp: healthOf(m.fighter) + vigor, alive: true }

pure def alwaysVigorIsInRange(m: Match): bool = 0 <= m.vigor and m.vigor <= 50

pure def sometimesTrained(m: Match): bool = m.screen == Play and m.vigor == 50
```

### The fighter is always one of the five

```quint
pure def alwaysFighterIsOnTheRoster(m: Match): bool = 0 <= m.fighter and m.fighter < fighters
```

### The title screen leads to the select screen, and back

```quint
pure def canEnter(m: Match): bool = m.screen == Title

pure def enter(m: Match): Match = { ...m, screen: Select }

pure def canBack(m: Match): bool = m.screen == Select

pure def back(m: Match): Match = { ...m, screen: Title }
```

### Only on the select screen can a fighter be focused, and only one of the five

The focused fighter is shown rested, at its full health.

```quint
pure def canFocus(m: Match, pick: int): bool = m.screen == Select and 0 <= pick and pick < fighters

pure def focus(m: Match, pick: int): Match = { ...m, fighter: pick, hp: healthOf(pick), alive: true, flying: false, vigor: 0, learned: 5 }
```

### The fighter changes only by being focused

```quint
pure def stepFighterIsChosenOnTheSelectScreen(before: Match, via: str, after: Match): bool =
  via != "focus" implies after.fighter == before.fighter
```

### A fight starts from the select screen with full health, 40 aura and nothing else

No wave, no enemies, no score, and no moves found yet. The fighter is rested:
full stamina and its dash ready.

```quint
pure def canFight(m: Match): bool = m.screen == Select

pure def fight(m: Match): Match = {
  screen: Play, fighter: m.fighter, paused: false, hp: full(m), alive: true, aura: 40000, held: 0,
  overdrive: 0, flying: false, wave: 0, waiting: 0, foes: 0, kos: 0, hits: 0, combo: 0, best: 0, found: Set(),
  stamina: 110000, dashes: 1, owed: false, quest: false, cleared: false, duel: false, lives: 0, learned: m.learned, vigor: m.vigor, spared: false,
  world: false, hasDash: false
}
```

### A fight is on while the play screen is showing, the move list is closed and the level is not yet cleared

The fighter can act only while it is also alive.

```quint
pure def playing(m: Match): bool = m.screen == Play and not(m.paused) and not(m.cleared)

pure def fighting(m: Match): bool = playing(m) and m.alive
```

## Story: Stay alive

> As a player, I want my health to fall when I am hit or drop off the
> islands, and to come back after a knockout, so that mistakes cost me
> something but never end the game.

### Health is never below zero or above the fighter's own

```quint
pure def alwaysHealthIsInRange(m: Match): bool = 0 <= m.hp and m.hp <= full(m)
```

### A fighter is alive exactly while it has health left

```quint
pure def alwaysAliveMeansHealth(m: Match): bool = m.alive iff m.hp > 0
```

### Being hit costs health and gives 3 aura; a hit that takes the last health is a knockout

A heavy hit knocks a flying fighter out of the air. A knockout ends flight
and Overdrive. Aura is not gained during Overdrive, when it is already full.

```quint
pure val fullAura = 100000

pure def least(a: int, b: int): int = if (a < b) a else b

pure def canSuffer(m: Match, damage: int, heavy: bool): bool = fighting(m) and damage > 0

pure def suffer(m: Match, damage: int, heavy: bool): Match = {
  val gained = if (m.overdrive > 0) m.aura else least(fullAura, m.aura + 3000)
  if (m.hp > damage) { ...m, hp: m.hp - damage, aura: gained, held: 0, flying: m.flying and not(heavy) }
  else { ...m, hp: 0, alive: false, aura: gained, held: 0, flying: false, overdrive: 0 }
}
```

### Falling off the islands costs 25 health and ends flight

A fall that takes the last health is a knockout.

```quint
pure def canPlunge(m: Match): bool = fighting(m)

pure def plunge(m: Match): Match =
  if (m.hp > 25) { ...m, hp: m.hp - 25, flying: false, held: 0 }
  else { ...m, hp: 0, alive: false, flying: false, held: 0 }
```

### Only a knocked-out fighter revives, with full health and at least 40 aura

It comes back rested: full stamina and its dash ready. Coming back costs a life, and a fighter on its last life
does not come back. Against the waves there is one life and no coming back: only a fighter on a quest or in a
duel, with a life to spare, revives. In a hero's world lives are not spent: the fighter wakes at a shrine instead.

```quint
pure def canRevive(m: Match): bool = playing(m) and not(m.alive) and (m.quest or m.duel) and m.lives > 1 and not(m.world)

pure def revive(m: Match): Match =
  { ...m, alive: true, hp: full(m), aura: if (m.aura < 40000) 40000 else m.aura,
    stamina: 110000, dashes: 1, owed: false, lives: m.lives - 1 }
```

### A fighter out of lives on a quest can be let off once, and goes on with its last life

It comes back as a revived fighter does, rested and at full health, but no life is given back: the next knockout
is the end of the level. A level lets its fighter off only once. There is no bargain in a hero's world, where no
life is ever lost.

```quint
pure def canBargain(m: Match): bool = playing(m) and not(m.alive) and m.quest and m.lives == 1 and not(m.spared) and not(m.world)

pure def bargain(m: Match): Match =
  { ...m, alive: true, hp: full(m), aura: if (m.aura < 40000) 40000 else m.aura,
    stamina: 110000, dashes: 1, owed: false, spared: true }
```

### Only a fighter on a quest is ever let off

```quint
pure def alwaysOnlyAQuestSpares(m: Match): bool = m.spared implies (m.quest and m.lives == 1)
```

### A fighter that was let off can fall again

```quint
pure def sometimesSparedAndDown(m: Match): bool = m.spared and not(m.alive)
```

### Only a living fighter flies

```quint
pure def alwaysOnlyTheLivingFly(m: Match): bool = m.flying implies m.alive
```

### A fighter can be knocked out

```quint
pure val damageValues = Set(1, 9, 200)

pure def sometimesKnockedOut(m: Match): bool = m.screen == Play and not(m.alive)
```

## Story: Charge and spend aura

> As a player, I want to charge aura and spend it on blasts, specials and
> flight, and to break into Overdrive when I keep charging at full, so that I
> choose when to be dangerous.

### Aura is never below zero or above 100

```quint
pure def alwaysAuraIsInRange(m: Match): bool = 0 <= m.aura and m.aura <= fullAura
```

### Charging adds three quarters of a point of aura each step, up to full

Charging at full aura is held instead: fifty steps of holding start
Overdrive, which lasts 900 steps. Holding does nothing during Overdrive, or
for a fighter that has not learned Overdrive.
At most 900 steps are charged at once.

```quint
pure val stepsValues = Set(1, 50, 80, 900)

pure def canCharge(m: Match, steps: int): bool = fighting(m) and 0 < steps and steps <= 900

pure def charge(m: Match, steps: int): Match =
  if (m.aura < fullAura) { ...m, aura: least(fullAura, m.aura + 750 * steps), held: 0 }
  else if (m.overdrive > 0 or m.learned < 4) m
  else if (m.held + steps >= 50) { ...m, held: 0, overdrive: 900 }
  else { ...m, held: m.held + steps }
```

### Letting go of the charge forgets how long it was held

```quint
pure def canRelease(m: Match): bool = playing(m) and m.held > 0

pure def release(m: Match): Match = { ...m, held: 0 }
```

### A charge is held for less than fifty steps

```quint
pure def alwaysHoldIsShort(m: Match): bool = 0 <= m.held and m.held < 50
```

### During Overdrive aura stays full, and Overdrive never lasts more than 900 steps

```quint
pure def alwaysOverdriveIsFull(m: Match): bool =
  0 <= m.overdrive and m.overdrive <= 900 and (m.overdrive > 0 implies m.aura == fullAura)
```

### Overdrive runs down a step at a time and leaves 25 aura when it fades

```quint
pure def canFade(m: Match, steps: int): bool = fighting(m) and m.overdrive > 0 and 0 < steps and steps <= 900

pure def fade(m: Match, steps: int): Match =
  if (m.overdrive > steps) { ...m, overdrive: m.overdrive - steps }
  else { ...m, overdrive: 0, aura: 25000 }
```

### Every power is free during Overdrive, and otherwise needs its cost in aura

A blast costs Volt 4, Ember 10 and the others 8. A fighter has six specials. The
first three cost 50, 40 and 60 for every fighter; the last three, its greater
arts, cost 70, 80 and all 100. The fourth is learned with the first, the fifth
with the second and the sixth with the third.

```quint
pure def blastCostOf(f: int): int = if (f == 1) 10000 else if (f == 3) 4000 else 8000

pure def specialCost(slot: int): int =
  if (slot == 0) 50000 else if (slot == 1) 40000 else if (slot == 2) 60000
  else if (slot == 3) 70000 else if (slot == 4) 80000 else fullAura

pure def lesson(slot: int): int = if (slot < 3) slot else slot - 3

pure def affords(cost: int, m: Match): bool = m.overdrive > 0 or m.aura >= cost

pure def spent(cost: int, m: Match): int = if (m.overdrive > 0) m.aura else m.aura - cost

pure def canBlast(m: Match): bool = fighting(m) and affords(blastCostOf(m.fighter), m)

pure def blast(m: Match): Match = { ...m, aura: spent(blastCostOf(m.fighter), m), held: 0 }

pure def canSpecial(m: Match, slot: int): bool =
  fighting(m) and 0 <= slot and slot < 6 and lesson(slot) < m.learned and affords(specialCost(slot), m)

pure def special(m: Match, slot: int): Match = { ...m, aura: spent(specialCost(slot), m), held: 0 }
```

### A blast never costs more than a special

```quint
pure def lawABlastIsCheaperThanASpecial(f: int, slot: int): bool = blastCostOf(f) < specialCost(slot)
```

### Something used from the bag heals, up to full health

A fighter still standing can drink or eat what it carries for up to 100 health
at once. It never goes past its full health.

```quint
pure val amountValues = Set(-1, 0, 35, 100, 101)

pure def canHeal(m: Match, amount: int): bool = fighting(m) and 0 < amount and amount <= 100

pure def heal(m: Match, amount: int): Match = { ...m, hp: least(full(m), m.hp + amount) }
```

### Taking off needs 5 aura, or Overdrive

```quint
pure def canTakeOff(m: Match): bool = fighting(m) and not(m.flying) and m.learned >= 5 and affords(5000, m)

pure def takeOff(m: Match): Match = { ...m, flying: true }

pure def canTouchDown(m: Match): bool = fighting(m) and m.flying

pure def touchDown(m: Match): Match = { ...m, flying: false }
```

### Flight drains aura each step, and ends when the aura is gone

Each step costs Ember 0.13, Volt 0.07, Moss 0.035 and the others 0.09.
Flight is free during Overdrive.

```quint
pure def flyDrainOf(f: int): int = if (f == 1) 130 else if (f == 3) 70 else if (f == 4) 35 else 90

pure def canDrift(m: Match, steps: int): bool =
  fighting(m) and m.flying and m.overdrive == 0 and 0 < steps and steps <= 900

pure def drift(m: Match, steps: int): Match = {
  val cost = flyDrainOf(m.fighter) * steps
  if (m.aura > cost) { ...m, aura: m.aura - cost } else { ...m, aura: 0, flying: false }
}
```

### A clean hit on an enemy gives 3 aura, or 4.5 to Ink

Nothing is gained during Overdrive.

```quint
pure def hitGainOf(f: int): int = if (f == 0) 4500 else 3000

pure def canConnect(m: Match): bool = fighting(m)

pure def connect(m: Match): Match =
  if (m.overdrive > 0) m else { ...m, aura: least(fullAura, m.aura + hitGainOf(m.fighter)) }
```

### A fighter can reach Overdrive, and can fly

```quint
pure def sometimesInOverdrive(m: Match): bool = m.overdrive > 0

pure def sometimesFlying(m: Match): bool = m.flying
```

## Story: Fight the waves

> As a player, I want enemies to arrive in waves that grow, and my knockouts
> and combos to be counted, so that I can see how far I got.

### The next wave starts only when no enemy is left, and brings one more enemy than its number, eight at most

Waves belong to the arena. A level of a campaign has no waves.

Every wave after the first heals the fighter 30, up to its full health.

```quint
pure def canAdvance(m: Match): bool = fighting(m) and not(m.quest) and not(m.duel) and m.foes == 0 and m.waiting == 0

pure def advance(m: Match): Match = {
  ...m,
  wave: m.wave + 1,
  waiting: least(m.wave + 2, 8),
  hp: if (m.wave >= 1) least(full(m), m.hp + 30) else m.hp
}
```

### Enemies of a wave arrive one at a time

```quint
pure def canArrive(m: Match): bool = fighting(m) and m.waiting > 0

pure def arrive(m: Match): Match = { ...m, waiting: m.waiting - 1, foes: m.foes + 1 }
```

### Only an enemy in the arena can be knocked out, and each one counts

```quint
pure def canFell(m: Match): bool = playing(m) and m.foes > 0

pure def fell(m: Match): Match = { ...m, foes: m.foes - 1, kos: m.kos + 1 }
```

### Every hit on an enemy is counted, and hits that follow closely build a combo

A hit that does not follow closely starts a new combo of one. The best combo
is kept.

```quint
pure def canTally(m: Match, chained: bool): bool = playing(m)

pure def tally(m: Match, chained: bool): Match = {
  val streak = if (chained) m.combo + 1 else 1
  { ...m, hits: m.hits + 1, combo: streak, best: if (streak > m.best) streak else m.best }
}
```

### The counts of a fight make sense together

No more than eight enemies wait to arrive, enemies are only there once a
wave has started, and a combo is never longer than the best one or than the
hits landed.

```quint
pure def alwaysCountsMakeSense(m: Match): bool =
  0 <= m.wave and 0 <= m.waiting and m.waiting <= 8 and 0 <= m.foes and 0 <= m.kos
    and 0 <= m.combo and m.combo <= m.best and m.best <= m.hits
    and ((m.waiting > 0 or m.foes > 0) implies m.wave > 0)
```

### The score only goes up until a new fight or level starts

```quint
pure def stepScoreNeverDrops(before: Match, via: str, after: Match): bool =
  (via != "fight" and via != "embark" and via != "wander" and via != "duel" and via != "rematch" and via != "retry") implies (
    after.wave >= before.wave and after.kos >= before.kos and after.hits >= before.hits and after.best >= before.best
  )
```

### A fighter knocked out against the waves starts over from the first

One life: the fight begins again as if from the select screen, with the same fighter and nothing kept.

```quint
pure def canRetry(m: Match): bool = m.screen == Play and not(m.paused) and not(m.quest) and not(m.duel) and not(m.alive)

pure def retry(m: Match): Match = fight(m)
```

### An enemy can be knocked out

```quint
pure def sometimesAnEnemyFell(m: Match): bool = m.kos > 0
```

## Story: Learn the moves

> As a player, I want a move list I can open mid-fight that pauses the game
> and ticks off what I have found, so that I can learn a fighter's moves.

### The move list opens only during a fight and pauses it; closing it resumes

```quint
pure def canOpenMoves(m: Match): bool = playing(m)

pure def openMoves(m: Match): Match = { ...m, paused: true }

pure def canCloseMoves(m: Match): bool = m.paused

pure def closeMoves(m: Match): Match = { ...m, paused: false }
```

### From the open move list the player can go back to choose another fighter

```quint
pure def canChange(m: Match): bool = m.paused

pure def change(m: Match): Match = { ...m, screen: Select, paused: false, flying: false, quest: false, cleared: false, duel: false, lives: 0, spared: false, world: false }
```

### The game is paused only on the play screen

```quint
pure def alwaysPausedOnlyInPlay(m: Match): bool = m.paused implies m.screen == Play
```

### There are seventeen things to find, and each is found once

Ten combos, three specials, and the blast, flight, charge and Overdrive.

```quint
pure val moves = 17

pure def canDiscover(m: Match, move: int): bool =
  playing(m) and 0 <= move and move < moves and not(m.found.contains(move))

pure def discover(m: Match, move: int): Match = { ...m, found: m.found.union(Set(move)) }
```

### Everything found is one of the seventeen

```quint
pure def alwaysFoundAreMoves(m: Match): bool = m.found.forall(x => 0 <= x and x < moves)
```

### What was found stays found until a new fight or level starts

```quint
pure def stepFoundOnlyGrows(before: Match, via: str, after: Match): bool =
  (via != "fight" and via != "embark" and via != "wander" and via != "duel" and via != "rematch" and via != "retry") implies before.found.subseteq(after.found)
```

## Story: Dash and climb

> As a player, I want one dash each time I leave the ground and a grip on
> walls that tires, so that getting around is a choice between a fast, wild
> move and a slow, careful one.

### A fighter has one dash, and gets it back by touching the ground

Touching the ground also restores stamina and forgets a climb jump. In a hero's world the dash is used only once
it has been found there.

```quint
pure val fullStamina = 110000

pure def canDash(m: Match): bool = fighting(m) and m.dashes > 0 and (m.hasDash or not(m.world))

pure def dash(m: Match): Match = { ...m, dashes: 0, held: 0 }

pure def canRegain(m: Match): bool = fighting(m) and (m.dashes == 0 or m.stamina < fullStamina or m.owed)

pure def regain(m: Match): Match = { ...m, dashes: 1, stamina: fullStamina, owed: false }
```

### A fighter never has more than one dash

```quint
pure def alwaysOneDashAtMost(m: Match): bool = 0 <= m.dashes and m.dashes <= 1
```

### Stamina is never below zero or above 110

It is counted in thousandths, as aura is, and is never shown to the player.

```quint
pure def alwaysStaminaIsInRange(m: Match): bool = 0 <= m.stamina and m.stamina <= fullStamina
```

### Holding a wall costs a little stamina each step, and climbing up it costs more

Holding still costs 10 a second and climbing 45.45 a second: 0.167 and 0.758
a step. Only a fighter with stamina left can hold on.

```quint
pure def drained(cost: int, m: Match): int = if (m.stamina > cost) m.stamina - cost else 0

pure def canCling(m: Match, steps: int): bool = fighting(m) and m.stamina > 0 and 0 < steps and steps <= 900

pure def cling(m: Match, steps: int): Match = { ...m, stamina: drained(167 * steps, m), held: 0 }

pure def canClimb(m: Match, steps: int): bool = fighting(m) and m.stamina > 0 and 0 < steps and steps <= 900

pure def climb(m: Match, steps: int): Match = { ...m, stamina: drained(758 * steps, m), held: 0 }
```

### A jump straight up a wall costs 27.5 stamina, which is given back if the fighter pushes away at once

Pushing away turns the climb jump into a wall jump, which is free. The
refund is owed only until it is taken or the moment has passed.

```quint
pure val climbJumpCost = 27500

pure def canClimbJump(m: Match): bool = fighting(m) and m.stamina > 0

pure def climbJump(m: Match): Match = { ...m, stamina: drained(climbJumpCost, m), owed: true, held: 0 }

pure def canRefund(m: Match): bool = fighting(m) and m.owed

pure def refund(m: Match): Match = { ...m, stamina: least(fullStamina, m.stamina + climbJumpCost), owed: false }

pure def canForfeit(m: Match): bool = playing(m) and m.owed

pure def forfeit(m: Match): Match = { ...m, owed: false }
```

### A fighter can spend its dash, and can run out of stamina

```quint
pure def sometimesDashSpent(m: Match): bool = m.screen == Play and m.dashes == 0

pure def sometimesOutOfStamina(m: Match): bool = m.screen == Play and m.stamina == 0
```

## Story: Play a level of a campaign

> As a player, I want a chapter to be a place I cross from its start to its way out, with its enemies where the
> level puts them, so that the game is a journey and not only an arena.

### A level starts from the select screen like a fight, but as a quest with three lives

A quest counts as one wave, so that its enemies have something to belong to.

```quint
pure def canEmbark(m: Match): bool = m.screen == Select

pure def embark(m: Match): Match = { ...fight(m), quest: true, wave: 1, lives: 3 }
```

### A fighter has learned between none and five of its five things

```quint
pure def alwaysLearnedIsCounted(m: Match): bool =
  0 <= m.learned and m.learned <= 5
```

### A fighter can be in a fight without its specials

```quint
pure def sometimesNothingLearned(m: Match): bool = m.screen == Play and m.learned == 0
```

### A level brings its enemies where it places them, never more than eight waiting at once

```quint
pure val countValues = Set(0, 1, 3, 8, 9)

pure def canAmbush(m: Match, count: int): bool = fighting(m) and m.quest and 0 < count and m.waiting + count <= 8

pure def ambush(m: Match, count: int): Match = { ...m, waiting: m.waiting + count }
```

### Reaching the way out clears the level, once, and only for a living fighter on a quest

A cleared level is over: nothing more can happen in it.

A hero's world has no way out to reach: its areas lead into each other.

```quint
pure def canClear(m: Match): bool = fighting(m) and m.quest and not(m.world)

pure def clear(m: Match): Match = { ...m, cleared: true, flying: false, held: 0 }
```

### A cleared level is left for the select screen

```quint
pure def canLeave(m: Match): bool = m.cleared

pure def leave(m: Match): Match = { ...m, screen: Select, paused: false, cleared: false, quest: false, lives: 0, spared: false, world: false }
```

### A quest is always in its one wave

Discovered by the proof: without this, nothing said that a level's enemies arrive during a wave, and an ambush
could not be shown to keep the counts of a fight sensible.

```quint
pure def alwaysAQuestIsAWave(m: Match): bool = m.quest implies m.wave > 0
```

### Only a quest is ever cleared

```quint
pure def alwaysOnlyQuestsAreCleared(m: Match): bool = m.cleared implies (m.quest and m.screen == Play)
```

### A level can be cleared

```quint
pure def sometimesCleared(m: Match): bool = m.cleared
```

## Story: Explore a hero's world

> As a player, I want a hero's chapters to be one connected world that I cross and come back through, finding what
> lets me go further, so that the campaign is a place to explore and not a list of levels.

Where the fighter is in the world, which areas and rooms it has seen, and which shrine it last rested at are the
arena's to keep and the save's to remember. This spec owns what the fighter can do there.

### A hero's world starts from the select screen like a level, with the dash as the save remembers it

A world is a quest: its enemies arrive as its rooms bring them. It counts its three lives but never spends them.

```quint
pure val ownsValues = Set(false, true)

pure def canWander(m: Match, owns: bool): bool = m.screen == Select

pure def wander(m: Match, owns: bool): Match = { ...embark(m), world: true, hasDash: owns }
```

### Only a quest is a world

```quint
pure def alwaysAWorldIsAQuest(m: Match): bool = m.world implies (m.quest and m.screen == Play)
```

### The dash is found in the world once, and kept

```quint
pure def canTakeDash(m: Match): bool = fighting(m) and m.world and not(m.hasDash)

pure def takeDash(m: Match): Match = { ...m, hasDash: true }
```

### The dash is kept until the world is left

```quint
pure def stepTheDashIsKept(before: Match, via: str, after: Match): bool =
  (before.world and after.world and before.hasDash) implies after.hasDash
```

### In the world, a fighter that has not found the dash has never spent it

```quint
pure def alwaysNoDashBeforeFindingIt(m: Match): bool = (m.world and not(m.hasDash)) implies m.dashes == 1
```

### Resting at a shrine gives full health, full stamina and the dash back

```quint
pure def canRest(m: Match): bool = fighting(m) and m.world

pure def rest(m: Match): Match = { ...m, hp: full(m), stamina: fullStamina, dashes: 1, owed: false }
```

### A fighter knocked out in the world wakes at its last shrine, with full health and at least 40 aura

No life is spent and nothing found is lost: only where it stands changes, and that is the arena's.

```quint
pure def canWake(m: Match): bool = playing(m) and not(m.alive) and m.world

pure def wake(m: Match): Match =
  { ...m, alive: true, hp: full(m), aura: if (m.aura < 40000) 40000 else m.aura,
    stamina: fullStamina, dashes: 1, owed: false, flying: false, held: 0 }
```

### In the world lives are never spent

```quint
pure def alwaysTheWorldKeepsItsLives(m: Match): bool = m.world implies m.lives == 3
```

### A fighter can find the dash, and can wake at a shrine

```quint
pure def sometimesDashFound(m: Match): bool = m.world and m.hasDash and m.dashes == 0

pure def sometimesDownInTheWorld(m: Match): bool = m.world and not(m.alive)
```

## Story: Fight other players

> As a player, I want to fight other people in the arena, each of us with three lives, so that the last one
> standing has beaten someone who was trying to win.

### A duel starts from the select screen like a fight, with three lives and no waves

The other fighters are other players' own matches; this match knows only its own fighter's health and lives.

```quint
pure def canDuel(m: Match): bool = m.screen == Select

pure def duel(m: Match): Match = { ...fight(m), duel: true, lives: 3 }
```

### A duel can be fought again from the start, at any moment of it

When a round is over every player's match starts afresh, with the same fighter.

```quint
pure def canRematch(m: Match): bool = m.screen == Play and m.duel and not(m.paused)

pure def rematch(m: Match): Match = duel(m)
```

### Lives are counted only in a duel or on a quest, from three down to one

```quint
pure def alwaysLivesAreADuels(m: Match): bool =
  if (m.duel or m.quest) 1 <= m.lives and m.lives <= 3 and m.screen == Play else m.lives == 0
```

### A duel is neither a quest nor a fight of waves

```quint
pure def alwaysADuelHasNoWaves(m: Match): bool = m.duel implies (not(m.quest) and m.wave == 0)
```

### A fighter can lose its last life

```quint
pure def sometimesOutOfLives(m: Match): bool = (m.duel or m.quest) and not(m.alive) and m.lives == 1
```

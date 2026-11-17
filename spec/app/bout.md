# Bout

A versus match as the arena server referees it (`apps/app/src/arena/`). Every player's game still moves its own
fighter; what decides who wins is kept here, on the server, and nowhere else: each fighter's health, its lives, and
the knockouts it has scored. A blow, a fall or a return to the fight changes them only when these rules allow it,
so no player's game can take less damage than it was dealt, deal more than a blow can, or name its own winner.

Fighters are known by the number the server gave their connection. Health is whole points, as in the match
(spec/app/index.md).

## Story: Fight for the pot

> As a player of a paid match, I want the server, not the other players' games, to keep everyone's health and lives
> and to say who is left standing, so that the pot goes to whoever really won.

### A bout seats its fighters, each with its most health, its health, its lives and its knockouts

It starts empty, between rounds. What is kept of a fighter belongs to the round it was kept in: in a later round
the fighter stands at its most health, with three lives and no knockouts.

```quint
type Fighter = { most: int, hp: int, lives: int, kos: int, round: int }

type Bout = { seated: Set[int], fighters: int -> Fighter, fighting: bool, round: int }

pure val initial: Bout = { seated: Set(), fighters: Map(), fighting: false, round: 0 }

pure val livesEach = 3

pure val nobody: Fighter = { most: 1, hp: 0, lives: 0, kos: 0, round: -1 }

pure def keptOf(id: int, b: Bout): Fighter = if (b.fighters.keys().contains(id)) b.fighters.get(id) else nobody

pure def fresh(f: Fighter, round: int): Fighter = { most: f.most, hp: f.most, lives: livesEach, kos: 0, round: round }

pure def fighterOf(id: int, b: Bout): Fighter = if (keptOf(id, b).round == b.round) keptOf(id, b) else fresh(keptOf(id, b), b.round)

pure def standing(id: int, b: Bout): bool = b.seated.contains(id) and fighterOf(id, b).hp > 0
```

### A bout seats five at most

One for each of the five blades.

```quint
pure val seats = 5

pure def alwaysFiveAtMost(b: Bout): bool = b.seated.size() <= seats
```

### Health is never below none or above the fighter's most, and the most is between 1 and 400

```quint
pure def alwaysHealthIsInRange(b: Bout): bool =
  b.seated.forall(id => 1 <= fighterOf(id, b).most and fighterOf(id, b).most <= 400
    and 0 <= fighterOf(id, b).hp and fighterOf(id, b).hp <= fighterOf(id, b).most)
```

### Lives are never below none or above three, and a fighter with none left has no health

```quint
pure def alwaysLivesAreInRange(b: Bout): bool =
  b.seated.forall(id => 0 <= fighterOf(id, b).lives and fighterOf(id, b).lives <= livesEach
    and (fighterOf(id, b).lives == 0 implies fighterOf(id, b).hp == 0))
```

### What is kept of a seated fighter is from this round or an earlier one

Discovered by the proof: without it, a fighter kept for a round still to come could be read back at the start of
that round with whatever health it was kept with, instead of its most.

```quint
pure def alwaysKeptFromThisRoundOrBefore(b: Bout): bool = b.seated.forall(id => keptOf(id, b).round <= b.round)
```

### Knockouts are never below none

```quint
pure def alwaysKnockoutsAreCounted(b: Bout): bool = b.seated.forall(id => fighterOf(id, b).kos >= 0)
```

### A fighter sits down once, while there is a seat, with its most health

Between rounds it sits down with full health and three lives. During a round it sits down knocked out and with no
lives, to wait for the next round: nobody joins a fight halfway through it.

```quint
pure def canSit(b: Bout, id: int, most: int): bool =
  id >= 0 and not(b.seated.contains(id)) and b.seated.size() < seats and 1 <= most and most <= 400

pure def sit(b: Bout, id: int, most: int): Bout =
  { ...b, seated: b.seated.union(Set(id)),
    fighters: b.fighters.put(id, { most: most, hp: if (b.fighting) 0 else most, lives: if (b.fighting) 0 else livesEach, kos: 0, round: b.round }) }
```

### A fighter can leave at any moment

```quint
pure def canStand(b: Bout, id: int): bool = b.seated.contains(id)

pure def stand(b: Bout, id: int): Bout = { ...b, seated: b.seated.exclude(Set(id)) }
```

### A round is over when at most one fighter has lives left

The one left, if anyone is, has won it. A fighter who leaves is no longer counted, so a round between two is over
the moment one of them goes.

```quint
pure def alive(id: int, b: Bout): bool = b.seated.contains(id) and fighterOf(id, b).lives > 0

pure def over(b: Bout): bool =
  b.fighting and b.seated.forall(x => b.seated.forall(y => (alive(x, b) and alive(y, b)) implies x == y))

pure def sometimesWon(b: Bout): bool = over(b) and b.seated.exists(id => alive(id, b))
```

### A round begins between two or more, when no round is being fought, and gives everyone full health and three lives

Knockouts are counted afresh for every round.

```quint
pure def canBegin(b: Bout): bool = (not(b.fighting) or over(b)) and b.seated.size() >= 2

pure def begin(b: Bout): Bout = { ...b, fighting: true, round: b.round + 1 }
```

### A blow lands only between two different fighters who are both standing, in a round that is not over, and does from 1 to 60

No move in the game does more than 60 in one blow, however it is powered.

```quint
pure val mostBlow = 60

pure def canStrike(b: Bout, by: int, target: int, dmg: int): bool =
  b.fighting and not(over(b)) and by != target and standing(by, b) and standing(target, b) and 1 <= dmg and dmg <= mostBlow
```

### A blow that takes the last health knocks its fighter out: a life is lost, and the striker scores a knockout

```quint
pure def hurt(f: Fighter, dmg: int): Fighter = if (f.hp <= dmg) { ...f, hp: 0, lives: f.lives - 1 } else { ...f, hp: f.hp - dmg }

pure def strike(b: Bout, by: int, target: int, dmg: int): Bout =
  val struck = hurt(fighterOf(target, b), dmg)
  val scorer = fighterOf(by, b)
  { ...b, fighters: if (struck.hp == 0) b.fighters.put(target, struck).put(by, { ...scorer, kos: scorer.kos + 1 }) else b.fighters.put(target, struck) }

pure def sometimesDownWithLivesLeft(b: Bout): bool = b.fighting and b.seated.exists(id => fighterOf(id, b).hp == 0 and fighterOf(id, b).lives > 0)
```

### A fall off the islands costs a standing fighter 25 health, and may knock it out, with no knockout scored

```quint
pure val fallCost = 25

pure def canPlunge(b: Bout, id: int): bool = b.fighting and not(over(b)) and standing(id, b)

pure def plunge(b: Bout, id: int): Bout = { ...b, fighters: b.fighters.put(id, hurt(fighterOf(id, b), fallCost)) }
```

### A knocked-out fighter with lives left comes back with its most health

```quint
pure def canRise(b: Bout, id: int): bool =
  b.fighting and not(over(b)) and b.seated.contains(id) and fighterOf(id, b).hp == 0 and fighterOf(id, b).lives > 0

pure def rise(b: Bout, id: int): Bout = { ...b, fighters: b.fighters.put(id, { ...fighterOf(id, b), hp: fighterOf(id, b).most }) }
```

### Once a round is over, nothing changes how it ended until the next one begins

No blow, fall or return counts after the end, so the one left standing stays the winner.

```quint
pure def stepTheEndStands(before: Bout, via: str, after: Bout): bool =
  (over(before) and via != "begin") implies (after.fighting and after.round == before.round
    and after.seated.forall(id => before.seated.contains(id) implies fighterOf(id, after) == fighterOf(id, before)))
```

### Within a round a fighter's knockouts never go down

```quint
pure def stepKnockoutsOnlyGrow(before: Bout, via: str, after: Bout): bool =
  via != "begin" implies before.seated.forall(id => after.seated.contains(id) implies fighterOf(id, after).kos >= fighterOf(id, before).kos)
```

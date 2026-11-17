# Saga

The campaign of The Five Blades, as the application in `apps/app` keeps it between sessions: how far each of the
five protagonists has come, what each of them has learned, and the state of the world of Vareth.

Three things are kept apart on purpose. What happened is the canon, in the game's story data. What a protagonist
knows is recorded here, protagonist by protagonist. What the player knows is everything any protagonist has
learned. A protagonist never speaks from the player's knowledge.

Protagonists are numbered in the recommended order of play: 0 the Forbidden, 1 the Ember, 2 the Exile, 3 the
Hollow, 4 the Architect.

## Story: Play five campaigns

> As a player, I want each protagonist's campaign to advance a chapter at a time and to be remembered, so that I
> can leave one story and pick up another without losing either.

### A saga holds five campaigns, the five measures of the world, and what has been learned

It starts with no chapter finished and nothing learned. The world starts as the Dying Century has left it: the
Crown and the Church strong, the Unbound weak, the Great Binding half spent, the Firstborn barely stirring.

```quint
type Saga = {
  forbidden: int,
  ember: int,
  exile: int,
  hollow: int,
  architect: int,
  crown: int,
  church: int,
  unbound: int,
  stability: int,
  awakening: int,
  known: Set[int]
}

pure val initial: Saga = {
  forbidden: 0, ember: 0, exile: 0, hollow: 0, architect: 0,
  crown: 60, church: 55, unbound: 25, stability: 50, awakening: 10, known: Set()
}
```

### There are five protagonists, and each campaign has ten chapters

```quint
pure val protagonists = 5

pure val chaptersEach = 10

pure def chaptersDone(who: int, s: Saga): int =
  if (who == 0) s.forbidden else if (who == 1) s.ember else if (who == 2) s.exile else if (who == 3) s.hollow else s.architect
```

### A chapter can be finished only by one of the five, and only while that campaign has chapters left

Chapters are finished in order, one at a time.

```quint
pure def canFinish(s: Saga, who: int): bool =
  0 <= who and who < protagonists and chaptersDone(who, s) < chaptersEach

pure def finish(s: Saga, who: int): Saga =
  if (who == 0) { ...s, forbidden: s.forbidden + 1 }
  else if (who == 1) { ...s, ember: s.ember + 1 }
  else if (who == 2) { ...s, exile: s.exile + 1 }
  else if (who == 3) { ...s, hollow: s.hollow + 1 }
  else { ...s, architect: s.architect + 1 }
```

### No campaign is ever before its first chapter or past its tenth

```quint
pure def inCampaign(n: int): bool = 0 <= n and n <= chaptersEach

pure def alwaysCampaignsAreInRange(s: Saga): bool =
  inCampaign(s.forbidden) and inCampaign(s.ember) and inCampaign(s.exile) and inCampaign(s.hollow) and inCampaign(s.architect)
```

### A campaign never goes back a chapter, except when the whole saga is begun again

```quint
pure def stepCampaignsNeverGoBack(before: Saga, via: str, after: Saga): bool =
  via != "beginAgain" implies (
    after.forbidden >= before.forbidden and after.ember >= before.ember and after.exile >= before.exile
      and after.hollow >= before.hollow and after.architect >= before.architect
  )
```

### Two chapters of one campaign can be finished

```quint
pure val whoValues = Set(-1, 0, 1, 4, 5)

pure def sometimesTwoChaptersIn(s: Saga): bool = s.forbidden >= 2
```

## Story: Learn the truth five ways

> As a player, I want each protagonist to know only what that protagonist has found out, so that the same event
> can mean one thing in one campaign and another thing in the next.

### There are forty things to learn, and a protagonist learns each of them once

What is learned is kept as the protagonist together with the fact: a hundred for each protagonist, plus the
number of the fact.

```quint
pure val facts = 40

pure def code(who: int, fact: int): int = who * 100 + fact

pure def knows(who: int, fact: int, s: Saga): bool = s.known.contains(code(who, fact))

pure def canLearn(s: Saga, who: int, fact: int): bool =
  0 <= who and who < protagonists and 0 <= fact and fact < facts and not(knows(who, fact, s))

pure def learn(s: Saga, who: int, fact: int): Saga = { ...s, known: s.known.union(Set(code(who, fact))) }
```

### The player knows a fact once any protagonist has learned it

```quint
pure def playerKnows(fact: int, s: Saga): bool =
  knows(0, fact, s) or knows(1, fact, s) or knows(2, fact, s) or knows(3, fact, s) or knows(4, fact, s)
```

### Everything known is one of the forty facts, known by one of the five

```quint
pure def alwaysKnowledgeIsReal(s: Saga): bool =
  s.known.forall(k => 0 <= k and k < protagonists * 100 and k % 100 < facts)
```

### What has been learned is never forgotten, except when the whole saga is begun again

```quint
pure def stepKnowledgeOnlyGrows(before: Saga, via: str, after: Saga): bool =
  via != "beginAgain" implies before.known.subseteq(after.known)
```

## Story: Change the world

> As a player, I want what I do in a chapter to move the balance of Vareth, so that later chapters meet a world I
> helped make.

### The world has five measures, each from 0 to 100

Crown influence, Church influence, Unbound influence, magical stability, and the awakening of the Firstborn.

```quint
pure def measured(n: int): bool = 0 <= n and n <= 100

pure def alwaysMeasuresAreInRange(s: Saga): bool =
  measured(s.crown) and measured(s.church) and measured(s.unbound) and measured(s.stability) and measured(s.awakening)
```

### One act moves one measure by at most twenty, and never past its ends

Measures are numbered 0 Crown, 1 Church, 2 Unbound, 3 stability, 4 awakening.

```quint
pure val measureValues = Set(-1, 0, 3, 4, 5)

pure val amountValues = Set(-20, -5, 0, 15, 21)

pure def nudged(n: int, amount: int): int = if (n + amount < 0) 0 else if (n + amount > 100) 100 else n + amount

pure def canShift(s: Saga, measure: int, amount: int): bool =
  0 <= measure and measure < 5 and amount != 0 and -20 <= amount and amount <= 20

pure def shift(s: Saga, measure: int, amount: int): Saga =
  if (measure == 0) { ...s, crown: nudged(s.crown, amount) }
  else if (measure == 1) { ...s, church: nudged(s.church, amount) }
  else if (measure == 2) { ...s, unbound: nudged(s.unbound, amount) }
  else if (measure == 3) { ...s, stability: nudged(s.stability, amount) }
  else { ...s, awakening: nudged(s.awakening, amount) }
```

### The Great Binding can be spent entirely

```quint
pure def sometimesTheBindingFails(s: Saga): bool = s.stability == 0
```

## Story: Begin again

> As a player, I want to be able to wipe the saga and start over, so that I can make other choices.

### A saga in which anything has happened can be begun again

```quint
pure def untouched(s: Saga): bool =
  s.forbidden == 0 and s.ember == 0 and s.exile == 0 and s.hollow == 0 and s.architect == 0
    and s.crown == 60 and s.church == 55 and s.unbound == 25 and s.stability == 50 and s.awakening == 10
    and s.known.size() == 0

pure def canBeginAgain(s: Saga): bool = not(untouched(s))

pure def beginAgain(s: Saga): Saga = initial
```

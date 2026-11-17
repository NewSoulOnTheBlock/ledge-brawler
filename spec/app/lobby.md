# Lobby

How the arena server (`apps/app/src/arena/`) seats players who press Versus or Play together without a code of
their own: it finds them a table of that kind with a free seat, and opens a new one only when there is none. A
table is a room of the game: a duel's (spec/app/bout.md) or a co-op group's. A table opened from an invitation is
private, and only its code brings anyone to it.

Players and tables are known by the numbers the server gave them.

## Story: Find a match

> As a player, I want to press Versus or Play together and be put with other players who are waiting, so that I do
> not have to find people and send them a link before I can play.

### A lobby holds its tables, the kind of each, who sits at each, which are open to matchmaking, and everyone seated

It starts with no tables. Table numbers are never given twice.

```quint
type Kind = Duel | Group

type Lobby = { tables: Set[int], kindOf: int -> Kind, seatsOf: int -> Set[int], listed: Set[int], open: Set[int], seated: Set[int], next: int }

pure val initial: Lobby = { tables: Set(), kindOf: Map(), seatsOf: Map(), listed: Set(), open: Set(), seated: Set(), next: 0 }

pure def seatsAt(t: int, l: Lobby): Set[int] = if (l.seatsOf.keys().contains(t)) l.seatsOf.get(t) else Set()

pure def kindAt(t: int, l: Lobby): Kind = if (l.kindOf.keys().contains(t)) l.kindOf.get(t) else Duel

pure val seats = 5

pure def hasRoom(t: int, l: Lobby): bool = seatsAt(t, l).size() < seats
```

### Every table seats from one to five, and is numbered below the next number to be given

A table left empty is put away.

```quint
pure def alwaysTablesSeatOneToFive(l: Lobby): bool =
  l.tables.forall(t => 0 <= t and t < l.next and seatsAt(t, l).size() >= 1 and seatsAt(t, l).size() <= seats)
```

### Table numbers are never below zero

Discovered by the proof: without it, a lobby whose next number had somehow fallen below zero would open a table
numbered below zero.

```quint
pure def alwaysNumbersAreNotNegative(l: Lobby): bool = l.next >= 0
```

### Every player at a table is seated, and no player sits at two tables

```quint
pure def alwaysOneTableEach(l: Lobby): bool =
  l.tables.forall(t => seatsAt(t, l).subseteq(l.seated)
    and l.tables.forall(u => t != u implies seatsAt(t, l).intersect(seatsAt(u, l)).size() == 0))
```

### Everyone seated sits at a table

```quint
pure def alwaysSeatedAtATable(l: Lobby): bool = l.seated.forall(p => l.tables.exists(t => seatsAt(t, l).contains(p)))
```

### Only a table opened by matchmaking is ever open to it

```quint
pure def alwaysOnlyListedTablesAreOpen(l: Lobby): bool = l.open.subseteq(l.listed) and l.listed.subseteq(l.tables)
```

### A player looking for a match sits at an open table of that kind with a free seat, or, only when there is none, opens a new one

The server chooses among the open tables with a free seat; the rules only refuse a new table while one of them has
room.

```quint
pure def roomFor(kind: Kind, l: Lobby): bool = l.open.exists(t => kindAt(t, l) == kind and hasRoom(t, l))

pure def canSeek(l: Lobby, by: int, kind: Kind, table: int): bool =
  by >= 0 and not(l.seated.contains(by)) and
    ((l.open.contains(table) and kindAt(table, l) == kind and hasRoom(table, l)) or (table == l.next and not(roomFor(kind, l))))

pure def seek(l: Lobby, by: int, kind: Kind, table: int): Lobby =
  if (table == l.next)
    { ...l, tables: l.tables.union(Set(table)), kindOf: l.kindOf.put(table, kind), seatsOf: l.seatsOf.put(table, Set(by)),
      listed: l.listed.union(Set(table)), open: l.open.union(Set(table)), seated: l.seated.union(Set(by)), next: l.next + 1 }
  else { ...l, seatsOf: l.seatsOf.put(table, seatsAt(table, l).union(Set(by))), seated: l.seated.union(Set(by)) }

pure def sometimesTwoAtATable(l: Lobby): bool = l.tables.exists(t => seatsAt(t, l).size() >= 2)
```

### A player with an invitation opens a private table, or sits at the table it names while it has a free seat

A private table is never open to matchmaking.

```quint
pure def canHost(l: Lobby, by: int, kind: Kind): bool = by >= 0 and not(l.seated.contains(by))

pure def host(l: Lobby, by: int, kind: Kind): Lobby =
  { ...l, tables: l.tables.union(Set(l.next)), kindOf: l.kindOf.put(l.next, kind), seatsOf: l.seatsOf.put(l.next, Set(by)),
    seated: l.seated.union(Set(by)), next: l.next + 1 }

pure def canInvite(l: Lobby, by: int, table: int): bool =
  by >= 0 and not(l.seated.contains(by)) and l.tables.contains(table) and hasRoom(table, l)

pure def invite(l: Lobby, by: int, table: int): Lobby =
  { ...l, seatsOf: l.seatsOf.put(table, seatsAt(table, l).union(Set(by))), seated: l.seated.union(Set(by)) }
```

### A player leaves its table at any moment, and a table left empty is put away

```quint
pure def canLeave(l: Lobby, by: int, table: int): bool = l.tables.contains(table) and seatsAt(table, l).contains(by)

pure def leave(l: Lobby, by: int, table: int): Lobby =
  val rest = seatsAt(table, l).exclude(Set(by))
  if (rest.size() == 0)
    { ...l, tables: l.tables.exclude(Set(table)), seatsOf: l.seatsOf.put(table, Set()), listed: l.listed.exclude(Set(table)),
      open: l.open.exclude(Set(table)), seated: l.seated.exclude(Set(by)) }
  else { ...l, seatsOf: l.seatsOf.put(table, rest), seated: l.seated.exclude(Set(by)) }
```

### A table stops taking players from matchmaking while it plays, and takes them again once it is done

```quint
pure def canClose(l: Lobby, table: int): bool = l.open.contains(table)

pure def close(l: Lobby, table: int): Lobby = { ...l, open: l.open.exclude(Set(table)) }

pure def canReopen(l: Lobby, table: int): bool = l.listed.contains(table) and not(l.open.contains(table))

pure def reopen(l: Lobby, table: int): Lobby = { ...l, open: l.open.union(Set(table)) }

pure def sometimesAFullTable(l: Lobby): bool = l.tables.exists(t => seatsAt(t, l).size() == seats)
```

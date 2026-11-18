// spec/app/lobby.md, "Every player at a table is seated, and no player sits at two tables"
// The rules as they read with the filter the library reasons about in place of the standard one.
lemma OneTableEachFilter(l: Lobby)
  ensures alwaysOneTableEach(l) == !((exists t :: t in l.tables && !((!((exists set_x :: set_x in seatsAt(t, l) && !((set_x in l.seated)))) && !((exists u :: u in l.tables && !((!((t != u)) || (|ProofLib.Filter((set_x: int) => (set_x in seatsAt(u, l)), seatsAt(t, l))| == 0)))))))))
{
}

// Two tables share nobody exactly when nobody at the one sits at the other.
lemma Apart(t: seq<int>, u: seq<int>)
  ensures |ProofLib.Filter((set_x: int) => (set_x in u), t)| == 0 <==> (forall x :: x in t ==> !(x in u))
{
  ProofLib.FilterNone((set_x: int) => (set_x in u), t);
  if forall x :: x in t ==> !(x in u) {
    forall i | 0 <= i < |t|
      ensures !(t[i] in u)
    {
      assert t[i] in t;
    }
  }
  if forall i :: 0 <= i < |t| ==> !(t[i] in u) {
    forall x | x in t
      ensures !(x in u)
    {
      var i :| 0 <= i < |t| && t[i] == x;
    }
  }
}

// What is in s with y added.
lemma AddOne(s: seq<int>, y: int, x: int)
  ensures x in s + ProofLib.Filter((set_x: int) => !((set_x in s)), [y]) <==> (x in s || x == y)
{
  ProofLib.FilterMember((set_x: int) => !((set_x in s)), [y], x);
}

// Adding one adds at most one.
lemma AddOneLength(s: seq<int>, y: int)
  ensures |s| <= |s + ProofLib.Filter((set_x: int) => !((set_x in s)), [y])| <= |s| + 1
{
  ProofLib.FilterCons((set_x: int) => !((set_x in s)), [y]);
  ProofLib.FilterNil((set_x: int) => !((set_x in s)), [y][1..]);
}

// What is in s with y taken out.
lemma DropOne(s: seq<int>, y: int, x: int)
  ensures x in ProofLib.Filter((set_x: int) => !((set_x in [y])), s) <==> (x in s && x != y)
{
  ProofLib.FilterMember((set_x: int) => !((set_x in [y])), s, x);
}

// A filter is never longer than its list.
lemma NoLonger(p: int -> bool, xs: seq<int>)
  ensures |ProofLib.Filter(p, xs)| <= |xs|
  decreases |xs|
{
  if |xs| == 0 {
    ProofLib.FilterNil(p, xs);
  } else {
    ProofLib.FilterCons(p, xs);
    NoLonger(p, xs[1..]);
  }
}

// spec/app/lobby.md, "A player looking for a match sits at an open table of that kind with a free seat, or, only when there is none, opens a new one"
// The lobby after a seek, with the filter the library reasons about in place of the standard one.
lemma SeekFields(l: Lobby, by_: int, kind: Kind, table: int)
  ensures table == l.next ==> seek(l, by_, kind, table) == l.(tables := (l.tables + ProofLib.Filter((set_x: int) => !((set_x in l.tables)), [table])), kindOf := l.kindOf[table := kind], seatsOf := l.seatsOf[table := [by_]], listed := (l.listed + ProofLib.Filter((set_x: int) => !((set_x in l.listed)), [table])), open := (l.open + ProofLib.Filter((set_x: int) => !((set_x in l.open)), [table])), seated := (l.seated + ProofLib.Filter((set_x: int) => !((set_x in l.seated)), [by_])), next := (l.next + 1))
  ensures table != l.next ==> seek(l, by_, kind, table) == l.(seatsOf := l.seatsOf[table := (seatsAt(table, l) + ProofLib.Filter((set_x: int) => !((set_x in seatsAt(table, l))), [by_]))], seated := (l.seated + ProofLib.Filter((set_x: int) => !((set_x in l.seated)), [by_])))
{
}

// A new table, seating only the one who opened it, alongside tables that are as they were.
lemma Opened(l: Lobby, a: Lobby, by_: int, table: int)
  requires inv(l) && table == l.next && !(by_ in l.seated) && by_ >= 0
  requires forall t :: t in a.tables <==> (t in l.tables || t == table)
  requires forall p :: p in a.seated <==> (p in l.seated || p == by_)
  requires forall t :: t != table ==> seatsAt(t, a) == seatsAt(t, l)
  requires seatsAt(table, a) == [by_] && a.next == l.next + 1
  ensures alwaysTablesSeatOneToFive(a) && alwaysNumbersAreNotNegative(a) && alwaysOneTableEach(a) && alwaysSeatedAtATable(a)
{
  OneTableEachFilter(l);
  OneTableEachFilter(a);
  assert !(table in l.tables);
  forall t | t in a.tables
    ensures forall x :: x in seatsAt(t, a) ==> x in a.seated
  {
  }
  forall t, u | t in a.tables && u in a.tables && t != u
    ensures |ProofLib.Filter((set_x: int) => (set_x in seatsAt(u, a)), seatsAt(t, a))| == 0
  {
    Apart(seatsAt(t, a), seatsAt(u, a));
    if t != table && u != table {
      Apart(seatsAt(t, l), seatsAt(u, l));
    } else if t == table {
      assert forall x :: x in seatsAt(u, l) ==> x in l.seated;
    } else {
      assert forall x :: x in seatsAt(t, l) ==> x in l.seated;
    }
  }
  forall p | p in a.seated
    ensures exists t :: t in a.tables && p in seatsAt(t, a)
  {
    if p == by_ {
      assert table in a.tables && p in seatsAt(table, a);
    } else {
      var t :| t in l.tables && p in seatsAt(t, l);
      assert t in a.tables && p in seatsAt(t, a);
    }
  }
}

// One more at a table that had a free seat; every other table as it was.
lemma Joined(l: Lobby, a: Lobby, by_: int, table: int)
  requires inv(l) && table in l.tables && hasRoom(table, l) && !(by_ in l.seated)
  requires a.tables == l.tables && a.next == l.next
  requires forall p :: p in a.seated <==> (p in l.seated || p == by_)
  requires forall t :: t != table ==> seatsAt(t, a) == seatsAt(t, l)
  requires forall x :: x in seatsAt(table, a) <==> (x in seatsAt(table, l) || x == by_)
  requires |seatsAt(table, l)| <= |seatsAt(table, a)| <= |seatsAt(table, l)| + 1
  ensures alwaysTablesSeatOneToFive(a) && alwaysNumbersAreNotNegative(a) && alwaysOneTableEach(a) && alwaysSeatedAtATable(a)
{
  OneTableEachFilter(l);
  OneTableEachFilter(a);
  forall t, u | t in a.tables && u in a.tables && t != u
    ensures |ProofLib.Filter((set_x: int) => (set_x in seatsAt(u, a)), seatsAt(t, a))| == 0
  {
    Apart(seatsAt(t, a), seatsAt(u, a));
    Apart(seatsAt(t, l), seatsAt(u, l));
    assert forall x :: x in seatsAt(u, l) ==> x in l.seated;
    assert forall x :: x in seatsAt(t, l) ==> x in l.seated;
  }
  forall p | p in a.seated
    ensures exists t :: t in a.tables && p in seatsAt(t, a)
  {
    if p == by_ {
      assert table in a.tables && p in seatsAt(table, a);
    } else {
      var t :| t in l.tables && p in seatsAt(t, l);
      assert t in a.tables && p in seatsAt(t, a);
    }
  }
}

lemma seek_ensures(l: Lobby, by_: int, kind: Kind, table: int)
  ensures (inv(l) ==> canSeek(l, by_, kind, table) ==> alwaysTablesSeatOneToFive(seek(l, by_, kind, table)))
  ensures (inv(l) ==> canSeek(l, by_, kind, table) ==> alwaysNumbersAreNotNegative(seek(l, by_, kind, table)))
  ensures (inv(l) ==> canSeek(l, by_, kind, table) ==> alwaysOneTableEach(seek(l, by_, kind, table)))
  ensures (inv(l) ==> canSeek(l, by_, kind, table) ==> alwaysSeatedAtATable(seek(l, by_, kind, table)))
  ensures (inv(l) ==> canSeek(l, by_, kind, table) ==> alwaysOnlyListedTablesAreOpen(seek(l, by_, kind, table)))
{
  if inv(l) && canSeek(l, by_, kind, table) {
    var a := seek(l, by_, kind, table);
    SeekFields(l, by_, kind, table);
    forall p
      ensures p in a.seated <==> (p in l.seated || p == by_)
    {
      AddOne(l.seated, by_, p);
    }
    if table == l.next {
      forall t
        ensures t in a.tables <==> (t in l.tables || t == table)
      {
        AddOne(l.tables, table, t);
      }
      forall t
        ensures (t in a.listed <==> (t in l.listed || t == table)) && (t in a.open <==> (t in l.open || t == table))
      {
        AddOne(l.listed, table, t);
        AddOne(l.open, table, t);
      }
      Opened(l, a, by_, table);
    } else {
      forall x
        ensures x in seatsAt(table, a) <==> (x in seatsAt(table, l) || x == by_)
      {
        AddOne(seatsAt(table, l), by_, x);
      }
      AddOneLength(seatsAt(table, l), by_);
      Joined(l, a, by_, table);
    }
  }
}

// spec/app/lobby.md, "A player with an invitation opens a private table, or sits at the table it names while it has a free seat"
// The lobby after hosting or an invitation, with the filter the library reasons about in place of the standard one.
lemma HostFields(l: Lobby, by_: int, kind: Kind)
  ensures host(l, by_, kind) == l.(tables := (l.tables + ProofLib.Filter((set_x: int) => !((set_x in l.tables)), [l.next])), kindOf := l.kindOf[l.next := kind], seatsOf := l.seatsOf[l.next := [by_]], seated := (l.seated + ProofLib.Filter((set_x: int) => !((set_x in l.seated)), [by_])), next := (l.next + 1))
{
}

lemma InviteFields(l: Lobby, by_: int, table: int)
  ensures invite(l, by_, table) == l.(seatsOf := l.seatsOf[table := (seatsAt(table, l) + ProofLib.Filter((set_x: int) => !((set_x in seatsAt(table, l))), [by_]))], seated := (l.seated + ProofLib.Filter((set_x: int) => !((set_x in l.seated)), [by_])))
{
}

lemma host_ensures(l: Lobby, by_: int, kind: Kind)
  ensures (inv(l) ==> canHost(l, by_, kind) ==> alwaysTablesSeatOneToFive(host(l, by_, kind)))
  ensures (inv(l) ==> canHost(l, by_, kind) ==> alwaysNumbersAreNotNegative(host(l, by_, kind)))
  ensures (inv(l) ==> canHost(l, by_, kind) ==> alwaysOneTableEach(host(l, by_, kind)))
  ensures (inv(l) ==> canHost(l, by_, kind) ==> alwaysSeatedAtATable(host(l, by_, kind)))
  ensures (inv(l) ==> canHost(l, by_, kind) ==> alwaysOnlyListedTablesAreOpen(host(l, by_, kind)))
{
  if inv(l) && canHost(l, by_, kind) {
    var a := host(l, by_, kind);
    HostFields(l, by_, kind);
    forall p
      ensures p in a.seated <==> (p in l.seated || p == by_)
    {
      AddOne(l.seated, by_, p);
    }
    forall t
      ensures t in a.tables <==> (t in l.tables || t == l.next)
    {
      AddOne(l.tables, l.next, t);
    }
    Opened(l, a, by_, l.next);
  }
}

lemma invite_ensures(l: Lobby, by_: int, table: int)
  ensures (inv(l) ==> canInvite(l, by_, table) ==> alwaysTablesSeatOneToFive(invite(l, by_, table)))
  ensures (inv(l) ==> canInvite(l, by_, table) ==> alwaysNumbersAreNotNegative(invite(l, by_, table)))
  ensures (inv(l) ==> canInvite(l, by_, table) ==> alwaysOneTableEach(invite(l, by_, table)))
  ensures (inv(l) ==> canInvite(l, by_, table) ==> alwaysSeatedAtATable(invite(l, by_, table)))
  ensures (inv(l) ==> canInvite(l, by_, table) ==> alwaysOnlyListedTablesAreOpen(invite(l, by_, table)))
{
  if inv(l) && canInvite(l, by_, table) {
    var a := invite(l, by_, table);
    InviteFields(l, by_, table);
    forall p
      ensures p in a.seated <==> (p in l.seated || p == by_)
    {
      AddOne(l.seated, by_, p);
    }
    forall x
      ensures x in seatsAt(table, a) <==> (x in seatsAt(table, l) || x == by_)
    {
      AddOne(seatsAt(table, l), by_, x);
    }
    AddOneLength(seatsAt(table, l), by_);
    Joined(l, a, by_, table);
  }
}

// spec/app/lobby.md, "A player leaves its table at any moment, and a table left empty is put away"
// The lobby after one leaves, with the filter the library reasons about in place of the standard one.
lemma LeaveFields(l: Lobby, by_: int, table: int)
  ensures |ProofLib.Filter((set_x: int) => !((set_x in [by_])), seatsAt(table, l))| == 0 ==> leave(l, by_, table) == l.(tables := ProofLib.Filter((set_x: int) => !((set_x in [table])), l.tables), seatsOf := l.seatsOf[table := []], listed := ProofLib.Filter((set_x: int) => !((set_x in [table])), l.listed), open := ProofLib.Filter((set_x: int) => !((set_x in [table])), l.open), seated := ProofLib.Filter((set_x: int) => !((set_x in [by_])), l.seated))
  ensures |ProofLib.Filter((set_x: int) => !((set_x in [by_])), seatsAt(table, l))| != 0 ==> leave(l, by_, table) == l.(seatsOf := l.seatsOf[table := ProofLib.Filter((set_x: int) => !((set_x in [by_])), seatsAt(table, l))], seated := ProofLib.Filter((set_x: int) => !((set_x in [by_])), l.seated))
{
}

lemma leave_ensures(l: Lobby, by_: int, table: int)
  ensures (inv(l) ==> canLeave(l, by_, table) ==> alwaysTablesSeatOneToFive(leave(l, by_, table)))
  ensures (inv(l) ==> canLeave(l, by_, table) ==> alwaysNumbersAreNotNegative(leave(l, by_, table)))
  ensures (inv(l) ==> canLeave(l, by_, table) ==> alwaysOneTableEach(leave(l, by_, table)))
  ensures (inv(l) ==> canLeave(l, by_, table) ==> alwaysSeatedAtATable(leave(l, by_, table)))
  ensures (inv(l) ==> canLeave(l, by_, table) ==> alwaysOnlyListedTablesAreOpen(leave(l, by_, table)))
{
  if inv(l) && canLeave(l, by_, table) {
    var a := leave(l, by_, table);
    var rest := ProofLib.Filter((set_x: int) => !((set_x in [by_])), seatsAt(table, l));
    LeaveFields(l, by_, table);
    OneTableEachFilter(l);
    OneTableEachFilter(a);
    forall p
      ensures p in a.seated <==> (p in l.seated && p != by_)
    {
      DropOne(l.seated, by_, p);
    }
    forall x
      ensures x in rest <==> (x in seatsAt(table, l) && x != by_)
    {
      DropOne(seatsAt(table, l), by_, x);
    }
    NoLonger((set_x: int) => !((set_x in [by_])), seatsAt(table, l));
    // Whoever leaves sat at this table only.
    forall t | t in l.tables && t != table
      ensures !(by_ in seatsAt(t, l))
    {
      Apart(seatsAt(table, l), seatsAt(t, l));
    }
    if |rest| == 0 {
      forall t
        ensures t in a.tables <==> (t in l.tables && t != table)
      {
        DropOne(l.tables, table, t);
      }
      forall t
        ensures (t in a.listed <==> (t in l.listed && t != table)) && (t in a.open <==> (t in l.open && t != table))
      {
        DropOne(l.listed, table, t);
        DropOne(l.open, table, t);
      }
      forall t | t in a.tables
        ensures seatsAt(t, a) == seatsAt(t, l)
      {
      }
      forall t, u | t in a.tables && u in a.tables && t != u
        ensures |ProofLib.Filter((set_x: int) => (set_x in seatsAt(u, a)), seatsAt(t, a))| == 0
      {
      }
      forall p | p in a.seated
        ensures exists t :: t in a.tables && p in seatsAt(t, a)
      {
        var t :| t in l.tables && p in seatsAt(t, l);
        assert t != table;
        assert t in a.tables && p in seatsAt(t, a);
      }
    } else {
      assert seatsAt(table, a) == rest;
      forall t | t != table
        ensures seatsAt(t, a) == seatsAt(t, l)
      {
      }
      forall t, u | t in a.tables && u in a.tables && t != u
        ensures |ProofLib.Filter((set_x: int) => (set_x in seatsAt(u, a)), seatsAt(t, a))| == 0
      {
        Apart(seatsAt(t, a), seatsAt(u, a));
        Apart(seatsAt(t, l), seatsAt(u, l));
      }
      forall p | p in a.seated
        ensures exists t :: t in a.tables && p in seatsAt(t, a)
      {
        var t :| t in l.tables && p in seatsAt(t, l);
        assert t in a.tables && p in seatsAt(t, a);
      }
    }
  }
}

// spec/app/lobby.md, "A table stops taking players from matchmaking while it plays, and takes them again once it is done"
// What is open after a table is closed, with the filter the library reasons about in place of the standard one.
lemma CloseOpen(l: Lobby, table: int)
  ensures close(l, table).open == ProofLib.Filter((set_x: int) => !((set_x in [table])), l.open)
{
}

lemma close_ensures(l: Lobby, table: int)
  ensures (inv(l) ==> canClose(l, table) ==> alwaysTablesSeatOneToFive(close(l, table)))
  ensures (inv(l) ==> canClose(l, table) ==> alwaysNumbersAreNotNegative(close(l, table)))
  ensures (inv(l) ==> canClose(l, table) ==> alwaysOneTableEach(close(l, table)))
  ensures (inv(l) ==> canClose(l, table) ==> alwaysSeatedAtATable(close(l, table)))
  ensures (inv(l) ==> canClose(l, table) ==> alwaysOnlyListedTablesAreOpen(close(l, table)))
{
  if inv(l) && canClose(l, table) {
    CloseOpen(l, table);
    forall t | t in close(l, table).open
      ensures t in l.open
    {
      DropOne(l.open, table, t);
    }
  }
}

// What is open after a table is reopened, with the filter the library reasons about in place of the standard one.
lemma ReopenOpen(l: Lobby, table: int)
  ensures reopen(l, table).open == l.open + ProofLib.Filter((set_x: int) => !((set_x in l.open)), [table])
{
}

lemma reopen_ensures(l: Lobby, table: int)
  ensures (inv(l) ==> canReopen(l, table) ==> alwaysTablesSeatOneToFive(reopen(l, table)))
  ensures (inv(l) ==> canReopen(l, table) ==> alwaysNumbersAreNotNegative(reopen(l, table)))
  ensures (inv(l) ==> canReopen(l, table) ==> alwaysOneTableEach(reopen(l, table)))
  ensures (inv(l) ==> canReopen(l, table) ==> alwaysSeatedAtATable(reopen(l, table)))
  ensures (inv(l) ==> canReopen(l, table) ==> alwaysOnlyListedTablesAreOpen(reopen(l, table)))
{
  if inv(l) && canReopen(l, table) {
    ReopenOpen(l, table);
    forall t | t in reopen(l, table).open
      ensures t in l.listed
    {
      AddOne(l.open, table, t);
    }
  }
}

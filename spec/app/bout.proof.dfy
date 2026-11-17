// spec/app/bout.md, "A fighter sits down once, while there is a seat, with its most health"
// Who is seated after sitting down, with the filter the library reasons about in place of the standard one.
lemma SitSeated(b: Bout, id: int, most: int)
  ensures sit(b, id, most).seated == b.seated + ProofLib.Filter((set_x: int) => !((set_x in b.seated)), [id])
{
}

// The one who sits down is kept as it sits, for this round; everyone else is as they were.
lemma sit_ensures(b: Bout, id: int, most: int)
  ensures (inv(b) ==> canSit(b, id, most) ==> alwaysFiveAtMost(sit(b, id, most)))
  ensures (inv(b) ==> canSit(b, id, most) ==> alwaysHealthIsInRange(sit(b, id, most)))
  ensures (inv(b) ==> canSit(b, id, most) ==> alwaysLivesAreInRange(sit(b, id, most)))
  ensures (inv(b) ==> canSit(b, id, most) ==> alwaysKeptFromThisRoundOrBefore(sit(b, id, most)))
  ensures (inv(b) ==> canSit(b, id, most) ==> alwaysKnockoutsAreCounted(sit(b, id, most)))
  ensures (inv(b) ==> canSit(b, id, most) ==> stepTheEndStands(b, "sit", sit(b, id, most)))
  ensures (inv(b) ==> canSit(b, id, most) ==> stepKnockoutsOnlyGrow(b, "sit", sit(b, id, most)))
{
  if inv(b) && canSit(b, id, most) {
    var a := sit(b, id, most);
    SitSeated(b, id, most);
    forall x | x in a.seated
      ensures x == id || (x in b.seated && keptOf(x, a) == keptOf(x, b) && fighterOf(x, a) == fighterOf(x, b))
    {
      ProofLib.FilterMember((set_x: int) => !((set_x in b.seated)), [id], x);
    }
    assert keptOf(id, a).round == a.round;
    assert fighterOf(id, a) == keptOf(id, a);
  }
}

// spec/app/bout.md, "A fighter can leave at any moment"
// Who is seated after one leaves, with the filter the library reasons about in place of the standard one.
lemma StandSeated(b: Bout, id: int)
  ensures stand(b, id).seated == ProofLib.Filter((set_x: int) => !((set_x in [id])), b.seated)
{
}

// Everyone still seated was seated before, and is kept as before.
lemma stand_ensures(b: Bout, id: int)
  ensures (inv(b) ==> canStand(b, id) ==> alwaysFiveAtMost(stand(b, id)))
  ensures (inv(b) ==> canStand(b, id) ==> alwaysHealthIsInRange(stand(b, id)))
  ensures (inv(b) ==> canStand(b, id) ==> alwaysLivesAreInRange(stand(b, id)))
  ensures (inv(b) ==> canStand(b, id) ==> alwaysKeptFromThisRoundOrBefore(stand(b, id)))
  ensures (inv(b) ==> canStand(b, id) ==> alwaysKnockoutsAreCounted(stand(b, id)))
  ensures (inv(b) ==> canStand(b, id) ==> stepTheEndStands(b, "stand", stand(b, id)))
  ensures (inv(b) ==> canStand(b, id) ==> stepKnockoutsOnlyGrow(b, "stand", stand(b, id)))
{
  if inv(b) && canStand(b, id) {
    var a := stand(b, id);
    StandSeated(b, id);
    forall x | x in a.seated
      ensures x in b.seated && keptOf(x, a) == keptOf(x, b) && fighterOf(x, a) == fighterOf(x, b)
    {
      ProofLib.FilterMember((set_x: int) => !((set_x in [id])), b.seated, x);
    }
  }
}

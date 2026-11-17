// spec/app/index.md, "Everything found is one of the seventeen"
// What is found after a discovery, with the filter the library reasons about in place of the standard one.
lemma DiscoverFound(m: Match, move: int)
  ensures discover(m, move).found == m.found + ProofLib.Filter((set_x: int) => !((set_x in m.found)), [move])
{
}

// A discovery adds at most the move discovered, which its guard keeps among the seventeen.
lemma discover_ensures(m: Match, move: int)
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysVigorIsInRange(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysFighterIsOnTheRoster(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysHealthIsInRange(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysAliveMeansHealth(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysOnlyAQuestSpares(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysOnlyTheLivingFly(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysAuraIsInRange(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysHoldIsShort(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysOverdriveIsFull(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysCountsMakeSense(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysPausedOnlyInPlay(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysFoundAreMoves(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysOneDashAtMost(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysStaminaIsInRange(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysLearnedIsCounted(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysAQuestIsAWave(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysOnlyQuestsAreCleared(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysLivesAreADuels(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> alwaysADuelHasNoWaves(discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> stepFighterIsChosenOnTheSelectScreen(m, "discover", discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> stepScoreNeverDrops(m, "discover", discover(m, move)))
  ensures (inv(m) ==> canDiscover(m, move) ==> stepFoundOnlyGrows(m, "discover", discover(m, move)))
{
  if inv(m) && canDiscover(m, move) {
    DiscoverFound(m, move);
    var added := ProofLib.Filter((set_x: int) => !((set_x in m.found)), [move]);
    forall x | x in discover(m, move).found
      ensures 0 <= x && x < moves
    {
      ProofLib.FilterMember((set_x: int) => !((set_x in m.found)), [move], x);
      assert x in m.found || x in added;
    }
  }
}

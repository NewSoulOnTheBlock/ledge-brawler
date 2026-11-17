// spec/app/saga.md, "Everything known is one of the forty facts, known by one of the five"
// What is known after learning, with the filter the library reasons about in place of the standard one.
lemma LearnKnown(s: Saga, who: int, fact: int)
  ensures learn(s, who, fact).known == s.known + ProofLib.Filter((set_x: int) => !((set_x in s.known)), [code(who, fact)])
{
}

// Learning adds at most one thing: a fact the guard keeps among the forty, for one of the five.
lemma learn_ensures(s: Saga, who: int, fact: int)
  ensures (inv(s) ==> canLearn(s, who, fact) ==> alwaysCampaignsAreInRange(learn(s, who, fact)))
  ensures (inv(s) ==> canLearn(s, who, fact) ==> alwaysKnowledgeIsReal(learn(s, who, fact)))
  ensures (inv(s) ==> canLearn(s, who, fact) ==> alwaysMeasuresAreInRange(learn(s, who, fact)))
  ensures (inv(s) ==> canLearn(s, who, fact) ==> stepCampaignsNeverGoBack(s, "learn", learn(s, who, fact)))
  ensures (inv(s) ==> canLearn(s, who, fact) ==> stepKnowledgeOnlyGrows(s, "learn", learn(s, who, fact)))
{
  if inv(s) && canLearn(s, who, fact) {
    LearnKnown(s, who, fact);
    var c := code(who, fact);
    assert who == 0 || who == 1 || who == 2 || who == 3 || who == 4;
    assert remainder_app__saga(c, 100) == fact;
    forall k | k in learn(s, who, fact).known
      ensures 0 <= k && k < protagonists * 100 && remainder_app__saga(k, 100) < facts
    {
      ProofLib.FilterMember((set_x: int) => !((set_x in s.known)), [c], k);
      assert k in s.known || k == c;
    }
  }
}

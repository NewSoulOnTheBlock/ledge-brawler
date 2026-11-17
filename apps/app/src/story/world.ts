// spec/app/saga.md, "Story: Change the world"
// What the five measures of the world do to a level once they have moved far enough from where the saga starts
// (crown 60, church 55, unbound 25, stability 50, awakening 10): who is met there, what the ground does, what is
// overhead, and what help there is. As the saga begins, none of them holds.
import type { Saga } from "../../gen/app__saga.ts";
import type { Level } from "../game/levels.ts";

export interface Turn { key: "crownStrong" | "crownWeak" | "churchStrong" | "unboundStrong" | "stabilityLow" | "awakeningHigh"; name: string; does: string; reaper: string }
const TURNS: (Turn & { holds: (s: Saga) => boolean })[] = [
  { key: "crownStrong", holds: (s) => s.crown >= 70, name: "The Crown is strong", does: "A knight more at every ambush.", reaper: "The Crown is strong again. Its patrols are doubled, and there is a knight on every road you mean to take." },
  { key: "crownWeak", holds: (s) => s.crown <= 45, name: "The Crown is weak", does: "One fewer at every ambush.", reaper: "The Crown is losing its grip. Its garrisons are thin, and some posts ahead of you stand half empty." },
  { key: "churchStrong", holds: (s) => s.church >= 70, name: "The Church is strong", does: "A sorcerer-hunter who strikes from afar at every ambush.", reaper: "The Church has the people's ear now, and its hunters walk with every patrol. They do not need to reach you to hurt you." },
  { key: "unboundStrong", holds: (s) => s.unbound >= 40, name: "The Unbound are many", does: "One piece of each key is already in your hand.", reaper: "The Unbound have friends everywhere now. One of them was here before you and left a piece of the key where you would wake. I did not see who." },
  { key: "stabilityLow", holds: (s) => s.stability <= 35, name: "The Binding is failing", does: "The dead walk: a shade at every ambush.", reaper: "The Binding is coming apart. The dead are walking here, and they are not mine. I cannot call them off." },
  { key: "awakeningHigh", holds: (s) => s.awakening >= 30, name: "The Firstborn stir", does: "The sky is wrong, and the ground hurts half as much again.", reaper: "Look up. That is not the sky this place had. Something old is turning over, and the ground itself has started to bite." },
];
/** Which turns the world has taken. */
export const turnsOf = (saga: Saga): Turn[] => TURNS.filter((turn) => turn.holds(saga));
/** The level as the world now has it. Its boss's room is left as it was made. */
export function shaped(level: Level, saga: Saga): Level {
  const on = new Set(turnsOf(saga).map((turn) => turn.key));
  if (on.size === 0) return level;
  const last = level.ambushes.length - 1;
  const ambushes = level.ambushes.map((ambush, i) => {
    if (i === last) return ambush;
    let foes = ambush.foes.slice();
    const beside = (n: number) => ({ x: foes[0].x + 46 * n, y: foes[0].y });
    if (on.has("crownWeak") && foes.length > 1) foes = foes.slice(0, -1);
    if (on.has("crownStrong") && foes.length < 8) foes.push({ ...beside(1), kind: "knight" });
    if (on.has("stabilityLow") && foes.length < 8) foes.push({ ...beside(-1), kind: "shadeflit" });
    if (on.has("churchStrong") && foes.length < 8) foes.push({ ...beside(2), caster: true });
    return { ...ambush, foes };
  });
  return {
    ...level, ambushes,
    ...(on.has("awakeningHigh") ? { sky: "demonwoods" as const, hazards: level.hazards?.map((hazard) => ({ ...hazard, dmg: Math.round(hazard.dmg * 1.5) })) } : {}),
  };
}

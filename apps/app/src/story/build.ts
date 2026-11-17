// spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"
// What a player has built a protagonist into: two points for each chapter finished, spent on five paths. Kept in this
// browser, and carried into every kind of fight the protagonist's fighter is chosen for.
import type { Hero } from "./canon.ts";
import { PROTAGONISTS } from "./canon.ts";

export const PATHS = [
  { key: "jumps", name: "Jumps", each: "+1 jump in the air", most: 3 },
  { key: "health", name: "Health", each: "+10 health", most: 5 },
  { key: "damage", name: "Damage", each: "+8% damage dealt", most: 5 },
  { key: "climb", name: "Climb", each: "+25% time on a wall", most: 5 },
  { key: "dash", name: "Dash", each: "+11% dash distance", most: 5 },
] as const;
export type Path = (typeof PATHS)[number]["key"];
export type Build = Record<Path, number>;
export const UNBUILT: Build = { jumps: 0, health: 0, damage: 0, climb: 0, dash: 0 };

type Kept = Partial<Record<Hero, Partial<Build>>>;
const read = (): Kept => { try { return JSON.parse(localStorage.getItem("skills") ?? "{}") as Kept; } catch { return {}; } };
const keep = (all: Kept) => { try { localStorage.setItem("skills", JSON.stringify(all)); } catch { /* Private browsing may refuse: nothing is built. */ } };
/** The protagonist who fights as `fighter`. */
export const heroOf = (fighter: number): Hero => PROTAGONISTS.find((p) => p.fighter === fighter)!.id;
/** What `hero` has been built into: each path from none to its most. */
export function buildOf(hero: Hero): Build {
  const mine = read()[hero] ?? {};
  return Object.fromEntries(PATHS.map((path) => [path.key, Math.min(path.most, Math.max(0, Math.floor(Number(mine[path.key]) || 0)))])) as Build;
}
// What a protagonist has given the Reaper for being let off: points it earned and no longer has.
const debts = (): Partial<Record<Hero, number>> => { try { return JSON.parse(localStorage.getItem("debts") ?? "{}") as Partial<Record<Hero, number>>; } catch { return {}; } };
/** The points `hero` has earned by finishing `chapters` and not given away, and how many are still to spend. */
export const pointsLeft = (hero: Hero, chapters: number) => 2 * chapters - (debts()[hero] ?? 0) - Object.values(buildOf(hero)).reduce((sum, n) => sum + n, 0);
/** Whether `hero` has a point to give. */
export const canPay = (hero: Hero, chapters: number) => 2 * chapters - (debts()[hero] ?? 0) > 0;
/** Gives one of `hero`'s points away for good: an unspent one, or else one off its longest path. */
export function pay(hero: Hero, chapters: number) {
  if (!canPay(hero, chapters)) return;
  if (pointsLeft(hero, chapters) <= 0) { const build = buildOf(hero), path = PATHS.reduce((most, each) => (build[each.key] > build[most.key] ? each : most)).key; keep({ ...read(), [hero]: { ...build, [path]: build[path] - 1 } }); }
  try { localStorage.setItem("debts", JSON.stringify({ ...debts(), [hero]: (debts()[hero] ?? 0) + 1 })); } catch { /* Private browsing may refuse: the point is kept. */ }
}
/** Spends one of `hero`'s points on `path`, if one is left and the path has room. */
export function spend(hero: Hero, path: Path, chapters: number) {
  const build = buildOf(hero);
  if (pointsLeft(hero, chapters) <= 0 || build[path] >= PATHS.find((each) => each.key === path)!.most) return;
  keep({ ...read(), [hero]: { ...build, [path]: build[path] + 1 } });
}
/** Gives `hero` all its points back to spend again; or forgets every protagonist's, as when the saga is begun again. */
export const unbuild = (hero?: Hero) => { keep(hero ? { ...read(), [hero]: UNBUILT } : {}); if (!hero) try { localStorage.removeItem("debts"); } catch { /* Nothing was kept. */ } };

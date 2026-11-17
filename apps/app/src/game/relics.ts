// spec/app/saga.md, "Story: Play five campaigns"
// What a player finds in the campaigns besides the key: in every level, one Puzzle Piece, one Soul Stone Fragment and
// one Thread of the Gods, each found once. Enough of a kind earns something that stays: all twenty-five pieces gild
// every fighter, twenty fragments bring a fairy of light that follows the fighter everywhere, and twenty threads
// weave the Godthread outfit. And how each fighter is dressed, from the outfits it has. Kept on this device, as the
// best ranks are.
import { CHARS, type Skin } from "./data.ts";
import { SPRITES, type Sprite } from "./sprites.ts";

export type RelicKind = "puzzle" | "soul" | "thread";
export interface RelicDef { name: string; plural: string; need: number; reward: string; colour: string }
export const RELICS: Record<RelicKind, RelicDef> = {
  puzzle: { name: "Puzzle Piece", plural: "Puzzle Pieces", need: 25, reward: "the Gilded outfit, for every fighter", colour: "#e0b84a" },
  soul: { name: "Soul Stone Fragment", plural: "Soul Stone Fragments", need: 20, reward: "a fairy of light that follows you", colour: "#b98cff" },
  thread: { name: "Thread of the Gods", plural: "Threads of the Gods", need: 20, reward: "the Godthread outfit", colour: "#8ff7ff" },
};
export const RELIC_KINDS = Object.keys(RELICS) as RelicKind[];
/** Each kind's mark, a shape as well as a colour, so that they are told apart by anyone (Tailwind classes, and the map's own). */
export const RELIC_MARK: Record<RelicKind, string> = { puzzle: "rounded-none", soul: "rotate-45 rounded-none", thread: "rounded-full" };
/** Each one's picture (sprites.ts). */
export const RELIC_ICONS: Record<RelicKind, Sprite> = { puzzle: SPRITES.puzzle, soul: SPRITES.soul, thread: SPRITES.thread };

type Found = Record<RelicKind, string[]>;
const read = (): Found => {
  try {
    const kept = JSON.parse(localStorage.getItem("relics") ?? "{}");
    return Object.fromEntries(RELIC_KINDS.map((kind) => [kind, Array.isArray(kept[kind]) ? kept[kind].filter((id: unknown) => typeof id === "string") : []])) as Found;
  } catch { return { puzzle: [], soul: [], thread: [] }; }
};
const write = (found: Found) => { try { localStorage.setItem("relics", JSON.stringify(found)); } catch { /* Private browsing: for this visit only. */ } };

/** Whether the `kind` hidden in level `level` has been found. */
export const isFound = (kind: RelicKind, level: string) => read()[kind].includes(level);
/** How many of each kind have been found. */
export const relicCounts = (): Record<RelicKind, number> => { const found = read(); return { puzzle: found.puzzle.length, soul: found.soul.length, thread: found.thread.length }; };
/** Whether the reward for `kind` has been earned. */
export const earned = (kind: RelicKind) => relicCounts()[kind] >= RELICS[kind].need;

/** Keeps the `kind` of level `level` as found; says how many there are now, and whether that has just earned its reward. */
export function collect(kind: RelicKind, level: string): { count: number; rewarded: boolean } {
  const found = read();
  if (!found[kind].includes(level)) found[kind].push(level);
  write(found);
  const count = found[kind].length;
  return { count, rewarded: count === RELICS[kind].need };
}

/** An outfit: a name, the skin it dresses a fighter in (null: the fighter's own), and what earns it, if anything. */
export interface Outfit { id: string; name: string; skin: Skin | null; needs?: RelicKind; sparkle?: boolean }
export const OUTFITS: Outfit[] = [
  { id: "own", name: "Own colours", skin: null },
  { id: "ash", name: "Ash", skin: { palette: "Bone" } },
  { id: "ember", name: "Ember", skin: { palette: "Ember" } },
  { id: "frost", name: "Frost", skin: { palette: "Frost" } },
  { id: "void", name: "Void", skin: { palette: "Void" } },
  { id: "midnight", name: "Midnight", skin: { palette: "Void", tint: ["#1b1f3a", "#7fdcff"] } },
  { id: "crimson", name: "Crimson", skin: { palette: "Void", tint: ["#6e0f1a", "#ff5a3d"] } },
  { id: "jade", name: "Jade", skin: { palette: "Void", tint: ["#1f5e3a", "#9dffb5"] } },
  { id: "rose", name: "Rose", skin: { palette: "Void", tint: ["#8a2f63", "#ffb3e6"] } },
  { id: "gilded", name: "Gilded", skin: { palette: "Void", tint: ["#a8781a", "#fff3a0"] }, needs: "puzzle", sparkle: true },
  { id: "godthread", name: "Godthread", skin: { palette: "Void", tint: ["#e9ecff", "#8ff7ff"] }, needs: "thread", sparkle: true },
];

/** Whether an outfit can be worn: every one but those still to be earned. */
export const canWear = (outfit: Outfit) => !outfit.needs || earned(outfit.needs);

const chosen = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem("outfits") ?? "{}"); } catch { return {}; } };
/** The outfit fighter `fighter` wears: the one chosen for it, if it can still be worn, or its own colours. */
export function outfitOf(fighter: number): Outfit {
  const outfit = OUTFITS.find((each) => each.id === chosen()[fighter]);
  return outfit && canWear(outfit) ? outfit : OUTFITS[0];
}
export function wear(fighter: number, id: string) {
  const all = chosen(); all[fighter] = id;
  try { localStorage.setItem("outfits", JSON.stringify(all)); } catch { /* As above. */ }
}
/** The skin an outfit dresses fighter `fighter` in. */
export const skinOf = (fighter: number, outfit: Outfit = outfitOf(fighter)): Skin => outfit.skin ?? CHARS[fighter].skin;

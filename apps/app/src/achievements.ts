export interface Achievement {
  id: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_boss", name: "Boss Slayer", desc: "Defeat a boss for the first time" },
  { id: "all_combos", name: "Combo Master", desc: "Find every combo in one fight" },
  { id: "no_death_chapter", name: "Deathless", desc: "Clear a campaign chapter without dying" },
  { id: "campaign_1", name: "Forbidden Path", desc: "Complete The Forbidden's campaign" },
  { id: "campaign_2", name: "Ember Road", desc: "Complete The Ember's campaign" },
  { id: "campaign_3", name: "Exile Journey", desc: "Complete The Exile's campaign" },
  { id: "campaign_4", name: "Hollow Depth", desc: "Complete The Hollow's campaign" },
  { id: "campaign_5", name: "Grand Architect", desc: "Complete The Architect's campaign" },
  { id: "all_campaigns", name: "Five Blades", desc: "Complete all five campaigns" },
  { id: "wave_10", name: "Survivor", desc: "Reach wave 10 in Survival" },
  { id: "wave_20", name: "Endurance", desc: "Reach wave 20 in Survival" },
  { id: "wave_50", name: "Unstoppable", desc: "Reach wave 50 in Survival" },
  { id: "kos_100", name: "Centurion", desc: "Knock out 100 enemies total" },
  { id: "all_fighters", name: "Versatile", desc: "Play Survival with all 5 fighters" },
];

// Unlocked achievements are stored as an array of ids in the cloud save.
// These helpers read/write localStorage as a fast local cache.

const KEY = "achievements";

export function unlocked(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function unlock(id: string): boolean {
  const list = unlocked();
  if (list.includes(id)) return false;
  list.push(id);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  return true; // true = newly unlocked
}

export function isUnlocked(id: string): boolean {
  return unlocked().includes(id);
}

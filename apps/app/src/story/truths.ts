// spec/app/saga.md, "Story: Learn the truth five ways"
// Truths no one protagonist holds alone: each is two facts of the canon (canon.ts, FACTS) that mean more together.
// Once the player knows both, by whichever protagonists learned them, what they add up to can be read.
import type { FactId } from "./canon.ts";

export interface Truth { id: string; title: string; halves: [FactId, FactId]; scene: string[] }
export const TRUTHS: Truth[] = [
  { id: "sameKnife", title: "The Same Knife", halves: ["crownHarvests", "firstbornHarvested"], scene: [
    "The first weapons were made by cutting the Firstborn apart and binding what came out into steel.",
    "The Crown kills its sorcerers and binds what comes out into steel.",
    "It is not a new cruelty. It is the oldest craft in Vareth, still being practised. Only the thing on the table has changed." ] },
  { id: "bellsFeed", title: "What the Bells Are For", halves: ["studentsSacrificed", "bindingFails"], scene: [
    "Nine students go into the mountain every year. The Bellkeeper calls it an examination.",
    "The Great Binding is failing, and it has been failing for longer than anyone alive.",
    "The nine are not being tested. They are being fed to it. And if nine a year were enough, it would not still be failing. The number is going to rise." ] },
  { id: "aimedFire", title: "The Fire Was Aimed", halves: ["architectLitBlackspire", "sealBeneathBlackspire"], scene: [
    "The Architect paid for a riot at Blackspire. Someone turned it into a fire, and sent the fire downward.",
    "Under Blackspire is an ancient structure, and in it a fragment of a Firstborn.",
    "Nobody burns a keep from the foundations up by accident. Whoever improved the Architect's plan knew what was under the stone, and wanted it uncovered." ] },
  { id: "memoryFirst", title: "The First to Slip", halves: ["memoryUnravels", "firstbornOneSystem"], scene: [
    "The dead are coming back because memory no longer stays with the one it belonged to.",
    "The five Firstborn were one thing that governed how the world works, broken into five. One of the five was Memory.",
    "The dead are not a curse or a plague. They are the first of five supports giving way. There are four more." ] },
  { id: "prisonerWasThere", title: "The Old Man Was There", halves: ["firstVoiceMemory", "firstWarUnwon"], scene: [
    "What the executed prisoner gave to the Forbidden's sword was a memory of the Great Binding itself.",
    "Humanity did not win the First War. It held on long enough to seal the battlefield and call that a victory.",
    "A memory of how the seal was made is a memory of how it can be unmade. The Crown did not want the old man dead. It wanted that." ] },
  { id: "sixth", title: "A Sixth", halves: ["artificialMind", "historyIncomplete"], scene: [
    "What the Architect is building is not an engine. It is a mind, and it will have a will of its own.",
    "Before the First War the Firstborn kept the world at peace. There was no free will in it.",
    "He means to free Vareth from its old masters by making a new power to stand where they stood. He has not asked how the old ones kept the peace, or whether a new one would find a different way." ] },
  { id: "countingDown", title: "They Were Counting Down", halves: ["monasteryExpectedStars", "starsAreBindings"], scene: [
    "The Nine Bells knew the Night of Falling Stars was coming. They had been waiting for it.",
    "The five stars that fell were pieces of the bindings that hold the Firstborn.",
    "The monastery was never guarding a tradition. It was watching a lock, and it knew to the year when the lock would begin to come apart." ] },
];

const read = (): string[] => { try { return JSON.parse(localStorage.getItem("truths") ?? "[]") as string[]; } catch { return []; } };
/** Whether the truth `id` has been read. */
export const wasRead = (id: string) => read().includes(id);
/** Keeps that the truth `id` has been read. */
export function markRead(id: string) { if (!wasRead(id)) try { localStorage.setItem("truths", JSON.stringify([...read(), id])); } catch { /* Private browsing may refuse: it stays new. */ } }

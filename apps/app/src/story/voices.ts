// spec/app/saga.md, "Story: Play five campaigns"
// Each protagonist carries a second voice: the dead prisoner in the Forbidden's sword, the thing the Ember bargained
// with, the Exile's two swords, the thousand dead the Hollow carries, the notes the Architect's mother left. Where a
// level starts it answers what the Reaper has just said, and does not agree with him; the player says which of the
// two it heeds. That is kept, by level, for the saga's end.
import type { Hero } from "./canon.ts";

export const VOICES: Record<Hero, { name: string; unheeded: string; says: string[] }> = {
  forbidden: { name: "The First Voice", unheeded: "Then follow him. I am only a dead man in a sword. But I was right about the Crown.", says: [
    "He is right that they will hunt you. He has not said why he is helping. Death does not walk beside a man out of kindness. Ask what he came to Blackspire to collect, and did not.",
    "Do not only run. The huntress is paid, and the paid can be bought twice. He would have you flee every hand. Some hands are worth taking.",
    "He calls it mercy. I was in the cells below for some of those sentences. It was not always mercy. Sometimes you were only tired. Read the list honestly.",
    "He would rather not collect you yet. Yet. Listen to that word. What is on the lowest shelf is mine. Take it before he sees what it is.",
    "He counts. That is all he does. These people are not a sum. Do not follow the wagons to learn something. Stop them." ] },
  ember: { name: "The Furnace Below", unheeded: "You will come round. You always do when it gets dark.", says: [
    "He tells you whom you cannot save. I can carry more than he thinks. Ask me. It will cost, but ask.",
    "He says I took my price. I took what you offered. You were holding someone, and you let go to take my hand. I did not make you.",
    "He says you enjoy it too much. He has never enjoyed anything. Let me have this one. Let us both enjoy it.",
    "Why tear it down? They are kneeling to you. I have waited a thousand years for someone to kneel. Let them, for one night.",
    "The thing chained at that gate is my kin. He did not tell you that. Kill it and I will feel it, and I will not forgive you as quickly as you think." ] },
  exile: { name: "The Two Swords", unheeded: "We will be quiet, then. For now. We are still in your hands.", says: [
    "He says go quietly. We were not forged to go quietly. The man at the gate lied to you every morning for twelve years. Go through him.",
    "He says follow our pull. Be careful. We do not pull toward what is good for you. We pull toward each other.",
    "He mocks your pride. Pride is the one thing the masters did not manage to take. Keep it. You will be cold, and you will still be yourself.",
    "We know these dead. We put them here. He wants you to see which way they are facing. Do not look. You will not be able to stop.",
    "He says the old man means what he writes. He meant every bell, too. Read it. Then decide for yourself what to burn." ] },
  hollow: { name: "The Thousand", unheeded: "We will wait. We are good at waiting. It is all we have done.", says: [
    "He says be gentle with us. We do not want gentle. We want to be heard. Ask us what happened here. We remember it better than he does.",
    "He does not know what the Witness is, and that frightens him. It does not frighten us. It kept us. He would only have counted us.",
    "He wants us laid down. We have been laid down before. Ask what is under the ground he is so eager to put us in.",
    "He asks you to tell him the sentence. Do not. It was not meant for him. He was not there. We were.",
    "He says your brother has lost enough. We remember that night. We remember where he was standing. Ask him, before you are gentle." ] },
  architect: { name: "Your Mother's Hand", unheeded: "The margin has nothing more to say. Ink has never needed you to agree.", says: [
    "In the margin of your oldest book, in her hand: \"Do not only escape. Take the household's letters. Whoever kept you kept records of why.\"",
    "Her margin, beside the first diagram: \"He will tell you it is dangerous. Everything that ends a monopoly is called dangerous by whoever holds it. Death holds the oldest one.\"",
    "Her margin: \"He keeps a list of those who will not thank you. Keep a list of those who would have died without you. Compare them at the end, not before.\"",
    "Her margin, in a shakier hand: \"If it burns, do not stop it out of guilt. Stop it only if stopping it still gets you what the burning was for.\"",
    "Her last margin: \"He calls it a piece of a god. I called it a component. One of us is flattering it. Find out which before you bring it home.\"" ] },
};
export const REAPER_UNHEEDED = "As you like. I will still be here at the end. I always am.";

type Heeded = Partial<Record<Hero, Record<string, "reaper" | "voice">>>;
const read = (): Heeded => { try { return JSON.parse(localStorage.getItem("heeded") ?? "{}") as Heeded; } catch { return {}; } };
/** Keeps which of the two `hero` heeded where the level `id` started. */
export function heed(hero: Hero, id: string, whom: "reaper" | "voice") { try { localStorage.setItem("heeded", JSON.stringify({ ...read(), [hero]: { ...read()[hero], [id]: whom } })); } catch { /* Private browsing may refuse: it is not kept. */ } }
/** In how many levels `hero` heeded the Reaper, and in how many its other voice. */
export function heededBy(hero: Hero) { const all = Object.values(read()[hero] ?? {}); return { reaper: all.filter((whom) => whom === "reaper").length, voice: all.filter((whom) => whom === "voice").length }; }

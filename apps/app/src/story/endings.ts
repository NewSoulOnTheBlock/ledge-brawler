import { track } from "../track.ts";
// spec/app/saga.md, "Story: Play five campaigns"
// How a protagonist's campaign ends. Each has three ways (canon.ts, finalChoice), and a player is offered only the
// ones it has earned: by whom it heeded where each level started (voices.ts), how it answered the bosses and what it
// chose when a chapter asked something of it (parley.ts), and what it gave the Reaper to be let off. Two of the three
// are the Reaper's way and the other voice's, so that one at least is always open; the third has to be earned.
// What is then told is told in the light of the same things.
import type { Hero } from "./canon.ts";
import { PROTAGONISTS } from "./canon.ts";
import { MEMORIES, answerOf, memoriesGiven, stoodBy } from "./parley.ts";
import { heededBy } from "./voices.ts";

/** What a protagonist did, as far as its ending is concerned. `schools` counts its answers by school (parley.ts, DILEMMAS). */
export interface Deeds { reaper: number; voice: number; defied: number; reasoned: number; silent: number; schools: number[]; memories: number }
export const SCHOOLS = ["judgement", "wrath", "letting go", "the quick cut", "shelter"];
export function deedsOf(hero: Hero): Deeds {
  const schools = [0, 0, 0, 0, 0];
  for (const slot of [0, 1, 2]) { const school = answerOf(hero, slot); if (school != null) schools[school]++; }
  return { ...heededBy(hero), ...stoodBy(hero), schools, memories: memoriesGiven(hero) };
}

// In the order of each protagonist's `finalChoice`: what earns the way, said so that it reads after "by", and what is told of it.
interface Way { earned: (did: Deeds) => boolean; by: string; told: string }
const reapers = (voice: string): Pick<Way, "earned" | "by"> => ({ earned: (did) => did.reaper >= did.voice, by: `heeding the Reaper at least as often as ${voice}` });
const voices = (voice: string): Pick<Way, "earned" | "by"> => ({ earned: (did) => did.voice >= did.reaper, by: `heeding ${voice} at least as often as the Reaper` });
const WAYS: Record<Hero, Way[]> = {
  forbidden: [
    { ...reapers("the First Voice"), told: "You break the sword across the stone where the old man died. What he gave you goes out of the steel like breath, and the Reaper is there to meet it at last, with his hand open. The Crown has lost what it killed for. So have you. You are only a man with a broken sword, and for the first time in fourteen years nobody has told you what to do with the day." },
    { ...voices("the First Voice"), told: "You keep the sword, and the voice in it. You will carry a dead man's memory of how the world was locked, and he will carry you. It is not a pardon. It is a second sentence, and this one you have chosen to serve." },
    { earned: (did) => did.voice >= 3 && did.defied >= 2, by: "heeding the First Voice in three chapters and defying two of those sent against you", told: "You stop holding it back. The runes climb from the blade to your hand, and what the old man carried stands up inside you, whole. You know how the Binding was made. You know how it could be unmade. Nobody chose you to hold that. You chose yourself, the way you were taught to." },
  ],
  ember: [
    { ...reapers("the Furnace Below"), told: "You give the fire back. It goes out of you like a tide, and what comes in behind it is a kitchen, a voice, a name: all of it at once, and it hurts more than burning did. You have no power now. You know who you were carrying. The Reach will have to rise without a saint." },
    { ...voices("the Furnace Below"), told: "You let the Furnace have the rest. Cinderfall goes, and the ovens, and your own name last of all. What stands in the Reach afterwards is very bright and remembers nothing, and the thing looking out of its eyes is delighted with everything it sees." },
    { earned: (did) => did.reasoned >= 2 && did.schools[2] + did.schools[4] >= 2, by: "reasoning with two bosses, and twice choosing to let go or to shelter others", told: "You do not pay, and you do not give the fire back. You find the seam in the bargain: it was struck for one life to feel through, and you have shown it a hundred. The Furnace lets go slowly, like a hand that has been asked. You keep what you have. It keeps what it learned. Neither of you is what you were." },
  ],
  exile: [
    { ...voices("the Two Swords"), told: "You cut the bell ropes one by one. The forms, the roll, the examination: you end them all, and the masters watch you do it with the two swords they made. Whatever the bells held down will have to be met some other way. No more children go into the mountain." },
    { ...reapers("the Two Swords"), told: "You go back up the mountain, and you do not burn it. You open the roll and read every name aloud. Then you teach the forms again, to students who know what they are for and may leave. It is slower than fire. The Bellkeeper would have hated it. He would also have recognised the footwork." },
    { earned: (did) => did.schools[0] >= 2, by: "passing judgement in two of the three things asked of you", told: "You take the Bellkeeper's seat. The work goes on, because the Binding must be held; but it is held now by those who have chosen it, and the first name on the new roll is yours. You were raised to be a vessel. You have decided what you will be a vessel for." },
  ],
  hollow: [
    { ...reapers("the Thousand"), told: "You let them go. All thousand, by name, until your voice gives out and the marsh is only a marsh. The Reaper takes each one from your hand as you finish. When the last is gone you are a healer again, and alone, and you find that you can bear it." },
    { ...voices("the Thousand"), told: "You keep them. Every one, whole, as the Witness wanted, but in you and not in it: a thousand lives that will not be used, or emptied, or lost. You will never again be only yourself. They have agreed to take turns." },
    { earned: (did) => did.memories >= 2 || did.schools[4] >= 2, by: "giving the Reaper two of your memories, or twice choosing to shelter others", told: "You step into the place between memory and death, and the Witness, which never understood what it was keeping, steps out. You understand. You will keep every life, and you will let each one end when it asks to. Nobody has stood there before who knew the difference." },
  ],
  architect: [
    { ...reapers("your mother's hand"), told: "You unmake it before it is finished: the plans, the engine, the first faint voice that had begun asking you why. Vareth will go on needing its gods and its dead. But the thing you would have made would have had no say in being made, and you find that this matters to you after all." },
    { earned: (did) => did.schools[2] >= 2 || did.reasoned >= 3, by: "twice choosing to let go, or reasoning with three bosses", told: "You finish it, and then you take your hands away. It is its own from the first hour. You do not know what it will decide about Vareth, or about you. All your life you have been certain that the right person should hold the reins. You have finally met someone you would not trust with them." },
    { ...voices("your mother's hand"), told: "You bind it to you, mind to mind, so that it can never act without you, nor you without it. Vareth will be free of its old masters. It will have a new one, with two voices and one will, and you tell yourself that the second voice agrees." },
  ],
};

/** The three ways `hero`'s campaign can end, and which of them it has earned. */
export function waysOf(hero: Hero): { name: string; open: boolean; by: string }[] {
  const did = deedsOf(hero), names = PROTAGONISTS.find((p) => p.id === hero)!.finalChoice;
  return WAYS[hero].map((way, i) => ({ name: names[i], open: way.earned(did), by: way.by }));
}
const BECAME = [
  "When it was asked of you, you judged. That is what will be said of you.",
  "When it was asked of you, you burned. That is what will be said of you.",
  "When it was asked of you, you let go. That is what will be said of you.",
  "When it was asked of you, you did not wait. That is what will be said of you.",
  "When it was asked of you, you stood between. That is what will be said of you.",
];
/** What is told of the way `which` of `hero`'s ending: the way itself, what it had become, what it no longer remembers, and the Reaper's last word. */
export function epilogue(hero: Hero, which: number): string[] {
  const did = deedsOf(hero), most = Math.max(...did.schools), gone = MEMORIES[hero].slice(0, did.memories);
  return [
    WAYS[hero][which].told,
    // Only one who answered the same way twice had become that.
    ...(most >= 2 ? [BECAME[did.schools.indexOf(most)]] : []),
    ...(gone.length ? [`You do not remember ${gone.join(", or ")}. The Reaper does. He has kept ${gone.length === 1 ? "it" : "them"} safe, as he said he would.`] : []),
    did.reaper > did.voice ? "The Reaper: \"You listened to me more often than not. Few do. I will be gentle, when it is time.\""
      : did.voice > did.reaper ? "The Reaper: \"You did not listen to me much. I do not hold it against you. I will be there all the same.\""
        : "The Reaper: \"You weighed us against each other to the end. I respect that. It will not change how it ends.\"",
  ];
}

const read = (): Partial<Record<Hero, number>> => { try { return JSON.parse(localStorage.getItem("endings") ?? "{}") as Partial<Record<Hero, number>>; } catch { return {}; } };
/** Which way `hero` chose, if it has: a choice once made stands. */
export const endedBy = (hero: Hero): number | null => read()[hero] ?? null;
/** Keeps the way `hero` chose. */
export function end(hero: Hero, which: number) { track("ending", { hero, which }); try { localStorage.setItem("endings", JSON.stringify({ ...read(), [hero]: which })); } catch { /* Private browsing may refuse: it may choose again. */ } }

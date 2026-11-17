// spec/app/saga.md, "Story: Play five campaigns"
// Where the five roads cross (canon.ts, EVENTS): in these levels another of the five is there to be seen, in the
// middle of its own story. What is seen of it depends on what the player chose when it was that protagonist, if it
// has been: the answer it gave after one of its own chapters (parley.ts, DILEMMAS).
import type { Hero } from "./canon.ts";
import { answerOf } from "./parley.ts";

interface Crossing { who: Hero; /** Which of its answers shows, and what is seen for each school of answer. */ after: number; seen: Record<number, string>; unknown: string }
const CROSSINGS: Record<string, Crossing> = {
  // The Silent Procession, from both sides.
  "forbidden-5": { who: "ember", after: 0, unknown: "A woman with fire in her hands is pulling people out of the last wagon. She looks at your sword, then at you, and goes back to the wagon. You will hear her name later: the Ember.",
    seen: { 1: "The Ember is here. There is not a guard left alive at the last wagon. She did the same at Cinderfall.", 4: "The Ember is here, carrying a prisoner out of the last wagon on her back. She did the same at Cinderfall, door to door.", 3: "The Ember got here before you. She has the convoy's orders in her fist already. She always rides ahead of the order.", 2: "The Ember is here. She has let the convoy's guards run. They passed you on the road, white-faced, saying a saint was behind them." } },
  "ember-5": { who: "forbidden", after: 0, unknown: "A big man with an executioner's sword is reading the convoy's ledger by torchlight. The Crown's own killer, here, and not on the Crown's side. The Forbidden.",
    seen: { 0: "The Forbidden is here. A guard captain lies at his feet, cut down cleanly. He does not look sorry. He looks like a man finishing a sentence.", 1: "The Forbidden is here, and the wagon behind him is burning. He burns what he leaves, that one.", 2: "The Forbidden is here. He has a guard on his knees, disarmed, and as you watch he lets him go.", 3: "The Forbidden is here, and already leaving. He has what he came for. He does not stop for anyone." } },
  // The Burning of Blackspire, from the side of the man who lit it.
  "architect-4": { who: "forbidden", after: 1, unknown: "On a roof across the fire, a man with a greatsword is cutting his way out of the city you lit. You do not know him. He would know you, if he knew.",
    seen: { 3: "Across the fire, the Forbidden is leading a family over the roofs, his body between them and the heat. You lit this. He is the one carrying people out of it.", 0: "Across the fire, the Forbidden is climbing alone, sword on his back, and does not look down at the streets. You understand him better than you would like.", 2: "Across the fire, the Forbidden is climbing. Below him a blind woman runs the other way, into the smoke, to warn someone. Neither is in your plan.", 1: "Across the fire, the Forbidden stands at a door with his sword drawn while the knights come to him. One man, holding one door, in a city you set alight." } },
  // The Empty Monastery, with the Architect's people in it.
  "exile-5": { who: "architect", after: 1, unknown: "A man in a travelling coat is copying the monastery's records by lamplight while his people load crates. He nods to you as if you had an appointment. The Architect.",
    seen: { 0: "The Architect is here, copying the records. He hands you a page without being asked. He gives that page to everyone.", 2: "The Architect is here, copying the records. He closes the book when he sees you, and smiles.", 3: "The Architect is here, copying the records. He looks older than a man of his years should, and his hands shake when he writes.", 4: "The Architect is here. He is not copying the records. He is drawing something from memory in their margins." } },
};
/** Who is to be seen in the level `id`, and what is seen of them. */
export function crossing(id: string): { who: Hero; text: string } | undefined {
  const c = CROSSINGS[id], school = c && answerOf(c.who, c.after);
  return c && { who: c.who, text: (school != null && c.seen[school]) || c.unknown };
}

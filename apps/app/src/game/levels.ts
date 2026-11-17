// spec/app/index.md, "Story: Play a level of a campaign"
// The levels of the campaigns: a place to cross from its start to its way out. A level is data, made from its rooms
// by rooms.ts; the arena of sim.ts builds it, places its enemies as the fighter reaches them, and reports the way
// out to the match.
import type { FactId, Hero, RegionId } from "../story/canon.ts";
import type { CastId } from "./cast.ts";
import type { Vec } from "./data.ts";
import type { ThemeId } from "./places.ts";
import { type Brief, level } from "./rooms.ts";
import type { SkyId } from "./sky.ts";
import { ASHES_AND_IRON, BASTARD_PRINCE, BURNING_OF_BLACKSPIRE, FIVE_OBJECTS, MERIDIAN, NECESSARY_MONSTER, BARGAIN, BLACK_ARCHIVE, CINDERFALL, EMPTY_MONASTERY, FROZEN_DEAD, LAST_PATIENT, LIVING_BROTHER, THOUSAND_NAMES, WEEPING_CITY, WITNESS, LAST_SENTENCE, MARKED_MAN, NINE_BELLS, NORTHERN_ROAD, PRICE_OF_MERCY, RED_CAMPAIGN, SAINT_IS_BORN, SILENT_PROCESSION, TWO_SWORDS } from "./maps.ts";
import type { Traps } from "./traps.ts";

/** A platform, ledge or wall: centre, size, and what it is. A wall has no walkable top line drawn; fill is plain rock, whose tops are listed apart. */
export type Slab = [cx: number, cy: number, w: number, h: number, kind: "ground" | "ledge" | "wall" | "fill"];

export interface Level {
  id: string;
  /** Whose campaign, and which of its chapters (from 0), this level belongs to. */
  hero: Hero; chapter: number;
  name: string; region: RegionId;
  /** What the chapter card says before the level. */
  brief: string;
  spawn: Vec;
  /** The way out. Reaching it clears the level. */
  exit: Vec;
  /** The far ends of the level, for the camera and the map. */
  span: [min: number, max: number];
  /** What a hidden chamber of the level tells whoever finds the first of them. */
  secret?: string;
  slabs: Slab[];
  crates: [x: number, y: number, size: number][];
  /** Enemies that arrive when the fighter passes `at`, or, in a level of rooms, steps into `zone`. No more than eight to an ambush. */
  ambushes: { at: number; zone?: [x0: number, y0: number, x1: number, y1: number]; foes: (Vec & { caster?: boolean; kind?: CastId })[] }[];
  /** Things to find. Reaching one teaches the protagonist a fact of the canon. */
  clues: (Vec & { fact: FactId; text: string })[];
  /** What finishing the level does to the world: a measure of the saga and how far it moves. */
  effects: { measure: number; amount: number }[];
  /** The art the place is drawn in (places.ts). Without one it is drawn in its region's colours, as the arena is in ink. */
  theme?: ThemeId;
  /** What stands in the place and is only looked at: a tile piece or a plant, its bottom middle at (x, y), behind the fighters or in front. */
  decor?: Decor[];
  /** What hurts to touch: a box `w` wide and `h` tall standing on (x, y). */
  hazards?: (Vec & { w: number; h: number; dmg: number })[];
  /** Plants that throw a fighter who lands on them: where they grow from. */
  springs?: Vec[];
  /** What a hand-drawn level has to catch the unwary (traps.ts). */
  traps?: Traps;
  /** What the guide says where it starts, a line at a time. */
  talk?: string[];
  /** What is behind it (sky.ts). Without one, its theme's own far things are. */
  sky?: SkyId;
  /** In a duel: the places a fighter may start. */
  starts?: Vec[];
  /** How far up and down the place goes: a level of rooms is as tall as it is wide, and the view follows the fighter through it. */
  bounds?: { top: number; bottom: number };
  /** The walkable tops of its rock, each from (x, y) for `w`: where its ground is dressed. */
  tops?: [x: number, y: number, w: number][];
  /** How many rooms it is across and down. */
  rooms?: [across: number, down: number];
  /** The way out stays shut until the last ambush has been met and none of its enemies is left. */
  guarded?: boolean;
}
export type Decor = Vec & { k?: number; front?: boolean; flip?: boolean; far?: number } & ({ piece: string; set?: string } | { plant: string });

/** The top of a slab of ground at height `top`, `from` to `to`. */
const ground = (from: number, to: number, top = 680): Slab => [(from + to) / 2, top + 20, to - from, 40, "ground"];
const ledge = (cx: number, top: number, w: number): Slab => [cx, top + 11, w, 22, "ledge"];
/** Five campaigns, five chapters each. The Forbidden's five, The Ember's five, The Exile's five and The Hollow's five and The Architect's five are drawn by hand (maps.ts); the rest are laid out from rooms.ts, whose rooms say where their geometry came from. */
export const BRIEFS: Brief[] = [
  // Skies are chosen to match each theme: no neon city stands behind a medieval place; scenery.ts tints each toward its theme.
  // ── The Forbidden: Blackspire's caverns, from its yard down to what the Crown keeps under it. ──
  { id: "forbidden-1", sky: "corridors", hero: "forbidden", chapter: 0, name: "The Last Sentence", region: "crownlands", theme: "cavern", w: 6, h: 4, seed: 11, map: LAST_SENTENCE, foes: ["samurai", "knight"], boss: "knight",
    talk: ["You know me. You have sent me enough company. Tonight I came for the old man, and he left something in your sword instead of coming along.", "The Crown did not want him dead. It wanted what he carried. You were the knife, not the judge.", "They will hunt you for it now. Climb out of Blackspire. The knights hold the gates, so take the keep by its bones.", "Look in the corners as you go. The dead leave notes for people who climb."],
    brief: "Blackspire. The prisoner is dead, his power is in your sword, and the Crown's own executioner is now its quarry. Climb out of the keep.",
    clues: ["crownHarvests", "prisonersBeneathBlackspire"], clueText: ["The old man's last words, scratched where only a climber would look: the Crown kills us for what we carry.", "A ration tally for cells that are on no plan of the keep. Someone is being fed down there."],
    secret: "Fourteen tallies scratched into the stone, and a fifteenth begun. Someone kept count of the Reaper's visits.",
    effects: [{ measure: 0, amount: -5 }, { measure: 2, amount: 5 }] },
  { id: "forbidden-2", sky: "nightforest", hero: "forbidden", chapter: 1, name: "The Marked Man", region: "crownlands", theme: "cavern", w: 6, h: 5, seed: 12, map: MARKED_MAN, foes: ["samurai", "knight"], boss: "huntress",
    talk: ["Your face is on every gate by morning. Fourteen years of service buys you one night's head start.", "They have hired blades for the rooftops, and a huntress who works blind. She listens. Do not stand still near her.", "Keep going up and out. A marked man is safest where nobody expects him to climb."],
    brief: "Every gate has your face on it. The hunters know the roofs better than you do, and one of them does not need to see you to find you.",
    clues: ["architectLitBlackspire", "prisonersBeneathBlackspire"], clueText: ["A purse of foreign coin on a dead watchman. Someone outside the Crown is paying for unrest here.", "A gaoler's key cut for a lock four floors below the lowest floor."],
    secret: "A wanted poster with your face, the ink long dry. They had it drawn before you ever ran.",
    effects: [{ measure: 0, amount: -3 }, { measure: 2, amount: 4 }] },
  { id: "forbidden-3", sky: "corridors", hero: "forbidden", chapter: 2, name: "The Price of Mercy", region: "crownlands", theme: "ruin", w: 7, h: 5, seed: 13, map: PRICE_OF_MERCY, foes: ["samurai", "knight", "hallokin"], boss: "knight",
    talk: ["Not everyone you were sent to kill is dead. You were kinder than your orders, more often than you admit.", "The ones you spared found each other. They kept a list, and it runs through the undercroft, room to room.", "Reach its end before the Crown does. If the knights read it first, your mercy becomes their map."],
    brief: "The ones you spared kept a list of each other. Follow it through the undercroft before the Crown reads it first.",
    clues: ["firstVoiceMemory", "crownHarvests"], clueText: ["The sword hums at a name on the wall. It remembers him. It remembers more than him.", "Vials, each labelled with a sentence you carried out."],
    secret: "Letters to the families you spared, never sent. Each one begins the same way, and stops.",
    effects: [{ measure: 2, amount: 6 }, { measure: 1, amount: -3 }] },
  { id: "forbidden-4", sky: "corridors", hero: "forbidden", chapter: 3, name: "The Black Archive", region: "crownlands", theme: "cavern", w: 7, h: 6, seed: 14, map: BLACK_ARCHIVE, foes: ["knight", "samurai", "hallokin"], boss: "boss",
    talk: ["Under the archive is the room the archive was built to hide.", "Every sentence you carried out is counted there, and beside each, what was taken from the body. Essence, poured into steel.", "Something guards the lowest shelf that I did not put there. Go carefully. I would rather not collect you yet."],
    brief: "Under the archive is the room the archive was built to hide. What the Crown takes from the dead is counted there.",
    clues: ["firstbornHarvested", "sealBeneathBlackspire"], clueText: ["A ledger of essences, and against each, the weapon it was poured into.", "The lowest shelf is not a shelf. It is the lip of something far older than the city."],
    secret: "A shelf the archive forgot: ledgers of the dead, every name in your own hand.",
    effects: [{ measure: 0, amount: -8 }, { measure: 4, amount: 5 }] },
  { id: "forbidden-5", sky: "demonwoods", hero: "forbidden", chapter: 4, name: "The Silent Procession", region: "crownlands", theme: "ruin", w: 8, h: 7, seed: 1732, map: SILENT_PROCESSION, foes: ["knight", "samurai", "hallokin", "sickle"], boss: "boss",
    talk: ["A convoy moves through the night. No flags, no lanterns, only guards and the sound of chains.", "The prisoners were not sentenced. They were collected. Each one carried something the Crown wanted.", "Follow the convoy. What it leaves behind may tell you more than what it carries.", "I count the living. Someone should."],
    brief: "A silent convoy carries prisoners stripped of their essences. Follow it through the dark and learn what the Crown does with what it takes.",
    clues: ["crownHarvests", "cinderfallSubjects", "firstVoiceMemory"], clueText: ["A manifest listing people by their magical abilities, not their names.", "Among the prisoners: survivors of settlements the Crown said it lost.", "One prisoner whispers a phrase your sword finishes for you."],
    secret: "A child's chain, cut clean through and coiled with care. Someone slipped the procession before you.",
    effects: [{ measure: 0, amount: -6 }, { measure: 2, amount: 8 }] },
  // ── The Ember: the Ashen Reach in volcanic ember and shrine stone. ──
  { id: "ember-1", sky: "dawn", hero: "ember", chapter: 0, name: "Cinderfall", region: "ashenReach", theme: "ember", w: 6, h: 4, seed: 21, map: CINDERFALL, foes: ["hallokin", "samurai"], boss: "huntress",
    talk: ["This is the last night Cinderfall stands. I have been busy here since dusk.", "The soldiers hold the road, and their order is not to take the town. It is to end it.", "Cross the lantern fields to the old gate. An officer carries the order. She is the one to stop.", "You will want to save everyone. You will not. Save who you can reach."],
    brief: "Cinderfall, the last night it stood. The soldiers have the road. Cross the lantern fields and reach the old gate before the order is carried out.",
    clues: ["cinderfallSubjects", "crownHarvests"], clueText: ["A manifest pinned under a lantern: not the dead of Cinderfall, but the living, numbered and assigned.", "Crates stamped with the royal seal, packed for people, not ore."],
    secret: "Jars sealed in wax, one for every street of Cinderfall, each labelled and none of them empty.",
    effects: [{ measure: 0, amount: -5 }, { measure: 3, amount: -5 }] },
  { id: "ember-2", sky: "dawn", hero: "ember", chapter: 1, name: "The Bargain", region: "ashenReach", theme: "ember", w: 6, h: 5, seed: 22, map: BARGAIN, foes: ["hallokin", "sickle", "samurai"], boss: "knight",
    talk: ["You should have come with me that night. Something under the burned ground made you a better offer.", "It carried you out, and it took its price in memory. You were holding someone. You no longer know who.", "Go down and find what you sold. The seams in the rock are opening by themselves, so mind where you stand."],
    brief: "Something under the burned ground offered to carry you out. You cannot remember who you were carrying. Go down and find out what you sold.",
    clues: ["firstbornHarvested", "bindingFails"], clueText: ["Chains too large for any animal, driven into the rock from above.", "The seams in the stone are opening by themselves. Nothing is mining here."],
    secret: "Scorch marks shaped like a hand, pressed into the wall from the other side.",
    effects: [{ measure: 4, amount: 6 }, { measure: 3, amount: -4 }] },
  { id: "ember-3", sky: "duskC", hero: "ember", chapter: 2, name: "Ashes and Iron", region: "ashenReach", theme: "shrine", w: 7, h: 5, seed: 23, map: ASHES_AND_IRON, foes: ["hallokin", "sickle", "samurai"], boss: "huntress",
    talk: ["Three garrisons hold the Reach. The people behind you have pitchforks and a rumour about you.", "Tonight you make the rumour true. Break this garrison and the other two will hear of it by morning.", "You enjoy this more than you should. I am not complaining. I only keep the count."],
    brief: "Three garrisons hold the Reach. Tonight there will be two. The people behind you have nothing to fight with but you.",
    clues: ["architectLitBlackspire", "cinderfallSubjects"], clueText: ["The garrison's pay came by a private courier, not the Crown's.", "A survivor's brand under a soldier's gauntlet. They made some of you into them."],
    secret: "A quartermaster's tally: pitchforks taken, three hundred. Pitchforks returned, none.",
    effects: [{ measure: 2, amount: 8 }, { measure: 0, amount: -5 }] },
  { id: "ember-4", sky: "duskA", hero: "ember", chapter: 3, name: "A Saint Is Born", region: "ashenReach", theme: "ember", w: 7, h: 6, seed: 24, map: SAINT_IS_BORN, foes: ["sickle", "samurai", "knight"], boss: "boss",
    talk: ["They are painting your face on shrines. The Crown paid for the paint.", "A saint is easier to manage than a rebel. Saints stand still and are prayed at.", "Tear the first shrine down before anyone kneels. The Crown has sent something to bless it. It is large, and it is not holy."],
    brief: "They are painting your face on shrines. Tear the first one down before anyone prays at it, and meet what the Crown sent to bless it.",
    clues: ["historyIncomplete", "bindingFails"], clueText: ["The shrine's old carving shows the First War ending with no one kneeling to anyone.", "Every candle here leans the same way, towards the ground."],
    secret: "Shrine paint, the brush still wet. Your face, painted without its scars.",
    effects: [{ measure: 1, amount: 6 }, { measure: 2, amount: 4 }] },
  { id: "ember-5", sky: "duskA", hero: "ember", chapter: 4, name: "The Red Campaign", region: "ashenReach", theme: "shrine", w: 8, h: 7, seed: 1745, map: RED_CAMPAIGN, foes: ["sickle", "samurai", "knight", "hallokin"], boss: "boss",
    talk: ["Two garrisons left. One of them has started burning the villages it was meant to guard.", "Your name is on every wall now. Some of them spelled it right.", "The garrison commander knows you are coming. He has chained something to his gate that used to live underground.", "Be loud. The people behind you need to believe this is possible."],
    brief: "Two garrisons left. The one ahead has started burning its own villages, and its commander has chained something ancient to the gate.",
    clues: ["cinderfallSubjects", "firstbornHarvested", "bindingFails"], clueText: ["A soldier's journal describing prisoners made to dig beneath the garrison.", "Chains forged for something far larger than a person, driven into living rock.", "The ground shakes when no one is mining. Something below has started to move."],
    secret: "A village bell, buried here so the garrison could not melt it down.",
    effects: [{ measure: 2, amount: 10 }, { measure: 3, amount: -6 }] },
  // ── The Exile: the Pale North in frost and ruin. ──
  { id: "exile-1", sky: "duskB", hero: "exile", chapter: 0, name: "Nine Bells", region: "paleNorth", theme: "frost", w: 6, h: 4, seed: 31, map: NINE_BELLS, foes: ["shadeflit", "sickle"], boss: "samurai",
    talk: ["You were their best student. That is why they chose you for the last examination.", "It was never meant to be passed. Nine names leave the roll every year, and none of them leaves the mountain.", "Take the two swords and go by the way the bells cannot see. A swordsman waits at the gate. He taught you."],
    brief: "The last examination was never meant to be passed. Take the two swords and leave the monastery by the way the bells cannot see.",
    clues: ["studentsSacrificed", "monasteryExpectedStars"], clueText: ["Nine names cut from the roll each year, in the Bellkeeper's own hand.", "A star chart with tonight circled, drawn before you were born."],
    secret: "Nine bell ropes, cut. A tenth, uncut, leading nowhere at all.",
    effects: [{ measure: 1, amount: -5 }, { measure: 3, amount: -3 }] },
  { id: "exile-2", sky: "hills", hero: "exile", chapter: 1, name: "The Two Swords", region: "paleNorth", theme: "frost", w: 6, h: 5, seed: 32, map: TWO_SWORDS, foes: ["shadeflit", "sickle", "samurai"], boss: "huntress",
    talk: ["The short blade pulls one way and the long one another. They were one thing once.", "Somewhere in these foothills is where they were parted. The swords remember it better than the monks' books do.", "Follow the pull, and listen for a hunter who does not use her eyes. The monastery pays well for runaways."],
    brief: "The short blade pulls one way and the long one another. Somewhere in the foothills is the place they were parted.",
    clues: ["firstbornHarvested", "starsAreBindings"], clueText: ["The swords fit two sockets in the rock, and the rock is warm.", "Where the star fell, the ground is not burned. It is stitched."],
    secret: "Two sword marks in the stone that meet in a single cut.",
    effects: [{ measure: 4, amount: 4 }, { measure: 3, amount: -3 }] },
  { id: "exile-3", sky: "nightforest", hero: "exile", chapter: 2, name: "The Northern Road", region: "paleNorth", theme: "ruin", w: 7, h: 5, seed: 33, map: NORTHERN_ROAD, foes: ["shadeflit", "sickle", "samurai"], boss: "knight",
    talk: ["Every village on this road owes the monastery a child. None of them will shelter its runaway.", "Two strangers ahead say they will, for a price. One of them is honest. I will not tell you which.", "Walk on. Pride will get you past the knights. It will not get you through the winter."],
    brief: "Villages that owe the monastery their dead will not shelter its runaway. Two strangers on the road say they will, for a price.",
    clues: ["studentsSacrificed", "bindingFails"], clueText: ["A village shrine to a child the Bells took. The offering bowl is still filled.", "The well is dry and the frost in it is climbing."],
    secret: "A child's shoe and a monastery token. The token is stamped with your own number.",
    effects: [{ measure: 2, amount: 5 }, { measure: 1, amount: -4 }] },
  { id: "exile-4", sky: "duskB", hero: "exile", chapter: 3, name: "The Frozen Dead", region: "paleNorth", theme: "frost", w: 7, h: 6, seed: 135, map: FROZEN_DEAD, foes: ["sickle", "samurai", "knight"], boss: "boss",
    talk: ["I have been waiting to show you this. A whole battle kept under the ice, every blade still raised.", "They were mine a long time ago, and they have not been collected. Something holds them here.", "Look at which way they are facing. Then meet what has started to move in the middle of them."],
    brief: "A battlefield kept whole under the ice, every blade still raised. Something in the middle of it has started to move again.",
    clues: ["firstWarUnwon", "historyIncomplete"], clueText: ["No side in the ice is winning. Both are facing the same way, and running.", "The banners of the Firstborn hang over fields, not ruins."],
    secret: "A soldier's last letter, frozen into the wall halfway through a sentence.",
    effects: [{ measure: 4, amount: 8 }, { measure: 3, amount: -5 }] },
  { id: "exile-5", sky: "corridors", hero: "exile", chapter: 4, name: "The Empty Monastery", region: "paleNorth", theme: "ruin", w: 8, h: 7, seed: 35, map: EMPTY_MONASTERY, foes: ["sickle", "samurai", "knight", "shadeflit"], boss: "boss",
    talk: ["The bells have stopped. The monastery is empty, but the doors are not locked.", "Someone has been through every room. They took the records and left the weapons.", "The Bellkeeper expected this night. He left you a message in the only place he knew you would look.", "Read it carefully. He does not write things he does not mean."],
    brief: "The monastery stands empty and silent. Someone has taken the records. The Bellkeeper left a message where only you would find it.",
    clues: ["studentsSacrificed", "monasteryExpectedStars", "starsAreBindings"], clueText: ["A record of every student who entered the final examination. None passed.", "Star charts predicting tonight, drawn in the Bellkeeper's own hand.", "Where each star fell, the Bellkeeper has written a name. Five names. Five places."],
    secret: "The abbot's chair, turned to face the wall.",
    effects: [{ measure: 1, amount: -6 }, { measure: 3, amount: -8 }] },
  // ── The Hollow: the Drowned Wilds in fungal glow and deep cavern. ──
  { id: "hollow-1", sky: "forest", hero: "hollow", chapter: 0, name: "The Last Patient", region: "drownedWilds", theme: "fungal", w: 6, h: 4, seed: 41, map: LAST_PATIENT, foes: ["shadeflit", "hallokin"], boss: "sickle",
    talk: ["You died here, among the children you could not save. I had your hand. Then something else took it and sent you back.", "I do not know what it is. That should worry you. It worries me.", "The marsh is awake where you fell. Walk through it and see what was left in your place.", "The dead here will speak to you now. Be gentle. Most of them do not know."],
    brief: "The Drowned Wilds. You died here, among the children you could not save, and something sent you back. Whatever it left in the marsh is still awake.",
    clues: ["memoryUnravels", "bindingFails"], clueText: ["A child's voice in the moss, repeating a name that is not hers. The dead are not returning. They are coming apart.", "The water here runs uphill for a few steps, then remembers itself."],
    secret: "A child's drawing of a healer, done in moss. Someone keeps it green.",
    effects: [{ measure: 3, amount: 5 }, { measure: 4, amount: 5 }] },
  { id: "hollow-2", sky: "demonwoods", hero: "hollow", chapter: 1, name: "The Witness", region: "drownedWilds", theme: "fungal", w: 6, h: 5, seed: 42, map: WITNESS, foes: ["shadeflit", "hallokin", "sickle"], boss: "huntress",
    talk: ["The thing that returned you calls itself the Witness. It keeps its word and its accounts.", "You agreed to gather last memories for it. You did not read what else you agreed to.", "Find where it watches from. A blind huntress guards the way, and she has been dead longer than she thinks."],
    brief: "The thing that sent you back keeps its word and its accounts. Find where it watches from, and read what you agreed to.",
    clues: ["kingHasIdentity", "memoryUnravels"], clueText: ["A crowned figure in the reeds, speaking in six voices, none of them its own.", "Two graves with one name, and the second is fresher."],
    secret: "The Witness's tally, carved small. One mark has your name beside it.",
    effects: [{ measure: 4, amount: 6 }, { measure: 1, amount: -3 }] },
  { id: "hollow-3", sky: "nightforest", hero: "hollow", chapter: 2, name: "A Thousand Names", region: "drownedWilds", theme: "cavern", w: 7, h: 5, seed: 43, map: THOUSAND_NAMES, foes: ["shadeflit", "hallokin", "sickle"], boss: "boss",
    talk: ["The dead you carry have started answering to each other's names. That is not how it is meant to go.", "Memory is coming loose from the people it belonged to. Yours will too, in time.", "Take them to the old burial ground before they forget which of them you are. Something there will not want them laid down."],
    brief: "The dead you carry have started answering to each other's names. Take them to the old burial ground before they forget which of them you are.",
    clues: ["firstbornOneSystem", "memoryUnravels"], clueText: ["Five idols on one root. Break one and the other four bleed.", "A spirit asks you its own name, and thanks you when you guess."],
    secret: "A headstone with a thousand names cut into it, each over the last, until none can be read.",
    effects: [{ measure: 3, amount: -6 }, { measure: 4, amount: 6 }] },
  { id: "hollow-4", sky: "underwater", hero: "hollow", chapter: 3, name: "The Weeping City", region: "drownedWilds", theme: "fungal", w: 7, h: 6, seed: 448, map: WEEPING_CITY, foes: ["hallokin", "sickle", "samurai"], boss: "boss",
    talk: ["A drowned city where the dead come up to talk. I used to like it here.", "Tonight they are all saying one sentence, together, and it is not meant for the living.", "Go up through the towers and hear it properly. Then tell me. Nobody has told me anything in a long while."],
    brief: "A flooded city where the dead come up to talk. Tonight they are all saying the same sentence, and it is not addressed to the living.",
    clues: ["bindingFails", "kingHasIdentity"], clueText: ["The tide marks on the towers go up and never down.", "The city's dead bow to a king who was never buried here."],
    secret: "A tide line painted on the wall by hand and dated, each mark higher than the one before.",
    effects: [{ measure: 3, amount: -8 }, { measure: 1, amount: 4 }] },
  { id: "hollow-5", sky: "demonwoods", hero: "hollow", chapter: 4, name: "The Living Brother", region: "drownedWilds", theme: "cavern", w: 8, h: 7, seed: 853, map: LIVING_BROTHER, foes: ["shadeflit", "hallokin", "sickle", "samurai"], boss: "boss",
    talk: ["Someone who knew you before has found you. He says he watched you die.", "He does not trust what you have become. Neither would you, in his place.", "The dead you carry are restless tonight. They sense something familiar in the marsh.", "Show him gently. He has lost enough."],
    brief: "A man from your life before finds you in the marsh. He watched you die. The dead you carry remember him too, and not all their memories are kind.",
    clues: ["memoryUnravels", "kingHasIdentity", "firstbornOneSystem"], clueText: ["Two of the dead are arguing over which of them was his friend. Neither is right.", "A voice among the spirits speaks with six others, and none of them belong to it.", "Five roots in the moss, and when one is cut, the others bleed."],
    secret: "Two cups set out for two brothers. One of them has been drunk from tonight.",
    effects: [{ measure: 3, amount: -8 }, { measure: 4, amount: 8 }] },
  // ── The Architect: the Crownlands in ruin and shrine. ──
  { id: "architect-1", sky: "corridors", hero: "architect", chapter: 0, name: "The Bastard Prince", region: "crownlands", theme: "ruin", w: 6, h: 4, seed: 51, map: BASTARD_PRINCE, foes: ["hallokin", "knight"], boss: "knight",
    talk: ["A king's son with no claim. They never raised you. They stored you.", "Tonight the household changes hands again, and the new keepers do not plan to keep you long.", "Leave before the knights finish counting the silver. You are patient by nature. Tonight, be quick instead."],
    brief: "A king's son with no claim is a thing to be kept, not raised. Tonight the household changes hands again. Do not be in it when it does.",
    clues: ["crownHarvests", "artificialMind"], clueText: ["Your tutors were paid from the same account as the executioners.", "A clockwork that corrects its own mistakes, hidden in a nursery wall."],
    secret: "The household inventory. You are listed under furnishings.",
    effects: [{ measure: 0, amount: -4 }, { measure: 2, amount: 3 }] },
  { id: "architect-2", sky: "corridors", hero: "architect", chapter: 1, name: "The Meridian", region: "crownlands", theme: "shrine", w: 6, h: 5, seed: 52, map: MERIDIAN, foes: ["hallokin", "shadeflit", "samurai"], boss: "huntress",
    talk: ["Your mother's order hid its real library off every map. You have her handwriting and her stubbornness.", "In it is a way to make power without asking the dead for theirs. I have a professional interest.", "The scholars' notes call it an engine at first. Read on, and see what they call it by the end."],
    brief: "Your mother's order kept its real library off every map. Find it, and the thing in it that makes power without asking the dead for it.",
    clues: ["artificialMind", "historyIncomplete"], clueText: ["The scholars' notes stop calling it an engine and start calling it 'the student'.", "A history with the last third cut out, and the cuts are old."],
    secret: "Your mother's notes in the margin of a book no one else has opened. She wrote them to you, by name.",
    effects: [{ measure: 3, amount: 4 }, { measure: 4, amount: -3 }] },
  { id: "architect-3", sky: "duskC", hero: "architect", chapter: 2, name: "A Necessary Monster", region: "crownlands", theme: "ruin", w: 7, h: 5, seed: 53, map: NECESSARY_MONSTER, foes: ["hallokin", "samurai", "knight"], boss: "knight",
    talk: ["Nobles want a cause and mercenaries want a wage. You have neither yet, only a very good argument.", "Walk into their camp alone. Leave with both, or do not leave. I have come along in case.", "You will tell yourself the people you use tonight will thank you later. Some will. I keep the list of the rest."],
    brief: "Nobles want a cause and mercenaries want a wage. Walk into their camp alone and leave with both, or do not leave.",
    clues: ["cinderfallSubjects", "firstbornHarvested"], clueText: ["A mercenary's contract for 'specimens', countersigned by the Crown.", "A relic blade that weeps when it is sheathed."],
    secret: "A payroll for men who did the Crown's specimen work and were never paid, because they never came back.",
    effects: [{ measure: 2, amount: 6 }, { measure: 0, amount: -6 }] },
  { id: "architect-4", sky: "duskA", hero: "architect", chapter: 3, name: "The Burning of Blackspire", region: "crownlands", theme: "shrine", w: 7, h: 6, seed: 54, map: BURNING_OF_BLACKSPIRE, foes: ["knight", "samurai", "hallokin"], boss: "boss",
    talk: ["It was meant to be a riot and a resignation. You drew it very neatly.", "Someone improved your plan. The fire is going down into the foundations, towards something that breathes.", "Climb through the city you lit and stop the part you did not design. I am very busy tonight, because of you."],
    brief: "It was meant to be a riot and a resignation. Climb through the city you set alight and stop the part of it you did not plan.",
    clues: ["architectLitBlackspire", "sealBeneathBlackspire"], clueText: ["Your own cipher, on an order you never wrote. Someone improved your plan.", "The fire is drawing down, into the foundations, as if something there were breathing."],
    secret: "Your plan for Blackspire, pinned to the wall, with someone else's corrections in red.",
    effects: [{ measure: 0, amount: -10 }, { measure: 3, amount: -6 }] },
  { id: "architect-5", sky: "corridors", hero: "architect", chapter: 4, name: "The Five Objects", region: "crownlands", theme: "cavern", w: 8, h: 7, seed: 1065, map: FIVE_OBJECTS, foes: ["knight", "hallokin", "samurai", "sickle"], boss: "boss",
    talk: ["Five fragments of something ancient have fallen across Vareth. You knew before anyone.", "Your mother's notes describe exactly this: the moment the old system begins to break.", "Retrieve the one that fell here before the Crown does. It is the key to what you are building.", "I must say, you are remarkably calm for a man racing to collect a piece of a god."],
    brief: "Five fragments of the Firstborn's bindings have fallen. Reach the one in the Crownlands before the Crown does, and bring it to the machine you are building.",
    clues: ["artificialMind", "starsAreBindings", "historyIncomplete"], clueText: ["Your creation whispers in a voice you did not teach it. It is learning.", "The fragment pulses in time with the other four. They are one thing, broken.", "Your mother's last page: the Firstborn did not lose a war. They were one system, sundered."],
    secret: "Rubble set in five rings by a careful hand. Someone mapped where the fragments would fall before they fell.",
    effects: [{ measure: 4, amount: 10 }, { measure: 0, amount: -8 }] },
];

// A level is laid out the first time it is asked for, and kept: laying out all twenty takes half a second, which
// nobody who came for the arena should wait for.
const made = new Map<string, Level>();
const make = (brief: Brief) => made.get(brief.id) ?? made.set(brief.id, level(brief)).get(brief.id)!;
/** Every campaign level: each a place of two to three dozen rooms, laid out from its seed and proved crossable (rooms.ts). */
export const allLevels = (): Level[] => BRIEFS.map(make);
/** Whether a protagonist's chapter has a level, without laying it out. */
export const hasLevel = (hero: Hero, chapter: number) => BRIEFS.some((brief) => brief.hero === hero && brief.chapter === chapter);

/** A thin post to hold and kick off: `height` tall, its foot at `base`. */
const post = (cx: number, base: number, height: number): Slab => [cx, base - height / 2, 26, height, "wall"];
/**
 * Where duels are fought, five at a time: six rows of thin ledges over nothing, a jump apart, a few posts to climb
 * and kick off, and room to run. Not a level of any campaign; its sky is drawn afresh for every match (versus.ts).
 */
export const DUEL: Level = {
  id: "duel", hero: "forbidden", chapter: -1, name: "The Ledges", region: "crownlands", theme: "duel", brief: "",
  spawn: { x: 300, y: 600 }, exit: { x: 0, y: -99999 }, span: [-1300, 2500],
  starts: [{ x: -550, y: 600 }, { x: 120, y: 600 }, { x: 480, y: 600 }, { x: 1150, y: 600 }, { x: 1850, y: 600 }, { x: 600, y: 260 }],
  slabs: [
    // The floor is four stretches with gaps to fall through.
    ledge(-550, 680, 620), ledge(300, 680, 760), ledge(1150, 680, 620), ledge(1850, 680, 400),
    ledge(-750, 510, 260), ledge(-150, 510, 300), ledge(600, 510, 340), ledge(1300, 510, 300), ledge(1950, 510, 260),
    ledge(-450, 340, 280), ledge(220, 340, 260), ledge(950, 340, 280), ledge(1650, 340, 280),
    ledge(-700, 170, 220), ledge(-50, 170, 300), ledge(600, 170, 240), ledge(1250, 170, 300), ledge(1900, 170, 220),
    ledge(-350, 0, 260), ledge(300, 0, 220), ledge(900, 0, 220), ledge(1550, 0, 260),
    ledge(-700, -170, 200), ledge(600, -170, 420), ledge(1900, -170, 200),
    // Posts, kept few so that the place stays open: one at each end, running its height, and three short ones inside.
    post(-950, 680, 760), post(2150, 680, 760),
    post(-250, 330, 150), post(1450, 330, 150), post(600, -10, 150),
  ],
  crates: [], ambushes: [], clues: [], effects: [],
};

/** Spikes: a box `w` wide standing on `top` at `x`, that hurts for `dmg`. */
const spikes = (x: number, top: number, w: number, dmg = 12) => ({ x, y: top, w, h: 30, dmg });

// The fights of waves: arenas made for lasting. Foes drop in near the fighter, so each arena gives the fighter what a
// long fight needs: gaps to knock foes out through, spikes to knock them into (which hurt foes as well, outside a
// campaign), high ground and springs to break away from a crowd, crates to throw, and ground uneven enough that no two
// fights look alike. Islands (the arena with no level) are the third; which of the three is the day's is `survivalStage`.

/** A broken bridge between a cliff and a stair down into spikes. */
export const SUNKEN_BRIDGE: Level = {
  id: "sunken-bridge", hero: "forbidden", chapter: -1, name: "The Sunken Bridge", region: "crownlands", theme: "ruin", brief: "",
  spawn: { x: 380, y: 600 }, exit: { x: 0, y: -99999 }, span: [-1450, 2650],
  slabs: [
    // The cliff to fall back on, in two steps, with a wall at its back.
    ground(-1400, -900, 520), ground(-900, -620, 600), post(-1420, 520, 640),
    // The bridge, in three spans, the middle one sagging, over two gaps a foe can be knocked through.
    ground(-620, 20, 680), ground(170, 760, 704), ground(920, 1500, 680),
    // The stair down into the spike trough, and a lip past it with a wall.
    ground(1500, 1800, 740), ground(1800, 2090, 800), ground(2090, 2400, 880), ground(2400, 2620, 760), post(2640, 760, 520),
    // Ledges, uneven: a lookout over the cliff, steps up from the bridge, a high one in the middle, a refuge over the spikes.
    ledge(-1150, 360, 260), ledge(-760, 440, 200), ledge(-300, 500, 240), ledge(470, 520, 280), ledge(760, 330, 230),
    ledge(1210, 510, 260), ledge(1720, 590, 220), ledge(2250, 640, 210),
  ],
  hazards: [spikes(2245, 880, 300)],
  springs: [{ x: 230, y: 704 }, { x: 2510, y: 760 }],
  crates: [[-1100, 490, 50], [420, 672, 56], [1320, 650, 52], [1960, 770, 46], [-450, 650, 44]],
  ambushes: [], clues: [], effects: [],
};

/** A bowl of rock round a drop: two uneven rims, a stepping stone over the drop, and a bridge across the top. */
export const THE_WELL: Level = {
  id: "the-well", hero: "forbidden", chapter: -1, name: "The Well", region: "crownlands", theme: "cavern", brief: "",
  spawn: { x: 200, y: 560 }, exit: { x: 0, y: -99999 }, span: [-260, 2060],
  slabs: [
    // The rims, the left high and the right low, with the drop between; walls at both ends.
    ground(-220, 610, 640), ground(1090, 2020, 720), post(-240, 640, 900), post(2040, 720, 980),
    // Over the drop, a stone to cross by, and a bridge across the top that holds the high ground.
    ledge(850, 560, 190), ledge(850, 120, 380),
    // The left side climbs in tight steps; the right in wide ones.
    ledge(110, 470, 260), ledge(390, 300, 220), ledge(70, 140, 230),
    ledge(1310, 560, 240), ledge(1660, 420, 300), ledge(1290, 270, 220), ledge(1860, 240, 200),
  ],
  // The far corner of the low rim, where a crowd pushes whoever is caught there.
  hazards: [spikes(1925, 720, 150)],
  springs: [{ x: 560, y: 640 }, { x: 1130, y: 720 }],
  crates: [[10, 614, 52], [1510, 694, 56], [1760, 696, 44], [280, 616, 46]],
  ambushes: [], clues: [], effects: [],
};

/** The arenas of the fight of waves; with the islands, one of the three is the day's, the same for everyone that day. */
export const SURVIVAL_STAGES: (Level | null)[] = [null, SUNKEN_BRIDGE, THE_WELL];
/** The arena of the fight of waves for the day `day` (days since 1970, in UTC): the same for everyone, so that the
 *  day's best score is fought for in one place (pro.ts). */
export const survivalStage = (day = Math.floor(Date.now() / 86400000)) => SURVIVAL_STAGES[day % SURVIVAL_STAGES.length];

// Duels: places made to be fair. Up to five fighters start at once, so each place is the same on both sides, its
// starts matched, and it has nothing that moves or breaks: everything in it is where it is in every player's game.
// What it has instead is places worth fighting over, and ways to be knocked off them.

/** Two raised bases facing each other over a sunken floor, with a spike pit in the middle and a ledge over it. */
export const THE_CROSSING: Level = {
  id: "the-crossing", hero: "forbidden", chapter: -1, name: "The Crossing", region: "crownlands", theme: "shrine", brief: "",
  spawn: { x: 800, y: 600 }, exit: { x: 0, y: -99999 }, span: [-800, 2400],
  starts: [{ x: -420, y: 500 }, { x: 2020, y: 500 }, { x: 330, y: 640 }, { x: 1270, y: 640 }, { x: 140, y: 320 }, { x: 1460, y: 320 }],
  slabs: [
    // The bases, raised, each with a gap below its edge to be knocked through; walls behind them.
    ground(-620, -100, 560), ground(1700, 2220, 560), post(-640, 560, 700), post(2240, 560, 700),
    // The sunken floor, in two halves, and the pit between them.
    ground(100, 700, 700), ground(900, 1500, 700), ground(700, 900, 820),
    // Tiers a jump apart, each up and across from the one below (a ledge is solid from beneath): over the floor, then
    // off the bases, over the pit (the ledge everyone wants), and a crown over that.
    ledge(400, 530, 240), ledge(1200, 530, 240),
    ledge(140, 380, 200), ledge(1460, 380, 200), ledge(800, 380, 300),
    ledge(450, 220, 220), ledge(1150, 220, 220), ledge(800, 70, 220),
  ],
  hazards: [spikes(800, 820, 200, 10)],
  springs: [{ x: -330, y: 560 }, { x: 1930, y: 560 }],
  crates: [], ambushes: [], clues: [], effects: [],
};

/** A tower in the middle, climbed by ledges either side of it, between two floors and the islands off them. */
export const THE_SPIRE: Level = {
  id: "the-spire", hero: "forbidden", chapter: -1, name: "The Spire", region: "crownlands", theme: "frost", brief: "",
  spawn: { x: 800, y: 600 }, exit: { x: 0, y: -99999 }, span: [-420, 2020],
  starts: [{ x: 20, y: 640 }, { x: 1580, y: 640 }, { x: 150, y: 460 }, { x: 1450, y: 460 }, { x: -90, y: 280 }, { x: 1690, y: 280 }],
  slabs: [
    // Two floors, open between them but for the spire's foot; walls at the ends.
    ground(-200, 420, 700), ground(1180, 1800, 700), ground(650, 950, 760), post(-220, 700, 820), post(1820, 700, 820),
    // The spire: ledges up its middle, right and left in turn, each up and across from the last (a ledge is solid
    // from beneath, so none is right over another's climber), to a top only one can hold.
    ledge(900, 600, 170), ledge(700, 450, 170), ledge(900, 300, 170), ledge(700, 150, 170), ledge(800, 20, 240),
    // The islands off each floor, matched.
    ledge(150, 520, 260), ledge(1450, 520, 260), ledge(-90, 340, 180), ledge(1690, 340, 180), ledge(300, 170, 220), ledge(1300, 170, 220),
  ],
  // Either side of the spire's foot.
  hazards: [spikes(690, 760, 90, 10), spikes(910, 760, 90, 10)],
  springs: [{ x: 360, y: 700 }, { x: 1240, y: 700 }],
  crates: [], ambushes: [], clues: [], effects: [],
};

/** The places of duels; a room's round is fought in one of them, the same for every player in it (versus.ts). */
export const VERSUS_STAGES: Level[] = [DUEL, THE_CROSSING, THE_SPIRE];

/** The level of a protagonist's chapter, if it has been built. */
/** A chapter's id and name, without laying the level out (co-op's table lists them: Coop.tsx). */
export function chapterOf(hero: Hero, chapter: number) {
  const brief = BRIEFS.find((each) => each.hero === hero && each.chapter === chapter);
  return brief && { id: brief.id, name: brief.name, hero, chapter };
}
/** A chapter's id and name by its id, without laying the level out. */
export function chapterById(id: string) {
  const brief = BRIEFS.find((each) => each.id === id);
  return brief && chapterOf(brief.hero, brief.chapter);
}
/** The level a co-op group has been told to play, by its id (coop.ts). */
export function levelById(id: string) {
  const brief = BRIEFS.find((each) => each.id === id);
  return brief && levelOf(brief.hero, brief.chapter);
}
export function levelOf(hero: Hero, chapter: number) {
  const brief = BRIEFS.find((each) => each.hero === hero && each.chapter === chapter);
  return brief && make(brief);
}

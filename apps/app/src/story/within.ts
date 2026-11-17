// spec/app/index.md, "Story: Play a level of a campaign"
// The black room a protagonist stands in after it has answered what a chapter asked of it: where it is told why that
// answer made the power it now has, is told to use it, and sees it. One reason for each special of each school
// (parley.ts, DILEMMAS: judgement for Ink, wrath for Ember, letting go for Tide, the quick cut for Volt, shelter for
// Moss), by the fighter whose special it is and which of its three.
import type { Level } from "../game/levels.ts";
import type { Hero } from "./canon.ts";
import { PROTAGONISTS } from "./canon.ts";

export const WHY: string[][] = [
  [ // Ink: judgement
    "You passed sentence. A sentence is a straight line from the one who judges to the one judged, and nothing turns it aside. That line is in you now.",
    "You weighed it, and you ruled. A ruling does not fall on one head only. It falls on everyone it names. What you carry now finds each of them.",
    "You held to the law when it cost you. A law is not aimed. It goes out from the one who keeps it, evenly, in every direction, and whatever stands too near is moved.",
  ],
  [ // Ember: wrath
    "You answered with fire. Anger that is let out does not stay where it is put. It walks, and where it walks the ground stands up and burns.",
    "You let it burn. Wrath kept that long gathers into one thing, slow and heavy and very hot, and it does not stop for what is in its way.",
    "You chose the fire again. By now it does not come from you. It comes from under you, and the earth agrees.",
  ],
  [ // Tide: letting go
    "You let go. One who holds nothing cannot be held. You will pass through them the way you passed through that moment: gone before the hand has closed.",
    "You gave it up and trusted the current. What is released does not vanish. It goes out, turns, and comes back by a way nobody was watching.",
    "You let all of it go, and found what is left when nothing is held: a stillness that everything else falls toward.",
  ],
  [ // Volt: the quick cut
    "You did not wait. A choice made that fast leaves a mark like a blade's: thin, bright, and already past by the time it is seen.",
    "You cut, and moved on. One who decides at speed decides many things at once. They go out from you together, like sparks from one blow.",
    "You struck first, again. Speed like that stops being yours. The sky has started doing it for you.",
  ],
  [ // Moss: shelter
    "You stood between. One who shelters others learns to make the wind go round them. Now it goes round you, and carries off whatever came to do harm.",
    "You stayed, and kept them. What grows around a thing that is guarded grows thorns. They are yours now, and they fall where you say.",
    "You would not leave them alone. So you will not be alone either. What you have protected stands up beside you, in your own shape.",
  ],
];

/** The room: a floor in the dark, shut in at both ends, with three figures standing in it to try the power on. Nothing in it leads out. */
export const within = (hero: Hero): Level => ({
  id: `${hero}-within`, hero, chapter: 0, name: "Within", region: PROTAGONISTS.find((p) => p.id === hero)!.start, brief: "",
  spawn: { x: 620, y: 630 }, exit: { x: -9000, y: -9000 }, span: [0, 2000],
  slabs: [[1000, 700, 2000, 40, "ground"], [-20, 0, 40, 1500, "wall"], [2020, 0, 40, 1500, "wall"]],
  crates: [], clues: [], effects: [],
  ambushes: [{ at: 0, zone: [0, -2000, 2000, 2000], foes: [{ x: 1080, y: 636 }, { x: 1280, y: 636 }, { x: 1480, y: 636 }] }],
});

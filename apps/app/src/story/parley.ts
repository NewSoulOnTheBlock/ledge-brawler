// spec/app/index.md, "Story: Play a level of a campaign"
// What a level's boss says when the fighter reaches its room, before the fight: who it is, and the next thing the
// protagonist learns about what the Crown takes, where it goes, and what it is holding down. By level id (levels.ts).
import type { SpecialDef } from "../game/data.ts";
import { CHARS } from "../game/data.ts";
import type { Hero } from "./canon.ts";

export const PARLEY: Record<string, { who: string; lines: string[] }> = {
  "forbidden-1": { who: "The Gate-Captain of Blackspire", lines: ["Fourteen years I opened this gate for you, Executioner. Tonight my orders are to close it.", "They do not want your head. They want the sword, and what the old man poured into it.", "Hand it over and you may yet be forgotten. No? Then I will take it from what is left of you."] },
  "forbidden-2": { who: "The Blind Huntress", lines: ["Stop breathing so loudly. I have followed that sound across nine roofs.", "The Crown pays double for you alive. It says the thing in your sword dies with the one who carries it.", "So I will only break your legs. Hold still."] },
  "forbidden-3": { who: "The Knight-Reader", lines: ["You are late. I have the list in my hand: every name you were too soft to end.", "Do you know what they are, the ones you spared? They carry it too. That is why you were sent to them.", "The Crown does not execute criminals. It harvests. And you have left it a field."] },
  "forbidden-4": { who: "The Keeper of the Lowest Shelf", lines: ["Executioner. Your ledger is the longest in this room. I have read it many times.", "Each sentence, a measure of essence, poured into steel and sent north in chains. You never asked where.", "The old man knew. That is why he gave himself to your blade and not to mine. Give him back."] },
  "forbidden-5": { who: "The Chainwarden", lines: ["The procession does not stop. Not for the dying, and not for you.", "They are going to the Binding. It is failing, and it is fed with what the Crown takes.", "You carry more than any of them. Walk to the wagons yourself, or be loaded on."] },
  "ember-1": { who: "The Officer of the Order", lines: ["You are from the town. I can smell the smoke on you. I am sorry for it.", "The order is sealed by the Crown itself. Cinderfall is not to be taken. It is to be ended, tonight.", "Something sleeps under this ground, and the Crown would rather burn a town than wake it. Stand aside."] },
  "ember-2": { who: "The Sunken Sentinel", lines: ["You came back down. They always do, the ones it carries out.", "It took a memory for the fire it gave you. You held someone that night. I watched you let go.", "Beat me, and I will tell you the name you sold. Lose, and it keeps the rest of you."] },
  "ember-3": { who: "The Garrison Commander", lines: ["So you are the rumour. I expected someone taller, and less on fire.", "Break this garrison and the Reach will rise. The Crown wants that. A rising gives it a reason to send the legions.", "You are being used, rebel. So am I. Let us at least do it well."] },
  "ember-4": { who: "The Crown's Blessing", lines: ["Kneel, Saint of Ashes. They have built you a shrine, and I am its blessing.", "A saint gives the people someone to pray to instead of someone to follow. That is all the Crown wants of you.", "Tear it down, and they will only paint you again. Unless there is nothing left to paint."] },
  "ember-5": { who: "The Chained One", lines: ["Fire. I remember fire. It was mine before it was yours.", "The thing that carried you out of Cinderfall is my kin. The Crown chains us where it finds us, and feeds us to the Binding.", "Break my chain and I will not thank you. Kill me, and it will know. Choose."] },
  "exile-1": { who: "The Gate Master", lines: ["Nine bells, and you are the ninth name. I taught you too well to be surprised that you ran.", "Every year the best nine are given to the mountain. Their strength goes into the bells. That is what keeps the dead under the ice.", "I will not let you pass. But I will not be sorry if you do."] },
  "exile-2": { who: "The Blind Huntress", lines: ["Two blades, pulling apart. I heard them arguing before I heard you.", "They were one sword once. The monastery broke it, because whole it could cut what holds the bells together.", "The monks pay for the runaway. I think I will sell them the swords instead."] },
  "exile-3": { who: "The Toll Knight", lines: ["The road north is the monastery's. Every village on it pays in children. You were one of the payments.", "The two who offered you shelter? One of them sent word to me. Think on which, if you live.", "Turn back and ring your bell, student. The winter is kinder than I am."] },
  "exile-4": { who: "The First to Thaw", lines: ["You carry the sword that put us here. Both halves. I know its voice.", "We were not defeated. We were kept: an army under ice, to be spent when the Binding fails.", "It is failing now, and I woke first. Stay, and you may ask the others when they rise."] },
  "exile-5": { who: "The Bellkeeper's Echo", lines: ["He is gone, and he left me in his place: his voice, and his last lesson.", "The Crown took the records. The name of every student given to the bells. It means to ring them all at once.", "He wrote that you should mend the sword. Then he told me to make certain you are strong enough to carry it."] },
  "hollow-1": { who: "The One Left in Your Place", lines: ["You are wearing my face. No. I am wearing yours. It left me here when it took you back.", "The children are still asking for the healer. I have been answering. I do not know the medicines.", "Only one of us walks out of this marsh. It told me so. Did it not tell you?"] },
  "hollow-2": { who: "The Huntress Who Does Not Know", lines: ["Another caller for the Witness. It has so many. I guard its door and I do not tire.", "You agreed to bring it last memories. Read the rest: when you have brought a thousand, yours is the last.", "Why do you look at me that way? I am not dead. I would have noticed."] },
  "hollow-3": { who: "The Gravewarden", lines: ["You carry a thousand, and you would lay them here? This ground is full. It has been full since the Binding.", "Nothing buried in Vareth rests. It is drawn down, and used. I keep the gate so that no more go.", "Take your dead elsewhere, healer. Or stay with them. There is room for one who is only half gone."] },
  "hollow-4": { who: "The Voice of the Drowned", lines: ["You heard it. All of us, one sentence. Say it back, so that I know.", "\"It is waking, and it remembers who bound it.\" That is what the dead are saying. We were the binding.", "The Reaper does not know. Nobody tells him. Go and tell him, if you can get past what the water made of me."] },
  "hollow-5": { who: "What the Marsh Remembers", lines: ["Your brother is here, watching. And the dead in you remember what he did the night you died.", "They want him. A thousand voices, and tonight they have one wish. I am that wish, given a body.", "Stand between us, healer, and find out how much of you is still yours."] },
  "architect-1": { who: "The New Steward", lines: ["The bastard prince. The inventory lists you between the silver and the hounds.", "This household has been bought by people who do not keep spare heirs. A king's blood is useful to them only in a jar.", "Your mother's order asked after you. They were told you had died. Let us make that true."] },
  "architect-2": { who: "The Library's Last Reader", lines: ["You have her hand. I taught her to write. I did not teach her to hide things from me.", "The engine makes power without the dead. Read the last page: it makes it from the living instead, slowly.", "She built it anyway. So will you. That is why nobody leaves this library with the plans."] },
  "architect-3": { who: "The Mercenary Captain", lines: ["You walked in alone, with an argument. I respect that. I do not respect it enough to follow it.", "The nobles want a king they can steer. I want a wage. You want a machine. Only one of us is honest.", "Beat me in front of my company and they are yours. It is the only vote we hold."] },
  "architect-4": { who: "The Breath Beneath Blackspire", lines: ["Small architect. You drew a riot. Someone else drew the fire, and aimed it at me.", "I am one of five things that hold the old sleeper down. Burn me away, and a corner of its cage comes loose.", "You did not plan this. But you will profit from it. I can see that in you already."] },
  "architect-5": { who: "The Fragment's Warden", lines: ["It fell here, and I fell with it. I was its lock. I am still its lock.", "Five bindings, five fragments. Gather them and you may remake the cage, or open it. Your machine does not care which.", "The Crown is an hour behind you. Convince me that you are the lesser harm."] },
};

// What a protagonist is asked when it finishes each of its first three chapters: something that has no good answer.
// Each answer is in the spirit of one fighter's school (judgement for Ink, wrath for Ember, letting go for Tide, the
// quick cut for Volt, shelter for Moss), and the special learned is that school's. The player is not told which until
// it has answered.
export const DILEMMAS: Record<string, { ask: string; answers: { school: number; say: string }[] }> = {
  "forbidden-1": { ask: "The Gate-Captain lies beaten at the gate he opened for you for fourteen years. The rope of the alarm bell is in his hand.", answers: [
    { school: 0, say: "Execute him. He is an officer of the Crown and he raised his blade. The sentence is what it always was." },
    { school: 1, say: "Burn the gatehouse with the bell in it. Let Blackspire see who is leaving." },
    { school: 2, say: "Take the rope from his hand and leave him breathing. He will be punished for it, and you both know that." },
    { school: 3, say: "Cut the rope and run. Every moment spent on him is one the hunters gain." },
  ] },
  "forbidden-2": { ask: "The Huntress is down. She says a family on the roofs sheltered you tonight, and the Crown already knows which.", answers: [
    { school: 3, say: "Reach them first, move them tonight, and leave their home burning so that nobody looks for them." },
    { school: 0, say: "Keep climbing. The sword has to leave the city. That is the only duty left." },
    { school: 2, say: "Send the Huntress to warn them, and trust a woman you have just beaten to keep her word." },
    { school: 1, say: "Go back and stand at their door. Let the knights come and find you waiting." },
  ] },
  "forbidden-3": { ask: "You hold the list of everyone you spared. The Knight-Reader made a copy, and it is already on a rider.", answers: [
    { school: 2, say: "Give the list to the spared themselves, and let them decide who runs and who hides." },
    { school: 1, say: "Burn it. With no list there is no map, and they scatter with no way to find each other again." },
    { school: 3, say: "Chase the rider, and leave the undercroft and everyone in it to fend for themselves." },
    { school: 0, say: "Keep it. Someone must know their names, and judge what they have become." },
  ] },
  "ember-1": { ask: "The officer is beaten and the order is in your hand. Cinderfall is already burning. The soldiers are still in its streets, and so are its people.", answers: [
    { school: 1, say: "Hunt the soldiers through the fire. Nobody who lit this leaves." },
    { school: 4, say: "Forget the soldiers. Go from door to door and carry out whoever can still be carried." },
    { school: 3, say: "Take the order and ride for the next town on its list before the ink is dry." },
    { school: 2, say: "Let the soldiers go. Tell them to run, and to say what they saw." },
  ] },
  "ember-2": { ask: "The Sentinel offers you the name you sold. The price is the fire that carried you out.", answers: [
    { school: 2, say: "Take the name and let the fire go, whatever that makes of you." },
    { school: 1, say: "Refuse. Keep the fire. A name cannot fight for the Reach." },
    { school: 4, say: "Ask instead that this bargain is never offered to anyone again, and pay what that costs." },
    { school: 3, say: "Take neither. Strike the thing under the ground while it is busy bargaining." },
  ] },
  "ember-3": { ask: "The garrison is yours. Its commander is alive, and says the rising you have started is what the Crown wanted.", answers: [
    { school: 3, say: "March on the second garrison tonight, before word of this one arrives." },
    { school: 4, say: "Stop here. Hold this ground, feed these people, and let the Reach decide whether it rises." },
    { school: 1, say: "Hang her from her own gate, where the other garrisons can see." },
    { school: 2, say: "Let her walk out with her wounded. Mercy travels faster than fear." },
  ] },
  "exile-1": { ask: "Your teacher kneels at the gate. Eight other names are still on the roll, asleep in the dormitory behind you.", answers: [
    { school: 3, say: "Go. You cannot carry eight down a mountain, and the bells are already ringing." },
    { school: 4, say: "Go back for them, all eight, and lose the night's head start." },
    { school: 0, say: "Make him ring the ninth bell himself and say aloud what it is for, so that they hear it." },
    { school: 1, say: "Break the bells. If the dead under the ice wake, let the monastery answer for it." },
  ] },
  "exile-2": { ask: "The place where the sword was parted is under your feet. Whole, it can cut what holds the bells together, and what the bells hold down.", answers: [
    { school: 0, say: "Mend it, and swear on it to draw it only when someone else has judged the cause." },
    { school: 1, say: "Mend it, and go back up the mountain." },
    { school: 4, say: "Leave it in two, and carry the halves apart so that no one hand ever holds it." },
    { school: 3, say: "Mend it now. A weapon that can end this should not wait." },
  ] },
  "exile-3": { ask: "The Toll Knight is down. Both strangers who offered you shelter are at the fire, and one of them sold you.", answers: [
    { school: 4, say: "Stay with both. One of them is honest, and will need you when the knights come back." },
    { school: 3, say: "Leave both tonight. Trust is a thing you cannot afford on this road." },
    { school: 1, say: "Tell the village what the monastery takes from it, and let the road burn behind you." },
    { school: 0, say: "Put the sword on the table, ask each of them, and judge by what you hear." },
  ] },
  "hollow-1": { ask: "The thing wearing your face is beaten. The children in the marsh still think it is you, and it has been kind to them.", answers: [
    { school: 4, say: "Let it stay with them. They need a healer more than they need the truth." },
    { school: 0, say: "End it. A false thing at a child's bedside is a sentence waiting to fall." },
    { school: 2, say: "Take it into yourself, with the dead you already carry, and tell the children goodbye." },
    { school: 1, say: "Burn the marsh house where it nested, so that nothing like it grows there again." },
  ] },
  "hollow-2": { ask: "The Huntress still does not know she is dead. The Witness's door stands open behind her.", answers: [
    { school: 2, say: "Take her last memory gently, as you agreed, and carry her with the others." },
    { school: 1, say: "Tear up what you agreed to in front of the Witness, and see what it does." },
    { school: 4, say: "Say nothing. Let her keep her post, and her peace." },
    { school: 0, say: "Tell her plainly. The dead are owed the truth, whatever it does to them." },
  ] },
  "hollow-3": { ask: "The burial ground is full, and what is buried in Vareth is drawn down and used. The thousand you carry are forgetting which of them you are.", answers: [
    { school: 0, say: "Lay them down anyway. The dead belong in the ground, and the rite is the rite." },
    { school: 4, say: "Keep carrying them. Better lost in you than used by whatever is below." },
    { school: 1, say: "Break the Gravewarden's gate, and let everything held here go wherever it goes." },
    { school: 2, say: "Let them go one at a time, each by its own name, until you are alone." },
  ] },
  "architect-1": { ask: "The steward is down and the house is waking. The servants who hid you for years will be questioned by morning.", answers: [
    { school: 2, say: "Slip away alone. Anyone you take with you is someone they can follow." },
    { school: 4, say: "Take the servants with you, all who will come, and be slow because of it." },
    { school: 3, say: "Take the steward's ledger and seal. You will need leverage more than friends." },
    { school: 0, say: "Leave a signed confession that you acted alone, and let it be read." },
  ] },
  "architect-2": { ask: "The plans are in your hands. The last page says the engine spares the dead by drawing on the living instead, slowly.", answers: [
    { school: 3, say: "Build it at once, small, and learn what it costs by paying it yourself." },
    { school: 0, say: "Copy the last page and send it to every faction. Let Vareth judge it with open eyes." },
    { school: 2, say: "Take the plans, and tell no one about the last page." },
    { school: 4, say: "Seal the library, and leave the plans inside it." },
  ] },
  "architect-3": { ask: "The company is yours, and the nobles are waiting to hear what you will do with it. One word from you starts a war.", answers: [
    { school: 4, say: "Send the company to guard the villages along the road first, and make the nobles wait." },
    { school: 2, say: "Promise each noble what he wants to hear, and keep none of it." },
    { school: 0, say: "Tell them the truth: that you mean to end the Crown, the Church and their houses alike." },
    { school: 3, say: "March on the capital tonight, before anyone can change sides." },
  ] },
};

// How a protagonist answers a boss before the fight, and what that boss says back: each boss is spoken to in its own
// words, by level. To defy it is to make it angrier, to reason with it is to take some of the fight out of it
// (sim.ts, `answer`), and saying nothing leaves it as it was. Which was chosen is kept, by level, for the saga's end.
export type Stance = "defied" | "reasoned" | "silent";
const REPLIES: Record<string, { defied: [say: string, back: string]; reasoned: [say: string, back: string]; silent: string }> = {
  "forbidden-1": { defied: ["You opened it for fourteen years. Open it once more, or I go through you.", "There he is. The Crown's knife. I wondered whether the old man had blunted you."], reasoned: ["You have seen who they send me to kill. You know what this sword is evidence of.", "I know. I have known for years, and kept the gate anyway. I will not make this easy. But I will not make it clean, either."], silent: "No last words. You never had any for them, either. Come on, then." },
  "forbidden-2": { defied: ["You heard me across nine roofs. Then you heard what I did to the last one they sent.", "I did. He screamed in a lower key than you will."], reasoned: ["The Crown pays you to bring it people. Ask, once, what happens to them after you are paid.", "I never asked. That is how one stays paid. Do not make me start asking in the middle of a job."], silent: "Quiet now? Too late. I already have your heartbeat." },
  "forbidden-3": { defied: ["Then I will take the list from your hand, and the hand with it.", "Spoken like the man who wrote half of these names in the first place."], reasoned: ["You have read it. You know they are farmers and midwives. Burn it with me.", "Midwives carrying what could level a town. I have read it more closely than you. But my hand is not as steady as it was a page ago."], silent: "Nothing to say for them? You said nothing at their sentencing, either. I have the transcripts." },
  "forbidden-4": { defied: ["He chose my blade over your shelf. He stays chosen.", "Everything is shelved in the end, Executioner. I am patient. I am also very large."], reasoned: ["You have counted every measure they took. You of all things know it was never justice.", "I do not judge the entries. I only keep them. It is a long time since anyone asked what I thought of them."], silent: "Silence. Good. This is an archive." },
  "forbidden-5": { defied: ["Your procession stops here. I am what stops it.", "One man. I have chained things that ate men like you."], reasoned: ["They are emptied already. There is nothing left in them to feed it. Let them go home to die.", "There is a little left. There is always a little. But I will count slowly while we do this."], silent: "No plea? Then you understand what you are. Cargo." },
  "ember-1": { defied: ["Keep your sorry. Give me the order, or I take it off what is left of you.", "That is the answer I would have given at your age, with my town behind me."], reasoned: ["You said you were sorry. Then you know. Put the order down and help me get them out.", "If I put it down they send another officer, and hang me beside you. But I will not call for my reserves."], silent: "You have nothing to say to me. No. I would not, either." },
  "ember-2": { defied: ["I did not come down here to bargain twice. Move, or burn.", "It gave you that fire. Mind how you spend it on its own doorstep."], reasoned: ["You watched, and you remember. Then you are the only one who does. Tell me freely.", "Freely is not a word that is used down here. But I will fight you the way one fights a guest."], silent: "Did it take your tongue as well? No. Only your reasons." },
  "ember-3": { defied: ["Then I will be used to break your walls. Count your soldiers while you can.", "I have. Fewer than this morning. You are very good at this, and it is going to get everyone killed."], reasoned: ["If we are both being used, open the gate. Give them no battle to point at.", "And hang for it by nightfall. Still. I will leave the east door unbarred. See that your people find it."], silent: "Not a word. They told me you made speeches." },
  "ember-4": { defied: ["I will show them what a saint does to a shrine.", "Yes. Rage. They will paint that too, and it will look like a halo."], reasoned: ["You were made to bless this. Someone made you. Ask them why they needed me harmless.", "I was not made to ask. It itches, the asking. You have put something in me."], silent: "Silent as an icon already. How well it suits you." },
  "ember-5": { defied: ["Your kin took my memory. I will take it out of you.", "Good. Hate is a fire too. Bring it closer."], reasoned: ["I will break the chain. Not for thanks. Because I know what it is to be kept.", "You would. Then strike the chain and not me, if you can tell us apart. I will not hold still. I have forgotten how."], silent: "It taught you silence. It taught me that as well. Look what it made." },
  "exile-1": { defied: ["You taught me every form you are about to use. I am not afraid of my own lessons.", "I taught you all but one. Every master keeps one."], reasoned: ["You said you would not be sorry. Then stand aside, and be glad instead.", "I swore on those bells before you were born. I cannot stand aside. I can be slow."], silent: "No word for your teacher. Good. You were always at your best when you stopped explaining." },
  "exile-2": { defied: ["Come and take them. They do not like strangers' hands.", "Nothing likes my hands. Things get used to them."], reasoned: ["Sell them, and the monastery mends what you bring. You will hear the bells stop, and then what was under them.", "I hear a great deal that I do not mention. Do not make me mention that."], silent: "The swords are louder than you are. Both of them are afraid." },
  "exile-3": { defied: ["I was a payment. Consider this the debt collected.", "A student with a grievance. This road is paved with them."], reasoned: ["You take children for a toll. You have seen where they go. How many have you seen come back?", "None. I stopped counting the winter my daughter was born. Do not speak of this again. Draw."], silent: "Nothing? They beat the talk out of you up there. They do good work." },
  "exile-4": { defied: ["The sword put you down once. It remembers how.", "So do I. I have had a very long time to think about that stroke."], reasoned: ["You were kept to be spent. I was raised to be spent. We have the same quarrel, and it is not with each other.", "That is the first thing anyone has said to me in four hundred years. I cannot stop. But I will remember it."], silent: "You stand like the ones who buried us. Quiet, and certain." },
  "exile-5": { defied: ["Tell him I am done being examined.", "He said you would say that. He said: then examine him anyway."], reasoned: ["If he wants the sword mended, he wants the bells ended. Say that plainly, in his voice.", "He could never say it plainly. That is why he left an echo and not a letter. He wants them ended. There."], silent: "He taught you that silence. He was proud of it." },
  "hollow-1": { defied: ["It is my face. Take it off.", "I have worn it at more bedsides than you have this year. Come and see whose it is."], reasoned: ["You stayed with them when I could not. I am not here to end you. Come with me.", "With you. Into you. I would like that. It will not let me come gently."], silent: "You look at me the way the children look at the dark. I learned that look from you." },
  "hollow-2": { defied: ["You are a corpse guarding a door. Step off it.", "People say such things when they are afraid. I forgive you. Draw."], reasoned: ["When did you last eat? Or sleep? Or feel the cold out here? Think.", "I do not remember. I do not remember. Stop asking. I have a post to keep."], silent: "You are very quiet. So is everyone who comes here. I had not wondered why." },
  "hollow-3": { defied: ["They are tired, and I am tired. Open the gate, or I will bury them through you.", "Then you will be burying them into a mouth. Very well. I have stopped better grief than yours."], reasoned: ["Then we want the same thing. Help me find them ground that nothing is feeding on.", "There is none. I have looked for longer than your order has existed. But nobody has offered to look with me before."], silent: "No prayers? Good. Prayers go down, here. Everything goes down." },
  "hollow-4": { defied: ["I will carry your sentence. I will not carry you. Stand down.", "The water does not stand down. Neither does what it has made. I am sorry. I am not."], reasoned: ["Then say it through me. Come up out of the water and be heard properly.", "You would take us in. All of this city. You could not hold us. But you asked. Nobody asks."], silent: "You say nothing. Then you are listening. Good. Listen while we do this." },
  "hollow-5": { defied: ["They are my dead, and I say no. You do not touch him.", "Yours? Ask them. Go on. Ask them whose they are tonight."], reasoned: ["He was a boy, and frightened, and I am the one he failed. I forgive him. Let that be heard in there.", "Some of them heard. Not enough. But there is less of me than there was. Come, then."], silent: "You will not speak for him. Some of them noticed. They are glad." },
  "architect-1": { defied: ["Amend your inventory. One steward, missing.", "Wit. They told me you had been taught nothing. Someone has been negligent."], reasoned: ["The people who bought this house will sell you as easily as they bought me. I can pay better, later.", "Later. A bastard's coin. How much later? No. Do not tell me. I have my orders."], silent: "Silent, like the rest of the furniture." },
  "architect-2": { defied: ["She outgrew you. So have I. Stand away from the shelf.", "She said that too, in this room, in that tone. Look where it took her."], reasoned: ["You read the last page and kept the book. You wanted someone to finish it carefully. Let that be me.", "Carefully. That is the word I never dared write in her margin. I will still test you. But I will be watching how you take it."], silent: "She used to go quiet like that, before she did something I could not undo." },
  "architect-3": { defied: ["Then watch closely. I only mean to do this once.", "Ha. There is a wage-earner in you after all."], reasoned: ["You want a wage. I can show you the ledgers of every noble who means to stop paying it.", "Now that is an argument. I will still have to be beaten, for the look of it. I will not make it last."], silent: "No speech? From you? The company will be disappointed. They had bets." },
  "architect-4": { defied: ["Then I will see to it that nobody profits. Back under the stone.", "You lit the way to me yourself. Do not be angry at the fire for showing you what you are."], reasoned: ["I did not aim it at you. Tell me who did, and I will put this out.", "Someone who has read the same books as you, in the same hand. Put it out if you can. I will not help you. I will not hinder you as much as I might."], silent: "No clever answer. The first honest thing you have done tonight." },
  "architect-5": { defied: ["I do not need to convince a lock. I need to open it.", "Every thief says so. I have been a lock for a very long time."], reasoned: ["I am not the lesser harm. I am the one who will tell you afterwards what was done with it. The Crown will not.", "An honest answer, from a man like you. It cost you something to give it. I will make you earn the rest, but I have decided what I hope."], silent: "You do not argue. An hour ago I would have said that was impossible, for you." },
};
/** What can be said to the boss of the level `id`, and what it says back to each. */
export function repliesOf(id: string): { how: Stance; say: string; back: string }[] {
  const to = REPLIES[id];
  return to ? [
    { how: "defied", say: `Defy. "${to.defied[0]}"`, back: to.defied[1] },
    { how: "reasoned", say: `Reason. "${to.reasoned[0]}"`, back: to.reasoned[1] },
    { how: "silent", say: "Say nothing.", back: to.silent },
  ] : [];
}
const stances = (): Partial<Record<Hero, Record<string, Stance>>> => { try { return JSON.parse(localStorage.getItem("stances") ?? "{}") as Partial<Record<Hero, Record<string, Stance>>>; } catch { return {}; } };
/** Keeps how `hero` answered the boss of the level `id`. */
export function stand(hero: Hero, id: string, how: Stance) { try { localStorage.setItem("stances", JSON.stringify({ ...stances(), [hero]: { ...stances()[hero], [id]: how } })); } catch { /* Private browsing may refuse: it is not kept. */ } }
/** How many bosses `hero` has answered each way. */
export function stoodBy(hero: Hero) { const all = Object.values(stances()[hero] ?? {}); return { defied: all.filter((how) => how === "defied").length, reasoned: all.filter((how) => how === "reasoned").length, silent: all.filter((how) => how === "silent").length }; }

// What came of each answer, by the level it was given after and the school of the answer: the Reaper says it where the
// next chapter starts, so that what was chosen is met again.
export const ECHOES: Record<string, Record<number, string>> = {
  "forbidden-1": { 0: "The Gate-Captain is with me now. He asked whether you hesitated. I told him the truth: you did not. His men found him at dawn, and they are no longer hunting a deserter. They are hunting a murderer.", 1: "Blackspire burned until morning. Half the city saw it, and the other half has been told. The Crown could have hidden your escape. You did not let it.", 2: "The Gate-Captain lived. They flogged him at his own gate for letting you pass, and he did not give them your road. Someone paid for your mercy. Remember him.", 3: "You gained an hour at the gate, and the Gate-Captain used it too. He gave the hunters your face before the bell could. He was always good at his work." },
  "forbidden-2": { 0: "The family that sheltered you came to me in the night, all four. They were not angry. They asked whether the sword got out. I said it did.", 1: "You stood at their door, the knights came, and you are still standing. The roofs are telling it already: the executioner guards a door now.", 2: "The Huntress kept her word. She warned them, and then told the Crown she had lost you. She listens for you still, but not for them.", 3: "The family from the roofs is alive, and homeless, and cursing your name in a cellar across the river. Both of those are your doing." },
  "forbidden-3": { 0: "You kept the list. You read it at night; I have seen you. You are judging them again, and you have not noticed.", 1: "With the list burned, the spared are scattered and alone. The Crown has found two of them anyway. Nobody was near enough to warn them.", 2: "The spared chose for themselves. Some ran. Some stayed and armed. One sold the rest for a pardon. That is what choosing looks like.", 3: "You caught the rider. The undercroft you left was emptied while you rode. I counted eleven. You know some of their names." },
  "ember-1": { 1: "No soldier walked out of Cinderfall. Neither did the people you ran past to reach them. I had a long night.", 2: "The soldiers you let run have told everyone what they saw. Half of them say a monster and half say a saint. Both are useful to somebody.", 3: "The next town on the order was warned in time, and stands. Cinderfall does not. You chose the living you could not see over the dying you could.", 4: "You carried eleven out of Cinderfall. The soldiers you left alive carried the story to the garrison. They call you a healer there. They will learn." },
  "ember-2": { 1: "You kept the fire. The name is gone for good now; even I cannot give it back. It was your sister's. I should not have told you that.", 2: "You have the name again, and no fire that is not your own. You say it in your sleep. The Furnace is patient. It thinks you will come back.", 3: "You struck it in the middle of its bargain, and it bled something that was not blood. It is afraid of you now. Frightened things are not safer.", 4: "It agreed. No one else will be offered what you were. It took your singing voice in payment. You had not used it since Cinderfall." },
  "ember-3": { 1: "The commander is with me. She says to tell you she was right. The other garrisons saw her on the gate, and have stopped taking prisoners.", 2: "The commander walked out with her wounded. Three of her soldiers deserted to you on the road. She let them.", 3: "The second garrison fell before it knew the first had. The Reach calls it a miracle. The Crown calls it a reason.", 4: "You held your ground and fed them. The Reach did not rise. It settled. It is the first quiet week I have had there in a year." },
  "exile-1": { 0: "The whole dormitory heard your teacher say what the ninth bell is for. The masters have locked it since. Locks hold students. They do not hold what students know.", 1: "Two bells are cracked. Under the ice, something turned over in its sleep. I felt it. So did the Bellkeeper.", 3: "The eight you left were told you abandoned them. Seven believe it. The eighth has started asking the masters questions.", 4: "You brought five of the eight down the mountain. Three would not leave. The five slow you, and the bells follow the noise." },
  "exile-2": { 0: "The sword is whole and your oath is on it. It pulls less now. I think it approves, which worries me more than when it argued.", 1: "You went back up the mountain with the sword whole, and found the gate shut and the walls manned. You came down again with a new scar and the same question.", 3: "The sword is whole. Every bell in the North rang once when it joined, with no hand on the rope. They know.", 4: "You carry one half and have hidden the other. The half you carry leans toward its twin every night. So will everyone who wants it." },
  "exile-3": { 0: "You judged by what you heard, and you judged right. I was a little surprised. The liar is walking south without a horse.", 1: "The village knows what the monastery takes. It burned the toll house. The monastery will send more than a knight next time.", 3: "You left them both at the fire. The knights came back in the morning. One of the two was honest, and I have met them since.", 4: "You stayed with them both. The one who sold you has not slept since. The honest one has not noticed. I will still not tell you which is which." },
  "hollow-1": { 0: "You ended it, and the children watched their healer kill their healer. They do not ask for you now.", 1: "The marsh house is ash. The children were moved to the village, where there is no healer at all. Nothing will nest there again.", 2: "It is in you with the others. It keeps asking after the children. It is the gentlest voice you carry.", 4: "The thing with your face is still at the bedsides. A child got better yesterday. I do not know whether it healed her or she simply believed." },
  "hollow-2": { 0: "You told her. She stood very still, and then she came to me herself, walking. Few do. She said to thank you, and I think she meant it.", 1: "The Witness watched you tear up its contract and did nothing. It does not understand refusal. It is still counting what you owe.", 2: "The Huntress is among your dead. Her last memory was of a kill she was proud of. She is not sorry, and she is loud.", 4: "The Huntress is at her post. Travellers say a blind woman on the marsh road shares her fire. She is happier than most of my living." },
  "hollow-3": { 0: "You laid them in ground that was full. By morning the graves were hollow. Whatever is under Vareth has a thousand more now.", 1: "The burial ground is open. Things walked out of it that were not yours. Some of them went looking for their homes.", 2: "You let them go one by one. It took all night. You are lighter, and very quiet. It is strange to hear only one voice from you.", 4: "You carry them still. Yesterday you answered to a dead man's name and did not notice for an hour." },
  "architect-1": { 0: "They read your confession aloud in the yard. The servants were spared. Your name is on a warrant now, in your own hand.", 2: "The servants were questioned. They knew nothing, because you told them nothing. Two were dismissed. None died. A clean result, by your arithmetic.", 3: "The steward's ledger has already opened two doors. The servants were questioned with nobody to speak for them. One did not come back.", 4: "Six of the household walk with you. They slow you, feed you, and believe in you. The last is the one that will cost." },
  "architect-2": { 0: "Every faction has read the last page. The Church calls it heresy and the Crown calls it treason. Both have begun building one.", 2: "The plans are yours and the last page is your secret. Secrets are a kind of debt. I collect those too, eventually.", 3: "Your little engine runs. It took a year from you in a week. You have looked in the mirror twice today.", 4: "The library is sealed with the plans inside. You remember most of it anyway. You have been drawing in the margins of other books." },
  "architect-3": { 0: "You told them the truth. Half the nobles left the tent. The half that stayed are the ones who frighten me.", 2: "You promised each noble his heart's wish. Three of them have compared notes. You have perhaps a month.", 3: "The company marched on the capital that night. It is in the streets of Blackspire now, and a riot has started around it.", 4: "The company guards the villages on the road. The nobles are furious, and the villages have started using your name as a blessing." },
};

// The specials a protagonist has chosen, one for each of its first three chapters: which fighter's special fills each
// of its three places. Kept in this browser. A place not chosen yet holds the fighter's own.
type Chosen = Partial<Record<Hero, (number | null)[]>>;
const read = (): Chosen => { try { return JSON.parse(localStorage.getItem("specials") ?? "{}") as Chosen; } catch { return {}; } };
/** The three specials `hero`, who fights as `fighter`, goes into a level with. */
export const specialsOf = (hero: Hero, fighter: number): SpecialDef[] => [0, 1, 2].map((slot) => CHARS[read()[hero]?.[slot] ?? fighter].specials[slot]);
/** Keeps `hero`'s choice of `from`'s special for `slot`. */
export function choose(hero: Hero, fighter: number, slot: number, from: number) {
  const all = read(), mine: (number | null)[] = all[hero] ?? [null, null, null];
  mine[slot] = from;
  try { localStorage.setItem("specials", JSON.stringify({ ...all, [hero]: mine })); } catch { /* Private browsing may refuse: the fighter keeps its own. */ }
}
/** The school of the answer `hero` gave after its chapter `slot` (from 0), if it has answered. */
export const answerOf = (hero: Hero, slot: number): number | null => read()[hero]?.[slot] ?? null;
/** What the Reaper has to say, where chapter `chapter` (from 0) of `hero`'s campaign starts, about what it chose after the one before. */
export function echoOf(hero: Hero, chapter: number): string[] {
  const school = chapter > 0 ? read()[hero]?.[chapter - 1] : null, said = school == null ? undefined : ECHOES[`${hero}-${chapter}`]?.[school];
  return said ? [said] : [];
}
// What the Reaper will take from a protagonist to let it off once when its lives are spent: a memory, three to each,
// taken in this order. What is gone is counted for the saga's end.
export const MEMORIES: Record<Hero, string[]> = {
  forbidden: ["the face of the first man you executed", "the sound of your mother's voice", "the day you took the Crown's oath, and why"],
  ember: ["the smell of bread from the ovens of Cinderfall", "your father's laugh", "the song you sang the night before the fire"],
  exile: ["your first morning at the monastery", "the name you had before the masters gave you another", "the one time the Bellkeeper praised you"],
  hollow: ["the first child you ever healed", "your brother's face when he was a boy", "what you wanted to be before you were a healer"],
  architect: ["the only time your father looked at you", "your mother's handwriting on her first letter to you", "the afternoon you first drew the machine"],
};
const given = (): Partial<Record<Hero, number>> => { try { return JSON.parse(localStorage.getItem("given") ?? "{}") as Partial<Record<Hero, number>>; } catch { return {}; } };
/** The memory `hero` would give next, if it has one left. */
export const memoryOf = (hero: Hero): string | undefined => MEMORIES[hero][given()[hero] ?? 0];
/** How many memories `hero` has given away. */
export const memoriesGiven = (hero: Hero) => given()[hero] ?? 0;
/** Gives `hero`'s next memory to the Reaper, for good. */
export function give(hero: Hero) { try { localStorage.setItem("given", JSON.stringify({ ...given(), [hero]: memoriesGiven(hero) + 1 })); } catch { /* Private browsing may refuse: the memory stays. */ } }

// How each protagonist's last finished level went: how many lives it cost, and how much of what there was to find was
// found. The Reaper speaks of it where the next chapter starts.
export interface Went { id: string; name: string; chapter: number; deaths: number; found: number; of: number; /** What it gave the Reaper to be let off there, if it was. */ paid?: string }
type Journal = Partial<Record<Hero, Went>>;
const journal = (): Journal => { try { return JSON.parse(localStorage.getItem("journal") ?? "{}") as Journal; } catch { return {}; } };
/** Keeps how `hero`'s level went. */
export function remember(hero: Hero, went: Went) { try { localStorage.setItem("journal", JSON.stringify({ ...journal(), [hero]: went })); } catch { /* Private browsing may refuse: he says nothing of it. */ } }
/** What the Reaper says, where chapter `chapter` of `hero`'s campaign starts, of how the chapter before it went. */
export function reckoning(hero: Hero, chapter: number): string[] {
  const went = journal()[hero];
  if (!went || went.chapter !== chapter - 1) return [];
  const deaths = [
    went.found === went.of ? `You went through ${went.name} without once needing me, and missed nothing. I am not used to being unnecessary.` : `Not once did I reach for you in ${went.name}. Do not let it make you careless.`,
    `Once I reached for you in ${went.name}. You pulled your hand back. Good.`,
    `Twice I had you in ${went.name}, and twice you would not come. You are making me hopeful, and I dislike it.`,
  ][Math.min(2, went.deaths)];
  const missed = went.of - went.found;
  const finds = missed === 0 ? (went.deaths > 0 ? " You read everything the dead left there. They noticed." : "") : ` You walked past ${missed === 1 ? "one thing" : `${missed} things`} the dead left for you there. ${missed === 1 ? "It" : "They"} will keep. The dead are patient.`;
  const paid = went.paid ? [went.paid === "strength" ? "You should have been mine there. You bought your way out with a piece of your own strength. I have it. It is of no use to me, and I am keeping it anyway." : `You should have been mine there. You bought your way out with ${went.paid}. I am keeping it safe. You will never know it is gone, and that is the cruelty of it.`] : [];
  return went.paid ? paid : [deaths + finds];
}
// How well a level was done, as a letter: S for no life lost, everything found and under four minutes; A for one
// life at most with either of the other two; B for a life to spare; C for getting through. The best of each level is kept.
export type Rank = "S" | "A" | "B" | "C";
export const RANKS: Rank[] = ["S", "A", "B", "C"];
export function rankOf(went: { seconds: number; lost: number; found: number; of: number }): Rank {
  const all = went.found >= went.of, quick = went.seconds <= 240;
  return went.lost === 0 && all && quick ? "S" : went.lost <= 1 && (all || quick) ? "A" : went.lost <= 2 ? "B" : "C";
}
const ranks = (): Record<string, Rank> => { try { return JSON.parse(localStorage.getItem("ranks") ?? "{}") as Record<string, Rank>; } catch { return {}; } };
/** The best the level `id` has been done, if it has. */
export const bestOf = (id: string): Rank | undefined => ranks()[id];
/** Keeps `rank` for the level `id` if it is better than what is kept. */
export function keepRank(id: string, rank: Rank) {
  const best = bestOf(id);
  if (best && RANKS.indexOf(best) <= RANKS.indexOf(rank)) return;
  try { localStorage.setItem("ranks", JSON.stringify({ ...ranks(), [id]: rank })); } catch { /* Private browsing may refuse: it is not kept. */ }
}
/** Forgets every choice and every level, as when the saga is begun again. */
export const forget = () => { try { localStorage.removeItem("specials"); localStorage.removeItem("journal"); localStorage.removeItem("given"); localStorage.removeItem("truths"); localStorage.removeItem("stances"); localStorage.removeItem("ranks"); } catch { /* Nothing was kept. */ } };

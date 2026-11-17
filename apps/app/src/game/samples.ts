// spec/app/index.md, "Story: Fight other players"
// The recorded sounds (art/packs/README.md). From the Platform Fighter Template: the call to fight, the return, the
// guard and the end of a round of a duel. Supplied for the game: the slash of a sword as a fighter swings, which is
// one of three recordings; an energy blast being shot, and one landing; the last life of a quest going; a kind of
// game being chosen; any other menu's choice being made; the main menu's music; and the music under the opening cutscenes. Everything else the game plays is synthesised in audio.ts.
const urls = import.meta.glob<string>("./packs/sfx/*", { eager: true, query: "?url", import: "default" });
export type Sample = "go" | "respawn" | "shield" | "shieldHit" | "over" | "slash" | "blast" | "bolt" | "lost" | "start" | "menu" | "story" | "ui";
const files: Record<Sample, string[]> = {
  go: ["go.ogg"], respawn: ["respawn.wav"], shield: ["shield.wav"], shieldHit: ["shieldHit.wav"], over: ["over.ogg"],
  slash: ["slash1.wav", "slash2.wav", "slash3.wav"], blast: ["blast.wav"], bolt: ["bolt.wav"],
  lost: ["lost.mp3"], start: ["start.wav"], menu: ["menu.mp3"], story: ["story.mp3"], ui: ["ui.wav"],
};
/** How loud each is played, of full, where that is not a half: what is heard again and again a little under the rest. */
const LOUD: Partial<Record<Sample, number>> = { slash: 0.4, blast: 0.4, bolt: 0.45, lost: 0.6, start: 0.6, ui: 0.35 };
/** How far the pitch of a sound heard again and again may wander either way from its recording's own, in semitones, so that no two soundings are alike. */
const WANDER: Partial<Record<Sample, number>> = { slash: 2.5, blast: 4 };
/** Which recording of each sound was played last, so that one of several is never played twice running; and how far it was bent. */
const last: Partial<Record<Sample, number>> = {}, bent: Partial<Record<Sample, number>> = {};

/** Plays `name` once, at `scale` of its own loudness (the player's volume for sounds, or for music), and gives back what is playing it, for a long one to be stopped early. */
export function playSample(name: Sample, scale = 1): HTMLAudioElement {
  const of = files[name], wander = WANDER[name];
  let pick = Math.floor(Math.random() * of.length);
  if (of.length > 1 && pick === last[name]) pick = (pick + 1 + Math.floor(Math.random() * (of.length - 1))) % of.length;
  last[name] = pick;
  const sound: HTMLAudioElement & { webkitPreservesPitch?: boolean } = new Audio(urls[`./packs/sfx/${of[pick]}`]);
  sound.volume = Math.min(1, (LOUD[name] ?? 0.5) * scale);
  if (wander) {
    // A little higher or lower each time: played faster or slower, and not stretched to keep its pitch (older Safari
    // knows that by its own name). Never within a quarter of its range of the time before, which would sound the same.
    sound.preservesPitch = false; sound.webkitPreservesPitch = false;
    let bend: number;
    do bend = (Math.random() * 2 - 1) * wander; while (Math.abs(bend - (bent[name] ?? 99)) < wander / 4);
    bent[name] = bend;
    sound.playbackRate = 2 ** (bend / 12);
  }
  void sound.play().catch(() => undefined);
  return sound;
}

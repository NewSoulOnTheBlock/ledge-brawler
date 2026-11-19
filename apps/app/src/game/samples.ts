// spec/app/index.md, "Story: Fight other players"
// The recorded sounds (art/packs/README.md). From the Platform Fighter Template: the call to fight, the return, the
// guard and the end of a round of a duel. Supplied for the game: the slash of a sword as a fighter swings, which is
// one of three recordings; an energy blast being shot, and one landing; the last life of a quest going; a kind of
// game being chosen; any other menu's choice being made; and the music under the opening cutscenes. The soundtrack and the synthesised sounds are in audio.ts.
const urls = import.meta.glob<string>("./packs/sfx/*", { eager: true, query: "?url", import: "default" });
export type Sample = "go" | "respawn" | "shield" | "shieldHit" | "over" | "slash" | "blast" | "bolt" | "lost" | "start" | "story" | "ui";
const files: Record<Sample, string[]> = {
  go: ["go.ogg"], respawn: ["respawn.wav"], shield: ["shield.wav"], shieldHit: ["shieldHit.wav"], over: ["over.ogg"],
  slash: ["slash1.wav", "slash2.wav", "slash3.wav"], blast: ["blast.wav"], bolt: ["bolt.wav"],
  lost: ["lost.mp3"], start: ["start.wav"], story: ["story.mp3"], ui: ["ui.wav"],
};
/** How loud each is played, of full, where that is not a half. The fight's own sounds sit about 6 dB over the music
 *  (audio.ts, trackLoud): a sword swing is heard over any song. */
const LOUD: Partial<Record<Sample, number>> = { slash: 0.7, blast: 0.7, bolt: 0.45, lost: 0.6, start: 0.6, ui: 0.35 };
/** How far the pitch of a sound heard again and again may wander either way from its recording's own, in semitones, so that no two soundings are alike. */
const WANDER: Partial<Record<Sample, number>> = { slash: 2.5, blast: 4 };
/** Which recording of each sound was played last, so that one of several is never played twice running; and how far it was bent. */
const last: Partial<Record<Sample, number>> = {}, bent: Partial<Record<Sample, number>> = {};

/** The song under the opening cutscenes, played by the page as media (App.tsx, useSong) on a screen with no fight music under it; every other sound is short and is played by audio.ts. */
export type Song = "story";
/** Every recording of a short sound, for audio.ts to read once sound is allowed. */
export const sampleUrls = (Object.keys(files) as Sample[]).filter((name) => name !== "story").flatMap((name) => files[name].map((file) => urls[`./packs/sfx/${file}`]));

/** One sounding of `name`: which of its recordings, how loud of full, and how fast it is played. A little higher or
 *  lower each time where its pitch wanders (played faster or slower), never within a quarter of its range of the time
 *  before, which would sound the same; and never the recording played last where there are several. */
export function soundingOf(name: Sample): { url: string; loud: number; rate: number } {
  const of = files[name], wander = WANDER[name];
  let pick = Math.floor(Math.random() * of.length);
  if (of.length > 1 && pick === last[name]) pick = (pick + 1 + Math.floor(Math.random() * (of.length - 1))) % of.length;
  last[name] = pick;
  let rate = 1;
  if (wander) {
    let bend: number;
    do bend = (Math.random() * 2 - 1) * wander; while (Math.abs(bend - (bent[name] ?? 99)) < wander / 4);
    bent[name] = bend;
    rate = 2 ** (bend / 12);
  }
  return { url: urls[`./packs/sfx/${of[pick]}`], loud: LOUD[name] ?? 0.5, rate };
}

/** Plays a song once, at `scale` of its own loudness (the player's music volume), and gives back what is playing it, to be stopped early. */
export function playSong(name: Song, scale = 1): HTMLAudioElement {
  const song = new Audio(urls[`./packs/sfx/${files[name][0]}`]);
  song.volume = Math.min(1, (LOUD[name] ?? 0.5) * scale);
  void song.play().catch(() => undefined);
  return song;
}

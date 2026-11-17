// spec/app/index.md, "Story: Fight the waves"
// The arena's sounds and its music, synthesised: nothing plays before the first key or touch, or while muted.
import type { Sfx } from "./sim.ts";
import type { SkyId } from "./sky.ts";

/** The music some places have of their own: a recording (art/packs/README.md), looped in place of the synthesised music wherever that place is the one in play. */
export type Track = "moonlight" | "rocky";
/** The places that have their own music: the moonlit forest, and the canyon. */
export const TRACKS: Partial<Record<SkyId, Track>> = { nightforest: "moonlight", wastelands: "rocky" };
const TRACK_URLS = import.meta.glob<string>("./packs/sfx/{moonlight,rocky}.mp3", { eager: true, query: "?url", import: "default" });
/** How loud each is at full music volume: about as loud as the other, and under the fight. */
const TRACK_LOUD: Record<Track, number> = { moonlight: 0.5, rocky: 0.42 };

export function createAudio() {
  let actx: AudioContext | null = null;
  /** Where every sound goes on its way out (`unlock`). */
  let bus: AudioNode | null = null;
  const loadVol = (key: string, def: number) => {
    try { const v = parseFloat(localStorage.getItem(key) ?? ""); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : def; } catch { return def; }
  };
  let sfxVol = loadVol("sfxVol", 0.7), musicVol = loadVol("musicVol", 0.5);
  let beforeMute = { sfx: sfxVol || 0.7, music: musicVol || 0.5 };
  const isMuted = () => sfxVol === 0 && musicVol === 0;
  function saveVol() {
    try { localStorage.setItem("sfxVol", String(sfxVol)); localStorage.setItem("musicVol", String(musicVol)); } catch {}
  }
  const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  // The music: a bass line and a quiet arpeggio through one filter, which closes while the fighter is down.
  let music: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  const LOUD = 0.05, BEAT = 60 / 112 / 2;
  const BASS = [110, 110, 87.31, 98], ARP = [[220, 261.63, 329.63], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
  let nextNote = 0, beat = 0;
  // A place's own music: what is playing, what was last asked for (kept for when sound is first allowed), each
  // recording once it has been read, and whether the fighter is down.
  // `waiting`: the main menu's own song (App.tsx) is playing, and the music comes in only once it has finished.
  let playing: { name: Track; gain: GainNode; source: AudioBufferSourceNode | null } | null = null, wanted: Track | null = null, ducked = false, waiting = false;
  const recordings = new Map<Track, Promise<AudioBuffer>>();
  const ramp = (param: AudioParam, to: number, over: number) => {
    if (!actx) return;
    const t = actx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + over);
  };
  /** Sets how loud the music is over `over` seconds: for its volume, for whether the fighter is down, and the synthesised music silent while a place's own plays. */
  function levels(over = 0) {
    if (!music) return;
    const k = waiting ? 0 : musicVol * (ducked ? 0.35 : 1);
    ramp(music.gain.gain, playing ? 0 : LOUD * k, over);
    if (playing) ramp(playing.gain.gain, TRACK_LOUD[playing.name] * k, over);
  }
  /** Plays the music of a place that has its own, looped, in place of the synthesised music; or, given none, goes back to that. */
  function track(name: Track | null) {
    wanted = name;
    if (!actx || !music || (playing?.name ?? null) === name) return;
    if (playing) { const old = playing; ramp(old.gain.gain, 0, 0.4); setTimeout(() => { old.source?.stop(); old.gain.disconnect(); }, 500); playing = null; }
    if (name) {
      const ctx = actx, gain = ctx.createGain();
      gain.gain.value = 0; gain.connect(bus!);
      const mine = (playing = { name, gain, source: null as AudioBufferSourceNode | null });
      const read = recordings.get(name) ?? fetch(TRACK_URLS[`./packs/sfx/${name}.mp3`]).then((got) => got.arrayBuffer()).then((data) => ctx.decodeAudioData(data));
      recordings.set(name, read);
      read.then((recording) => {
        // Another place may have been come to while this one's music was being read.
        if (playing !== mine) return;
        const source = ctx.createBufferSource();
        source.buffer = recording; source.loop = true; source.connect(gain); source.start();
        mine.source = source;
      }, () => { if (playing === mine) { playing = null; levels(0.4); } });
    }
    levels(0.4);
  }

  function note(freq: number, at: number, dur: number, gain: number, type: OscillatorType) {
    if (!actx || !music) return;
    const g = actx.createGain(); g.connect(music.filter);
    g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    const o = actx.createOscillator(); o.type = type; o.frequency.value = freq;
    o.connect(g); o.start(at); o.stop(at + dur);
  }
  /** Schedules the beats that fall in the next quarter of a second. */
  function schedule() {
    if (!actx || !music) return;
    while (nextNote < actx.currentTime + 0.25) {
      const bar = Math.floor(beat / 8) % 4, step = beat % 8;
      if (step % 2 === 0) note(BASS[bar], nextNote, BEAT * 1.8, 1, "triangle");
      note(ARP[bar][step % 3] * (step > 5 ? 2 : 1), nextNote, BEAT * 0.9, 0.22, "square");
      nextNote += BEAT; beat++;
    }
  }

  function unlock() {
    if (actx || isMuted()) return;
    try { actx = new AudioContext(); } catch { actx = null; return; }
    // Everything goes out through one compressor: a greater art sets off a string of blasts at once, and on a phone's
    // speaker their sum would clip into crackle. It holds the loudest moments down and leaves the rest as they are.
    const squeeze = actx.createDynamicsCompressor();
    squeeze.threshold.value = -14; squeeze.knee.value = 10; squeeze.ratio.value = 6; squeeze.attack.value = 0.004; squeeze.release.value = 0.22;
    squeeze.connect(actx.destination);
    bus = squeeze;
    const gain = actx.createGain(), filter = actx.createBiquadFilter();
    gain.gain.value = waiting ? 0 : LOUD * musicVol; filter.type = "lowpass"; filter.frequency.value = 9000;
    filter.connect(gain); gain.connect(bus);
    music = { gain, filter };
    nextNote = actx.currentTime + 0.1;
    setInterval(schedule, 100);
    track(wanted);
  }

  /** Down: the music drops and dulls over a quarter of a second. Up: it swells back over 1.2 seconds. */
  function duck(down: boolean) {
    if (!actx || !music) return;
    ducked = down;
    const over = down ? 0.25 : 1.2;
    levels(over);
    ramp(music.filter.frequency, down ? 380 : 9000, over);
  }

  function tone(freq: number, dur: number, gain: number, noise = 0, type: OscillatorType = "sine", bend = 0.4) {
    if (!actx || sfxVol === 0) return;
    gain *= sfxVol; noise *= sfxVol;
    // No two plays of a sound are quite the same pitch.
    freq *= 0.92 + Math.random() * 0.17;
    const t = actx.currentTime;
    const g = actx.createGain(); g.connect(bus!);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const o = actx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * bend, t + dur);
    o.connect(g); o.start(t); o.stop(t + dur);
    if (noise) {
      const len = Math.floor(actx.sampleRate * Math.min(0.5, dur)), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = actx.createBufferSource(); s.buffer = buf;
      const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.7;
      const ng = actx.createGain(); ng.gain.value = noise;
      s.connect(f); f.connect(ng); ng.connect(bus!); s.start(t);
    }
  }

  const sfx: Sfx = {
    jump: () => tone(320, 0.1, 0.06),
    flip: () => tone(700, 0.18, 0.05, 0.15, "triangle", 2),
    land: () => tone(90, 0.1, 0.1),
    hit: (heavy, combo = 1) => tone((heavy ? 70 : 120) * (1 + Math.min(combo - 1, 8) * 0.07), heavy ? 0.22 : 0.12, 0.35, heavy ? 0.55 : 0.35),
    hurt: () => tone(160, 0.2, 0.25, 0.3, "square", 0.5),
    ko: () => tone(55, 0.6, 0.4, 0.4, "sine", 0.3),
    boom: (big) => tone(big ? 45 : 80, big ? 0.7 : 0.3, 0.45, big ? 0.7 : 0.4, "sine", 0.3),
    beam: () => tone(140, 1.1, 0.12, 0.25, "sawtooth", 0.9),
    zap: () => tone(2200, 0.18, 0.06, 0.4, "square", 0.1),
    charge: () => tone(110 + Math.random() * 40, 0.12, 0.04, 0.05, "sawtooth", 1.4),
    vanish: () => tone(1500, 0.14, 0.05, 0.1, "sine", 0.2),
    power: () => tone(120, 0.9, 0.25, 0.5, "sawtooth", 6),
    // Three notes rising, a fifth and an octave over the first, with a fourth an octave higher still for a reward.
    chime: (reward) => {
      if (!actx || !bus || sfxVol === 0) return;
      const notes = reward ? [659.25, 987.77, 1318.51, 1975.53] : [659.25, 987.77, 1318.51], start = actx.currentTime;
      notes.forEach((freq, i) => {
        const at = start + i * 0.085, g = actx!.createGain(), o = actx!.createOscillator();
        o.type = "triangle"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.16 * sfxVol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + (i === notes.length - 1 ? 0.9 : 0.35));
        o.connect(g); g.connect(bus!); o.start(at); o.stop(at + 1);
      });
    },
  };

  /** Silences everything while the game is out of sight, as an app sent to the background should be, and brings it back. */
  function sleep(away: boolean) { if (actx) void (away ? actx.suspend() : actx.resume()).catch(() => undefined); }

  return {
    sfx, unlock, duck, track, sleep,
    /** Holds the music silent while another song plays (`true`), then brings it in over a second and a half (`false`). */
    wait(on: boolean) { if (waiting === on) return; waiting = on; levels(on ? 0 : 1.5); },
    sfxVol: () => sfxVol,
    musicVol: () => musicVol,
    setSfxVol(v: number) { sfxVol = clamp01(v); saveVol(); return sfxVol; },
    setMusicVol(v: number) {
      musicVol = clamp01(v); saveVol();
      if (musicVol > 0) unlock();
      levels();
      return musicVol;
    },
    /** Mutes both volumes, or restores the pre-mute levels; returns whether sound is now off. */
    toggleMute() {
      if (isMuted()) { sfxVol = beforeMute.sfx; musicVol = beforeMute.music; unlock(); }
      else { beforeMute = { sfx: sfxVol || beforeMute.sfx, music: musicVol || beforeMute.music }; sfxVol = 0; musicVol = 0; }
      saveVol();
      levels();
      return isMuted();
    },
  };
}

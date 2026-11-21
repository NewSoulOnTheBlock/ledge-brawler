// spec/app/index.md, "Story: Choose a fighter"; spec/app/index.md, "Story: Learn the moves"
import { cn } from "@repo/ui";
import { type ComponentType, type JSX, type ReactNode, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fighters } from "../gen/app.ts";
import { chaptersDone } from "../gen/app__saga.ts";
import { KitWord } from "./kit.tsx";
import { CampaignScreen, ChapterClear, Ending, GuideTalk, Prelude } from "./Campaign.tsx";
import { type Table, type TalkWord, type Together, joinTogether } from "./together.ts";
import { DILEMMAS, PARLEY, keepRank, rankOf, repliesOf, type Stance, stand, choose, echoOf, give, memoryOf, reckoning, remember, specialsOf } from "./story/parley.ts";
import { buildOf, canPay, heroOf, pay } from "./story/build.ts";
import { crossing } from "./story/crossings.ts";
import { WATCHED, through } from "./story/prelude.ts";
import { WHY, within } from "./story/within.ts";
import { REAPER_UNHEEDED, VOICES, heed } from "./story/voices.ts";
import { shaped, turnsOf } from "./story/world.ts";
import { createAudio, musicFor } from "./game/audio.ts";
import { CHARS, MOVES_TO_FIND, SPECIAL_INPUTS } from "./game/data.ts";
import { createPost } from "./game/post/post.ts";
import { createView, isCalm, setCalm } from "./game/render.ts";
import { skyIsDark } from "./game/sky.ts";
import { type Level, area, hasLevel, inWorld, levelById, levelOf, survivalStage, today } from "./game/levels.ts";
import { type Sample, type Song, playSong } from "./game/samples.ts";
import { type Button, type Game, type Ui, createGame } from "./game/sim.ts";
import { Combo, Hud, TouchPad, TOUCH_SEEN, TOUCH_SIZES, setTouchFit, touchFit } from "./Hud.tsx";
import { BigButton, MoveList, SelectScreen, SmallButton, TitleBackdrop, TitleScreen, VolumeSliders } from "./screens.tsx";
import { type PauseAction, type PausePage, PauseMenu } from "./Pause.tsx";
import type { Runtime } from "./runtime.ts";
import { type FactId, HEROES, PROTAGONISTS, factNumber, type Hero } from "./story/canon.ts";
import { KitIcon } from "./kit.tsx";
import { useMatch } from "./useMatch.ts";
import { useAuth } from "./auth.tsx";
import { type PadMode, useGamepad } from "./gamepad.ts";
import { Coach } from "./Coach.tsx";
import { grantedAll } from "./granted.ts";
import { type Board, type ConflictInfo, keep, lastName, loadStats, pullCloudSaga, recordSurvival, rememberName, resolveConflict, setTokenProvider, standingOf, syncSagaToCloud } from "./scores.ts";
import { track } from "./track.ts";
import { unlock } from "./achievements.ts";
import { useSaga } from "./useSaga.ts";
import { type Rival, type Standing, type Versus, inviteLink, joinVersus, nameFor, roomCode, stageFor } from "./versus.ts";
import { type Entry, proInfo, proSeat, proWithdraw, tokens } from "./pro.ts";
import { type Paid, joinRun } from "./run.ts";
import type { RunWord } from "./arena/run.ts";
/** A screen loaded the first time it is shown, not with the game: paying (the wallet's own module), the
 *  profile, and playing together (the multiplayer client). Nothing shows while it loads, for the moment it takes. */
const later = <P extends object>(load: () => Promise<ComponentType<P>>) => {
  const Loaded = lazy(() => load().then((component) => ({ default: component })));
  return (props: P & JSX.IntrinsicAttributes) => <Suspense fallback={null}><Loaded {...props} /></Suspense>;
};
const ProEntry = later(() => import("./ProEntry.tsx").then((m) => m.ProEntry));
const Profile = later(() => import("./Profile.tsx").then((m) => m.Profile));
const CoopTable = later(() => import("./Coop.tsx").then((m) => m.CoopTable));
const CoopParty = later(() => import("./Coop.tsx").then((m) => m.CoopParty));
const Wiped = later(() => import("./Coop.tsx").then((m) => m.Wiped));

const KEYMAP: Record<string, Button> = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowDown: "down", KeyS: "down",
  ArrowUp: "up", KeyW: "up", Space: "jump", KeyI: "dash", KeyE: "dash", KeyO: "grab", KeyQ: "grab", ShiftLeft: "run", ShiftRight: "run",
  KeyJ: "punch", KeyZ: "punch", KeyK: "kick", KeyX: "kick", KeyL: "blast", KeyC: "blast", KeyU: "charge", KeyF: "fly", KeyG: "guard", KeyV: "guard",
  // No key of its own for a special: each is called by its motion and the blast (data.ts, SPECIAL_MOTIONS).
  KeyT: "item", KeyR: "next",
};
const CONFIRM = ["Enter", "Space", "KeyJ", "NumpadEnter"];

/** The engine's hints name the keyboard's keys. Said to a player holding a controller, or a phone, they name what is in
 *  that player's hands instead. */
const IN_HAND: Record<string, [pad: string, touch: string]> = {
  "Hold U to charge": ["Hold LT to charge", "Hold Aura to charge"],
  "W up · S down · F to land": ["Stick up and down · D-pad down to land", "Stick up and down · Aura and Fly to land"],
  "T to use, R to choose": ["R3 to use, L3 to choose", "Aura and Item to use, Aura and Next to choose"],
};
function inHand(sub: string) {
  const pad = [...(navigator.getGamepads?.() ?? [])].some((each) => each?.connected), touch = matchMedia("(pointer: coarse)").matches;
  if (!pad && !touch) return sub;
  return Object.entries(IN_HAND).reduce((said, [keys, [onPad, onTouch]]) => said.replace(keys, pad ? onPad : onTouch), sub);
}

/** What a player sets once and keeps: the volumes, shake and flashes, and, on a touch screen, the buttons fitted to the
 *  hands holding it. In the pause menu, with what else a pause is for (`children`), and on the home screen. */
function Preferences({ audio, onChange, children }: { audio: ReturnType<typeof createAudio>; onChange: () => void; children?: ReactNode }) {
  const fit = touchFit(), next = <T,>(all: readonly T[], now: T) => all[(all.indexOf(now) + 1) % all.length];
  const refit = (to: { size: number; seen: number }) => { setTouchFit(to); onChange(); };
  return <>
    <VolumeSliders sfxVol={audio.sfxVol()} musicVol={audio.musicVol()} onSfx={audio.setSfxVol} onMusic={audio.setMusicVol} />
    <div className="mt-4 flex flex-wrap gap-2">
      {children}
      <SmallButton aria-pressed={!isCalm()} onClick={() => { setCalm(!isCalm()); onChange(); }}>Shake and flashes: {isCalm() ? "off" : "on"}</SmallButton>
      {matchMedia("(pointer: coarse)").matches && <>
        <SmallButton onClick={() => refit({ ...fit, size: next(TOUCH_SIZES, fit.size as (typeof TOUCH_SIZES)[number]) })}>Buttons: {["small", "medium", "large"][TOUCH_SIZES.indexOf(fit.size as (typeof TOUCH_SIZES)[number])]}</SmallButton>
        <SmallButton onClick={() => refit({ ...fit, seen: next(TOUCH_SEEN, fit.seen as (typeof TOUCH_SEEN)[number]) })}>Buttons seen: {Math.round(fit.seen * 100)}%</SmallButton>
      </>}
    </div>
  </>;
}

/** Shakes every connected controller, and a phone that can vibrate. */
function rumble(strength: number, ms: number) {
  for (const pad of navigator.getGamepads?.() ?? []) void pad?.vibrationActuator?.playEffect("dual-rumble", { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch(() => undefined);
  if (matchMedia("(pointer: coarse)").matches) navigator.vibrate?.(ms * strength);
}

/**
 * On a phone, asks for the whole screen held on its side, once, as a fight, a duel or a level starts. Not before:
 * going to the whole screen in the middle of the menus moves them under the player's thumb. Where a browser will
 * not give it (an iPhone's will not), the page asks the player to turn the phone instead (TurnPhone).
 */
function sideways() {
  // Each time a fight starts, not only the first: the back button or a swipe leaves full screen, and the next fight
  // should have the whole screen again. Already there, nothing is asked.
  if (document.fullscreenElement || !matchMedia("(pointer: coarse)").matches) return;
  const lock = (screen.orientation as ScreenOrientation & { lock?: (way: string) => Promise<void> }).lock;
  void document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).then(() => lock?.call(screen.orientation, "landscape")).catch(() => undefined);
}

interface Said { text: string; sub?: string; tone?: "red" | "gold" }

/** Something the arena says for a moment: the text, and whether it is still showing. */
/** A recorded song (samples.ts) while `on`, the game's own music (audio.ts) held back under it: played once and the
 *  game's music let in when it ends, or `loop`ed until `on` is over. A browser will not play a sound before the page has
 *  been touched, so a song asked for before then waits for a touch; out of sight it stops, and takes up where it was. */
function useSong(on: boolean, name: Song, audio: ReturnType<typeof createAudio>, muted: boolean, loop = false) {
  useEffect(() => {
    if (!on || muted || audio.musicVol() === 0) return;
    const music = playSong(name, audio.musicVol());
    music.loop = loop;
    audio.wait(true);
    const done = () => audio.wait(false);
    music.addEventListener("ended", done); music.addEventListener("error", done);
    let timer = 0;
    const touched = () => { timer = window.setTimeout(() => { if (music.paused && music.currentTime === 0) void music.play().catch(() => undefined); }, 250); };
    const seen = () => { if (document.hidden) music.pause(); else if (music.currentTime > 0 && !music.ended) void music.play().catch(() => undefined); };
    document.addEventListener("visibilitychange", seen);
    window.addEventListener("pointerdown", touched, { once: true }); window.addEventListener("keydown", touched, { once: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("pointerdown", touched); window.removeEventListener("keydown", touched); document.removeEventListener("visibilitychange", seen); music.removeEventListener("ended", done); music.removeEventListener("error", done); music.pause(); audio.wait(false); };
  }, [on, name, audio, muted, loop]);
}

function useSaid(ms: number) {
  const [said, setSaid] = useState<Said & { on: boolean }>({ text: "", on: false });
  const timer = useRef(0);
  const say = useCallback((next: Said) => {
    setSaid({ ...next, on: true });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaid((now) => ({ ...now, on: false })), ms);
  }, [ms]);
  return [said, say] as const;
}

/** The canvas the arena is drawn on, a frame at a time for as long as it is mounted. */
function Arena({ game, before }: { game: Game; before: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), over = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const view = createView(canvas.current!, game), post = createPost(canvas.current!, over.current!);
    view.resize();
    addEventListener("resize", view.resize);
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const realDt = Math.min(100, now - last); last = now;
      before();
      game.frame(realDt);
      // The home screen covers the whole page: nothing of the arena behind it would be seen, so none of it is drawn.
      if (game.scene.match.screen !== "Title") { view.draw(realDt); post?.draw(view.effects()); }
      frame = requestAnimationFrame(tick);
    });
    // A browser stops drawing a page nobody is looking at, and with it this loop. In a duel that would leave the
    // fighter frozen on everyone else's screen, so while the page is hidden a worker's clock, which a browser does
    // not slow, keeps the duel stepping. Nothing is drawn: there is nobody to draw for.
    const clock = new Worker(URL.createObjectURL(new Blob(["setInterval(() => postMessage(0), 1000 / 60);"], { type: "text/javascript" })));
    clock.onmessage = () => {
      if (!document.hidden || !game.scene.match.duel) return;
      const now = performance.now(), realDt = Math.min(100, now - last); last = now;
      before();
      game.frame(realDt);
    };
    return () => { cancelAnimationFrame(frame); removeEventListener("resize", view.resize); clock.terminate(); };
  }, [game, before]);
  return (
    <>
      <canvas ref={canvas} aria-label="Five Blades game arena" className="absolute inset-0 block size-full touch-none" />
      <canvas ref={over} aria-hidden className="pointer-events-none invisible absolute inset-0 block size-full" />
    </>
  );
}

const STATUS: Record<Standing["status"], string> = {
  joining: "Finding a match…", alone: "Waiting for another fighter. Fight the CPU meanwhile.", starting: "Next round in", waiting: "A round is under way: you fight in the next.", fighting: "Last one standing wins.",
  over: "The round is over.", reconnecting: "Reconnecting…", offline: "The arena could not be reached. You are fighting the CPU.",
  full: "This table already has five fighters. You are fighting the CPU; leave and pick another match.",
};

/** Which match to enter, chosen beside the fighter: a quick match with whoever is waiting, a new table of one's own, or a friend's by its code. */
function MatchPicker() {
  const [code, setCode] = useState(roomCode()), [typed, setTyped] = useState("");
  const go = (next: string) => { history.replaceState(null, "", next === "open" ? location.pathname : `?room=${next}`); setCode(roomCode()); };
  const choice = "cursor-pointer border-2 border-foreground px-3 py-1.5 font-sans text-[11px] font-bold tracking-[0.12em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  return (
    <fieldset aria-label="Match" className="grid gap-2 border-2 border-foreground bg-card px-4.5 py-3 text-[12.5px]">
      <legend className="px-1 font-sans text-[11px] font-bold tracking-[0.14em] uppercase">Match</legend>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={code === "open"} className={cn(choice, code === "open" ? "bg-primary text-primary-foreground" : "bg-card")} onClick={() => go("open")}>Quick match</button>
        <button type="button" aria-pressed={code !== "open"} className={cn(choice, code !== "open" ? "bg-primary text-primary-foreground" : "bg-card")} onClick={() => go(Math.random().toString(36).slice(2, 8))}>Private table</button>
        <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (typed.trim()) go(typed.trim()); setTyped(""); }}>
          <input aria-label="Table code" value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="table code" className="w-28 border-2 border-foreground bg-background px-2 py-1 font-mono text-xs" />
          <button type="submit" className={cn(choice, "bg-card")}>Join</button>
        </form>
      </div>
      <p className="text-muted-foreground">
        {code === "open" ? "Up to five to a table. Rounds start by themselves." : <>Table <b className="font-mono text-foreground">{code}</b>: <span className="font-mono text-foreground select-all">{inviteLink(code)}</span></>}
      </p>
    </fieldset>
  );
}

/** Survival or Versus, as chosen on the title: Casual, for nothing, or Pro, for an entry fee in $BLADES (pro.ts). */
/** The Pro entry fee as the site charges it ("50,000 $BLADES"), read once from /api/pro; "" until it answers. */
let entryFee = "";
function useEntryFee(): string {
  const [fee, setFee] = useState(entryFee);
  useEffect(() => {
    if (entryFee) return;
    proInfo().then((info) => {
      if (!info.fee) return;
      entryFee = `${tokens(info.fee, info.decimals)} $BLADES`;
      setFee(entryFee);
    }).catch(() => {});
  }, []);
  return fee;
}

function TierChoice({ mode, onPick, onBack }: { mode: "Survival" | "Versus"; onPick: (pro: boolean) => void; onBack: () => void }) {
  const fee = useEntryFee();
  const tier = "grid cursor-pointer gap-1 border-2 border-foreground bg-background px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:bg-muted";
  return (
    <div className="absolute inset-0 z-40 grid [place-items:safe_center] bg-background/80 px-4 py-4">
      <section aria-labelledby="tierTitle" className="grid w-full max-w-[480px] gap-3 border-2 border-foreground bg-card px-6 py-5 shadow-[6px_6px_0_var(--foreground)]">
        <h2 id="tierTitle" className="font-sans text-2xl font-bold tracking-[0.1em] uppercase">{mode}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" autoFocus className={tier} onClick={() => onPick(false)}>
            <b className="font-sans text-lg tracking-[0.12em] uppercase">Casual</b>
            <span className="text-[12.5px] text-muted-foreground">Free. {mode === "Survival" ? "For fun and the leaderboard." : "Open and private rooms, rematches."}</span>
          </button>
          <button type="button" className={cn(tier, "border-destructive")} onClick={() => onPick(true)}>
            <b className="font-sans text-lg tracking-[0.12em] text-destructive uppercase">Pro</b>
            <span className="text-[12.5px] text-muted-foreground">{fee || "A $BLADES fee"} to enter. {mode === "Survival" ? "The day's best run takes the day's pot." : "Last one standing takes the pot."}</span>
          </button>
        </div>
        <SmallButton className="justify-self-start" onClick={onBack}>Back</SmallButton>
      </section>
    </div>
  );
}

/** Campaign, as chosen on the title: alone, on the campaign screen, or with others, by way of co-op matchmaking (Coop.tsx). */
function PartyChoice({ onPick, onBack }: { onPick: (coop: boolean) => void; onBack: () => void }) {
  const way = "grid cursor-pointer gap-1 border-2 border-foreground bg-background px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:bg-muted";
  return (
    <div className="absolute inset-0 z-40 grid [place-items:safe_center] bg-background/80 px-4 py-4">
      <section aria-labelledby="partyTitle" className="grid w-full max-w-[480px] gap-3 border-2 border-foreground bg-card px-6 py-5 shadow-[6px_6px_0_var(--foreground)]">
        <h2 id="partyTitle" className="font-sans text-2xl font-bold tracking-[0.1em] uppercase">Campaign</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" autoFocus className={way} onClick={() => onPick(false)}>
            <b className="font-sans text-lg tracking-[0.12em] uppercase">Solo</b>
            <span className="text-[12.5px] text-muted-foreground">Your five campaigns, at your own pace.</span>
          </button>
          <button type="button" className={way} onClick={() => onPick(true)}>
            <b className="font-sans text-lg tracking-[0.12em] uppercase">Co-op</b>
            <span className="text-[12.5px] text-muted-foreground">Find a group of up to five, or bring friends with a code.</span>
          </button>
        </div>
        <SmallButton className="justify-self-start" onClick={onBack}>Back</SmallButton>
      </section>
    </div>
  );
}

/** A duel won: who is left standing, how everyone did, and whether to fight again or go. */
function MatchOver({ standing, onAgain, onLeave, again = "Fight again", note }: { standing: Standing; onAgain: () => void; onLeave: () => void; again?: string; /** What became of a pro match's pot. */ note?: string }) {
  const won = standing.rivals.find((rival) => rival.name === standing.winner);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-background/70 px-4">
      <section aria-labelledby="matchOver" className="grid w-full max-w-[440px] justify-items-center gap-3 border-2 border-foreground bg-card px-6 py-5 text-center shadow-[6px_6px_0_var(--foreground)]">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Match over</p>
        <h2 id="matchOver" className="font-sans text-3xl font-bold tracking-[0.1em] uppercase" style={{ color: won ? CHARS[won.fighter].color : undefined }}>
          {standing.winner ? `${standing.winner} wins` : "No one is left standing"}
        </h2>
        <ul className="grid w-full gap-0.5 text-left text-xs tabular-nums">
          {[...standing.rivals].sort((p, q) => q.kos - p.kos).map((rival) => (
            <li key={rival.id} className="grid grid-cols-[1fr_auto] gap-3">
              <b className="font-medium" style={{ color: readable(CHARS[rival.fighter].color) }}>{rival.name}{rival.me && " (you)"}</b>
              <span>{rival.kos} K.O.</span>
            </li>
          ))}
        </ul>
        {note && <p role="status" className="text-[13px]">{note}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <SmallButton className="px-4 py-2 text-[13px]" onClick={onLeave}>Leave</SmallButton>
          <BigButton autoFocus onClick={onAgain}>{again}</BigButton>
        </div>
      </section>
    </div>
  );
}

/** The best standings, the one just kept marked. */
function BoardList({ board, mine }: { board: Board; mine?: number | null }) {
  if (board.top.length === 0) return <p className="text-muted-foreground">Nobody is on the board yet.</p>;
  return (
    <ol className="grid w-full gap-0.5 text-left text-xs tabular-nums">
      {board.top.map((row, i) => (
        <li key={row.id} className={cn("grid grid-cols-[2.2em_1fr_auto_auto] gap-3 px-1", row.id === mine && "bg-foreground text-background")}>
          <span className="text-right opacity-70">{i + 1}</span>
          <b className="truncate font-medium" style={row.id === mine ? undefined : { color: CHARS[row.fighter].color }}>{row.name}</b>
          <span>wave {row.wave}</span>
          <span>{row.kos} K.O.</span>
        </li>
      ))}
    </ol>
  );
}

function shareCard(wave: number, kos: number, fighter: number, rank: number | null, total: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 340;
  const ctx = canvas.getContext("2d")!;
  const c = CHARS[fighter];
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, 600, 340);
  ctx.strokeStyle = c.color; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 584, 324);
  ctx.font = 'bold 32px "Seven Swordsmen BB", sans-serif'; ctx.fillStyle = "#f6dfa6"; ctx.textAlign = "center";
  ctx.fillText("FIVE BLADES", 300, 52);
  ctx.font = 'bold 24px "Seven Swordsmen BB", sans-serif'; ctx.fillStyle = c.color;
  ctx.fillText(c.name.toUpperCase(), 300, 100);
  ctx.font = 'bold 64px "Seven Swordsmen BB", sans-serif'; ctx.fillStyle = "#ffffff";
  ctx.fillText(`Wave ${wave}`, 300, 180);
  ctx.font = 'bold 28px "Seven Swordsmen BB", sans-serif'; ctx.fillStyle = "#e03828";
  ctx.fillText(`${kos} K.O.`, 300, 220);
  if (rank) { ctx.font = 'bold 20px "Seven Swordsmen BB", sans-serif'; ctx.fillStyle = "#999"; ctx.fillText(`#${rank} of ${total}`, 300, 270); }
  ctx.font = '14px "Lexend", sans-serif'; ctx.fillStyle = "#666";
  ctx.fillText("fiveblades.online", 300, 310);
  const a = document.createElement("a"); a.download = `five-blades-wave-${wave}.png`; a.href = canvas.toDataURL("image/png"); a.click();
}

/**
 * Knocked out against the waves: how far the fight got, where that stands among everyone's, a name to keep the
 * standing under, and the way back to the first wave.
 */
/** A fighter's colour as lettering on a panel: ink, which a dark panel would swallow, is the panel's own lettering. */
const readable = (colour: string) => (parseInt(colour.slice(1, 3), 16) + parseInt(colour.slice(3, 5), 16) + parseInt(colour.slice(5, 7), 16) < 150 ? "var(--foreground)" : colour);

function KnockedOut({ lost, fighter, went, onAgain, onLeave }: { lost: { wave: number; kos: number }; fighter: number; /** How the fight went besides: how long it lasted in seconds, its best run of blows, and how many of the moves were found in it. */ went: { seconds: number; best: number; found: number }; onAgain: () => void; onLeave: () => void }) {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null), [error, setError] = useState(""), [name, setName] = useState(() => user?.name ?? lastName()), [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; standingOf(lost.wave, lost.kos).then((b) => { if (live) setBoard(b); }, (e: Error) => { if (live) setError(e.message); }); return () => { live = false; }; }, [lost]);
  const kept = board?.id ?? null;
  const save = () => {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true); setError(""); rememberName(clean);
    keep(clean, lost.wave, lost.kos, fighter).then(setBoard, (e: Error) => setError(e.message)).finally(() => setBusy(false));
  };
  return (
    <div className="absolute inset-0 z-30 grid [place-items:safe_center] overflow-y-auto bg-background/75 px-4 py-4">
      <section aria-labelledby="knockedOut" className="grid w-full max-w-[440px] justify-items-center gap-3 border-2 border-foreground bg-card px-6 py-5 text-center shadow-[6px_6px_0_var(--foreground)]">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Knocked out</p>
        <h2 id="knockedOut" className="font-sans text-3xl font-bold tracking-[0.1em] uppercase">Wave {lost.wave} <span className="text-destructive">· {lost.kos} K.O.</span></h2>
        <p className="text-xs tracking-wider text-muted-foreground tabular-nums">Lasted {Math.floor(went.seconds / 60)}:{String(went.seconds % 60).padStart(2, "0")} · best combo {went.best} · {went.found} of {MOVES_TO_FIND} moves found</p>
        <p role="status" className="min-h-[1.4em] text-sm">
          {error ? error : !board ? "Finding your standing…" : kept ? <>You are <b>#{board.rank}</b> of {board.total}.</> : <>That would stand <b>#{board.rank}</b> of {board.total + 1}.</>}
        </p>
        {board && !kept && (
          <form className="flex w-full items-center gap-2" onSubmit={(event) => { event.preventDefault(); save(); }}>
            <input
              aria-label="Your name" autoFocus value={name} maxLength={16} placeholder="Your name" onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.stopPropagation()}
              className="min-w-0 flex-1 touch-auto border-2 border-foreground bg-background px-2 py-2 text-sm select-text"
            />
            <SmallButton type="submit" disabled={busy || !name.trim()} className="px-4 py-2 text-[13px] disabled:opacity-50">{busy ? "Keeping…" : "Keep my standing"}</SmallButton>
          </form>
        )}
        {board && <BoardList board={board} mine={kept} />}
        <div className="flex flex-wrap justify-center gap-3">
          {board && <SmallButton className="px-4 py-2 text-[13px]" onClick={() => shareCard(lost.wave, lost.kos, fighter, board.rank, board.total)}>Share</SmallButton>}
          <SmallButton className="px-4 py-2 text-[13px]" onClick={onLeave}>Leave</SmallButton>
          <BigButton onClick={onAgain}>Try again</BigButton>
        </div>
      </section>
    </div>
  );
}

/** Covers the page on a phone held upright: the game is played with the phone on its side. */
function TurnPhone() {
  return (
    <div role="alert" className="fixed inset-0 z-50 hidden place-content-center justify-items-center gap-5 bg-black px-8 text-center text-white pointer-coarse:portrait:grid">
      {/* A phone lying on its side. */}
      <div aria-hidden className="grid h-14 w-24 place-items-center rounded-xl border-4 border-white"><i className="block size-2 justify-self-end rounded-full bg-white mr-2" /></div>
      <p className="font-sans text-xl font-bold tracking-[0.14em] uppercase">Turn your phone sideways</p>
      <p className="max-w-[26ch] text-sm text-white/70">Five Blades is played with the phone on its side, a thumb on each end.</p>
    </div>
  );
}

/** A black curtain that lifts each time the screen changes (`on` names the screen), so that one does not cut to the next. Not for a player who has asked for less motion. */
function Curtain({ on }: { on: string }) {
  const cloth = useRef<HTMLDivElement>(null), first = useRef(true);
  useEffect(() => {
    // Not as the game comes: the home screen is already on the page (index.html), and nothing is being cut from.
    if (first.current) { first.current = false; return; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cloth.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-out", fill: "forwards" });
  }, [on]);
  return <div ref={cloth} aria-hidden className="pointer-events-none absolute inset-0 z-[70] bg-black opacity-0" />;
}

/** Out of lives on a quest, the first time in a level: the Reaper will look away once, for a price. */
// spec/app/index.md, "A fighter out of lives on a quest can be let off once, and goes on with its last life"
function Bargain({ memory, strength, onGive, onRefuse }: { memory: string | undefined; strength: boolean; onGive: (what: "strength" | "memory") => void; onRefuse: () => void }) {
  const offer = "border-2 border-foreground/40 px-3 py-2 text-left text-[13px] leading-snug hover:border-foreground disabled:opacity-40";
  return (
    <div className="absolute inset-0 z-30 grid [place-items:safe_center] overflow-y-auto bg-background/80 px-4 py-4">
      <section aria-labelledby="bargain" className="grid w-full max-w-[520px] gap-3 border-2 border-foreground bg-card px-6 py-5 shadow-[6px_6px_0_var(--foreground)]">
        <p className="text-xs tracking-[0.2em] text-destructive uppercase">The Reaper</p>
        <h2 id="bargain" className="font-sans text-2xl font-bold tracking-[0.1em] uppercase">The third time</h2>
        <p className="text-[13px] leading-relaxed">That is three. By rights you come with me now. But I want to see how this ends, and I can look away once. Not for nothing. Nothing in Vareth is for nothing.</p>
        <button type="button" className={offer} disabled={!memory} onClick={() => onGive("memory")}><b className="font-medium">Give him a memory.</b> {memory ? `He asks for ${memory}. You will not know it is gone.` : "You have none left that he wants."}</button>
        <button type="button" className={offer} disabled={!strength} onClick={() => onGive("strength")}><b className="font-medium">Give him strength.</b> {strength ? "One of the skill points you have earned, for good." : "You have earned nothing he can take."}</button>
        <button type="button" className={offer} onClick={onRefuse}><b className="font-medium">Give him nothing.</b> Go with him.</button>
      </section>
    </div>
  );
}

/** Out of lives on a quest: the level is lost, and may be set out on again from its start with all three. */
// spec/app/index.md, "Only a knocked-out fighter revives, with full health and at least 40 aura"
function GameOver({ level, onAgain, onLeave }: { level: Level; onAgain: () => void; onLeave: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid [place-items:safe_center] overflow-y-auto bg-background/75 px-4 py-4">
      <section aria-labelledby="gameOver" className="grid w-full max-w-[440px] justify-items-center gap-3 border-2 border-foreground bg-card px-6 py-5 text-center shadow-[6px_6px_0_var(--foreground)]">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{level.name}</p>
        <h2 id="gameOver" className="font-sans text-3xl font-bold tracking-[0.1em] text-destructive uppercase">Game over</h2>
        <p className="text-sm text-muted-foreground">All three lives are spent.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <SmallButton className="px-4 py-2 text-[13px]" onClick={onLeave}>Leave</SmallButton>
          <BigButton onClick={onAgain}>Try again</BigButton>
        </div>
      </section>
    </div>
  );
}

/** How well another player is heard: three bars and the time a word takes there and back, or that they have gone quiet. */
function Signal({ rival }: { rival: Rival }) {
  if (rival.me) return <span />;
  if (rival.quiet) return <span className="text-right text-destructive">lagging</span>;
  if (rival.ping === undefined) return <span className="text-right text-muted-foreground">…</span>;
  const bars = rival.ping < 90 ? 3 : rival.ping < 180 ? 2 : 1, colour = bars === 3 ? "#2f9e44" : bars === 2 ? "#e0b84a" : "#d63c28";
  return (
    <span aria-label={`${rival.ping} milliseconds there and back`} className="flex items-end justify-end gap-1">
      <span aria-hidden className="flex items-end gap-px">{[1, 2, 3].map((n) => <i key={n} className="block w-[3px]" style={{ height: 3 + n * 3, background: n <= bars ? colour : "currentColor", opacity: n <= bars ? 1 : 0.25 }} />)}</span>
      <span className="tabular-nums">{rival.ping}</span>
    </span>
  );
}

/** A duel's room: who is in it, with their lives and knockouts, and the link that brings someone else to it. */
function VersusPanel({ standing, onInvite, onLeave, code, pro = false }: { standing: Standing; onInvite: () => string; onLeave: () => void; code: string; /** A paid match (pro.ts): nobody is invited to it, and leaving it alone gives the fee back. */ pro?: boolean }) {
  // The link is shown as well as copied: a browser may refuse the copy, and then it can be taken by hand.
  const [link, setLink] = useState(""), [copied, setCopied] = useState(false);
  const copy = () => {
    const made = onInvite();
    setLink(made); setCopied(false);
    void navigator.clipboard?.writeText(made).then(() => setCopied(true), () => undefined);
  };
  // On a phone the panel is one line at the top that opens when touched: the screen below it belongs to the thumbs.
  const [open, setOpen] = useState(false), phone = matchMedia("(pointer: coarse)").matches;
  if (phone && !open && standing.status !== "over") return (
    <button type="button" aria-label="Versus" onClick={() => setOpen(true)} className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 border-2 border-foreground bg-card/90 px-3 py-1 text-[11px] tabular-nums">
      {code || "…"} · {standing.rivals.length || 1} of 5 · {standing.rivals.map((rival) => "●".repeat(rival.lives)).join(" ")}
    </button>
  );
  return (
    <aside aria-label="Versus" onClick={phone ? (event) => { if (event.target === event.currentTarget) setOpen(false); } : undefined} className="absolute top-28 left-4 grid w-[min(92vw,330px)] gap-1 border-2 border-foreground bg-card/90 px-3 py-2 text-xs pointer-coarse:top-2 pointer-coarse:left-1/2 pointer-coarse:z-20 pointer-coarse:-translate-x-1/2">
      <p role="status" className="font-sans font-bold tracking-[0.12em] uppercase">{standing.status === "over" ? (standing.winner ? `${standing.winner} wins` : "No one is left standing") : `Table ${code || "…"}`}</p>
      <ul className="grid gap-0.5 tabular-nums">
        {standing.rivals.map((rival) => (
          <li key={rival.id} className={cn("grid grid-cols-[1fr_auto_auto_3.6rem] items-center gap-3", rival.lives === 0 && "text-muted-foreground line-through")}>
            <b className="font-medium" style={{ color: CHARS[rival.fighter].color }}>{rival.name}{rival.me && " (you)"}</b>
            <span className="text-destructive">{"●".repeat(rival.lives)}</span>
            <span>{rival.kos} K.O.</span>
            <Signal rival={rival} />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">{pro && standing.status === "alone" ? "Waiting for another paid fighter. Leave now and your fee comes back."
        : standing.status === "starting" ? <>{STATUS.starting} <b className="text-foreground tabular-nums">{Math.ceil((standing.startsIn ?? 0) / 1000)}</b></> : STATUS[standing.status]}</p>
      {!pro && code && <SmallButton className="pointer-events-auto justify-self-start" onClick={copy}>{copied ? "Link copied" : "Copy invite link"}</SmallButton>}
      <SmallButton className="pointer-events-auto justify-self-start" onClick={onLeave}>Leave match</SmallButton>
      {phone && <SmallButton className="pointer-events-auto justify-self-start" onClick={() => setOpen(false)}>Close</SmallButton>}
      {link && <input readOnly aria-label="Invite link" value={link} onFocus={(event) => event.currentTarget.select()} className="pointer-events-auto w-full border border-foreground bg-background px-1.5 py-1 font-mono text-[11px]" />}
    </aside>
  );
}

/**
 * Five Blades: the title, the fighter select and the fight, each offered exactly when the rules allow it.
 * @model spec/app/index.md
 */
export function App({ runtime }: { runtime: Runtime }) {
  const { getAccessToken, authenticated, user } = useAuth();
  const proFee = useEntryFee();
  // An account that has been given every ability (granted.ts) fights with all five, whatever its campaigns have taught it.
  const [granted, setGranted] = useState(false);
  useEffect(() => { let live = true; void grantedAll(user?.email).then((yes) => { if (live) setGranted(yes); }); return () => { live = false; }; }, [user?.email]);
  useEffect(() => { setTokenProvider(getAccessToken); }, [getAccessToken]);
  useEffect(() => { if (user?.id) track("signin"); }, [user?.id]);
  const { match, rules, send } = useMatch(runtime);
  const { saga, send: tell } = useSaga(runtime);
  const cloudChecked = useRef(false);
  useEffect(() => {
    if (cloudChecked.current || !authenticated || saga === undefined) return;
    cloudChecked.current = true;
    pullCloudSaga().then((result) => {
      if (result === true) location.reload();
      else if (typeof result === "object" && result !== null) setConflict(result as ConflictInfo);
    });
  }, [authenticated, saga]);
  const [banner, sayBanner] = useSaid(1200);
  const [callout, sayCallout] = useSaid(1100);
  const [caption, sayCaption] = useSaid(7000);
  const [showProfile, setShowProfile] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  // Which way in was taken, and the level of the campaign in play: the page's own, not the match's.
  const [campaign, setCampaign] = useState(false);
  const [level, setLevel] = useState<Level | null>(null);
  const playing = useRef<Level | null>(null);
  const inCampaign = useRef(false);
  useEffect(() => { playing.current = level; inCampaign.current = campaign; }, [level, campaign]);
  // The guide's talk at the start of a level: which line he is on. The page's own, like which level is in play.
  const [talk, setTalk] = useState<{ lines: string[]; at: number; who?: string; end?: string; /** Who speaks the last line in place of `who`, and then asks to be heeded over the Reaper. */ voice?: string; /** A boss, whose last line the fighter answers. */ boss?: boolean } | null>(null);
  const [keys, setKeys] = useState({ found: 0, of: 0 });
  // The campaign whose ending is being looked at, over the campaign screen.
  const [ending, setEnding] = useState<Hero | null>(null);
  // The black room after a chapter's question is answered: the power it gave, and whether it has been used yet.
  const [awakening, setAwakening] = useState<{ name: string; slot: number; used: boolean } | null>(null);
  const talking = useRef(false);
  // Against the waves, after a knockout: how far the fight got, until it is started over. The page's own.
  const [lost, setLost] = useState<{ wave: number; kos: number } | null>(null);
  const knocked = useRef(false);
  useEffect(() => { knocked.current = lost !== null; }, [lost]);
  const [muted, setMuted] = useState(false);
  // spec/app/index.md, "Story: Fight other players"
  // The duel's room, once joined, and how the round stands in it: the page's own, as the room is not the match's.
  const [versus, setVersus] = useState(false);
  // Pro mode (pro.ts): Survival or Versus played for an entry fee. `ready` is an entry paid and not yet used, `paidIn`
  // the run or seat being played with one; `afterPay` is what to start once the fee asked for (`paying`) is paid.
  const [pro, setPro] = useState(false), [paying, setPaying] = useState(false), [proNote, setProNote] = useState(""), [choosing, setChoosing] = useState<"Survival" | "Versus" | null>(null), [askParty, setPartyChoice] = useState(false);
  // Whether the campaign was entered for co-op: leaving its matchmaking without a table goes back to the title.
  const coopWay = useRef(false);
  const proOn = useRef(false), ready = useRef<Entry | null>(null), paidIn = useRef<Entry | null>(null), afterPay = useRef<(() => void) | null>(null);
  useEffect(() => { proOn.current = pro; }, [pro]);
  /** Starts `go` at once, or, in pro mode, with a paid entry: the one ready, or one paid for first. */
  const start = (go: () => void) => {
    if (!proOn.current) { paidIn.current = null; return go(); }
    if (!ready.current) { afterPay.current = () => start(go); setPaying(true); return; }
    paidIn.current = ready.current; ready.current = null; setProNote(""); go();
  };
  /** The table of the duel in play, once seated: the arena's code for it, which an invitation carries. */
  const [duelTable, setDuelTable] = useState("");
  const [standing, setStanding] = useState<Standing>({ rivals: [], status: "joining" });
  const net = useRef<Versus | null>(null), inVersus = useRef(false), quiet = useRef(false);
  useEffect(() => { inVersus.current = versus; quiet.current = muted; }, [versus, muted]);
  // Co-op (docs/coop-plan.md, together.ts): the group's table, whether the level in play is played with it and this game
  // hosts it, how the group stands in it, and the host's guide's words as told.
  const together = useRef<Together | null>(null), mySeat = useRef<Hero | null>(null);
  const [coopOpen, setCoopOpen] = useState(false), [table, setTable] = useState<Table | null>(null), [coopError, setCoopError] = useState("");
  const [group, setGroup] = useState<{ host: boolean } | null>(null), [party, setParty] = useState<Standing>({ rivals: [], status: "joining" });
  const [wiped, setWiped] = useState(false), [teamCleared, setTeamCleared] = useState(false), [heardTalk, setHeardTalk] = useState<TalkWord | null>(null);
  // spec/app/index.md, "Story: Fight the waves"
  // A paid run (run.ts): played at the arena server, which keeps its health and its score, and how it last said it stood.
  const paidRun = useRef<Paid | null>(null), runSaid = useRef<RunWord | null>(null);
  const [runWord, setRunWord] = useState<RunWord | null>(null);
  const tick = useCallback(() => { net.current?.tick(); together.current?.versus.tick(); paidRun.current?.tick(); }, []);
  const audio = useMemo(createAudio, []);
  /** The boss speaks before it fights, and the level waits while it does. */
  const bossSpeaks = useRef(() => undefined as void);
  /** Plays a recorded sound at the player's volume for sounds, unless that is off. */
  const sound = useCallback((name: Sample) => audio.sample(name, audio.sfxVol()), [audio]);
  const game = useMemo(() => {
    // spec/app/saga.md, "There are forty things to learn, and a protagonist learns each of them once"
    const clue = (fact: string, text: string) => {
      sayCaption({ text });
      const at = playing.current;
      if (at) void tell({ type: "learn", who: HEROES.indexOf(at.hero), fact: factNumber(fact as FactId) });
    };
    let made: ReturnType<typeof createGame> | null = null;
    const ui: Ui = {
      strike: (to, blow) => (net.current ?? together.current?.versus)?.strike(to, blow), shot: (orb) => (net.current ?? paidRun.current ?? together.current?.versus)?.shot(orb),
      fell: () => (net.current ?? paidRun.current)?.fell(),
      fx: (sprite) => (net.current ?? together.current?.versus)?.fx(sprite),
      foeHit: (uid, blow) => (paidRun.current ?? together.current)?.foeHit(uid, blow), share: (event) => together.current?.share(event),
      wiped: () => setWiped(true), teamClear: () => setTeamCleared(true), pass: (way) => passNow.current(way),
      sample: (name) => audio.sample(name, audio.sfxVol()),
      lost: (here, there) => {
        // A paid run's end and its score are the arena server's, which has put it in the day's pot (run.ts).
        const kept = paidRun.current ? runSaid.current : null, { wave, kos } = kept ?? { wave: here, kos: there };
        setLost({ wave, kos });
        const f = rules.get().fighter;
        if (paidIn.current?.mode === "survival") { paidIn.current = null; setProNote(kept ? "This run is in today's pro pot." : "This run was not played at the arena, so it does not count."); }
        track("survival_end", { wave, kos, fighter: f, seconds: Math.round((performance.now() - began.current) / 1000) });
        const s = recordSurvival(f, wave, kos);
        if (wave >= 10) unlock("wave_10");
        if (wave >= 20) unlock("wave_20");
        if (wave >= 50) unlock("wave_50");
        if (s.totalKos >= 100) unlock("kos_100");
        if (s.fighterPlays.every((p) => p > 0)) unlock("all_fighters");
      },
      used: () => setAwakening((now) => now && { ...now, used: true }),
      // spec/app/saga.md, "Story: Play five campaigns"
      // In a protagonist's second chapter, the one it is up against is glimpsed as the second piece of the key is found.
      keys: (found, of) => { setKeys({ found, of }); if (found === 2 && playing.current?.chapter === 1) sayCaption({ text: WATCHED[playing.current.hero] }); },
      // At the end of its third, that one speaks through the boss that has just fallen, and the level waits.
      fallen: () => { if (playing.current?.chapter === 2) { setTalk({ ...through(playing.current.hero), at: 0 }); made?.talk(true); talking.current = true; } },
      // Another of the five is in this level: what is seen of them, as the fighter comes near.
      meet: () => { const seen = playing.current && crossing(playing.current.id); if (seen) sayCaption({ text: seen.text }); },
      // The boss speaks before it fights, and the level waits while it does.
      parley: () => bossSpeaks.current(),
      sfx: audio.sfx, rumble, duck: audio.duck, clue, banner: (text, tone) => sayBanner({ text, tone }), callout: (text, sub) => sayCallout({ text, sub: sub && inHand(sub) }) };
    made = createGame(rules, ui);
    // In co-op the boss comes face to face with the group in the arena's level, which tells the host's game (together.ts).
    bossSpeaks.current = () => { const said = playing.current && PARLEY[playing.current.id]; if (said) { setTalk({ ...said, at: 0, boss: repliesOf(playing.current!.id).length > 0 }); made?.talk(true); talking.current = true; } };
    return made;
  }, [rules, audio, sayBanner, sayCallout, sayCaption, tell]);

  // The workbench's checks (workbench/capture/coop.mjs) read the game from the page while it is developed; a built
  // game leaves this out.
  useEffect(() => { if (import.meta.env.DEV) Object.assign(window, { fiveBlades: { game, rules } }); }, [game, rules]);
  const select = useCallback((event: "enter" | "change") => { if (send({ type: event })) game.clearInput(); }, [send, game]);
  // spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"
  // The fighter goes into any fight as the player has built its protagonist: its health, its specials and its paths.
  const built = useCallback(() => {
    const fighter = rules.get().fighter, hero = heroOf(fighter), build = buildOf(hero);
    // What its campaign has taught it, wherever it fights: one thing for each chapter finished.
    send({ type: "train", vigor: 10 * build.health, learned: granted && !proOn.current ? 5 : saga ? Math.min(5, chaptersDone(HEROES.indexOf(hero), saga)) : 0 });
    return [specialsOf(hero, fighter), build] as const;
  }, [rules, send, saga, granted]);
  /** A paid run, just begun here on the stage of `day`, played at the arena server from now on; one it cannot reach
   *  does not count, and its entry is kept for the next. */
  const runAtArena = useCallback((day: number) => {
    paidRun.current?.leave(); paidRun.current = null; runSaid.current = null; setRunWord(null);
    const paid = paidIn.current;
    if (paid?.mode !== "survival") return;
    const heard = (run: RunWord) => { runSaid.current = run; setRunWord(run); };
    void proSeat(paid).then((seat) => joinRun(seat, day, lastName() || nameFor(rules.get().fighter), game, rules, heard))
      .then((run) => { if (paidIn.current === paid) paidRun.current = run; else run.leave(); }, (error: unknown) => {
        console.warn("run:", error);
        if (paidIn.current === paid) { paidIn.current = null; ready.current = paid; }
        setProNote("The arena could not be reached, so this run does not count. Your entry is kept for your next run.");
      });
  }, [game, rules]);
  const fight = useCallback(() => { const mine = built(); if (send({ type: "fight" })) { setLevel(null); const day = today(); game.begin(survivalStage(day), ...mine); runAtArena(day); began.current = performance.now(); sideways(); track("survival_start", { fighter: rules.get().fighter, pro: proOn.current }); } }, [send, game, built, rules, runAtArena]);
  // A paid run is left with the fight against the waves.
  const waves = match?.screen === "Play" && !match.duel && !match.quest;
  useEffect(() => { if (!waves) { paidRun.current?.leave(); paidRun.current = null; } }, [waves]);
  // spec/app/lobby.md, "Story: Find a match"
  /** Takes a seat for the duel in play: a pro seat's match, the table the page's address names, or, for the open
   *  room, wherever matchmaking finds one. */
  const connect = useCallback(() => {
    setStanding({ rivals: [], status: "joining" }); setDuelTable("");
    const paid = paidIn.current?.mode === "versus" ? paidIn.current : null;
    void (paid ? proSeat(paid) : Promise.resolve(undefined))
      .then((seat) => joinVersus(seat ? undefined : roomCode(), lastName() || nameFor(rules.get().fighter), true, game, rules, setStanding, seat))
      .then((room) => { if (rules.get().duel && !net.current) { net.current = room; setDuelTable(room.code); } else room.leave(); })
      .catch((error: unknown) => { console.warn("versus:", error); setStanding({ rivals: [], status: error instanceof Error && error.message === "full" ? "full" : "offline" }); });
  }, [game, rules]);
  // spec/app/index.md, "A duel starts from the select screen like a fight, with three lives and no waves"
  const brawl = useCallback(() => {
    const mine = built();
    if (!send({ type: "duel" })) return;
    setLevel(null);
    game.begin(stageFor(roomCode(), 0), ...mine); began.current = performance.now();
    track("versus_start", { fighter: rules.get().fighter, pro: proOn.current, room: roomCode() });
    connect(); sideways();
  }, [send, game, connect, rules]);
  // An invitation is to the table the inviter is at, matched or private: its code brings a friend to it while it has a seat.
  const invite = useCallback(() => inviteLink(net.current?.code ?? roomCode()), []);
  // The room is left with the duel: for the select screen, the title, or the page going away.
  const dueling = match?.screen === "Play" && match.duel;
  useEffect(() => { if (!dueling) { net.current?.leave(); net.current = null; } }, [dueling]);
  // spec/app/bout.md, "A round begins between two or more, when no round is being fought, and gives everyone full health and three lives"
  // Its last three seconds and its start, across the screen: until it starts no blow counts.
  const countdown = dueling && standing.status === "starting" && standing.startsIn !== undefined ? Math.ceil(standing.startsIn / 1000) : 0;
  useEffect(() => { if (countdown >= 1 && countdown <= 3) sayBanner({ text: String(countdown) }); }, [countdown, sayBanner]);
  const roundOn = dueling && standing.status === "fighting" && standing.rivals.length > 1;
  useEffect(() => { if (roundOn) sayBanner({ text: "Fight!", tone: "red" }); }, [roundOn, sayBanner]);
  useEffect(() => {
    if (standing.status !== "over") return;
    sound("over");
    track("versus_end", { winner: standing.winner ?? null, won: standing.winner === nameFor(rules.get().fighter), players: standing.rivals.length, seconds: Math.round((performance.now() - began.current) / 1000) });
  }, [standing.status, sound]);
  // spec/app/bout.md, "Story: Fight for the pot"
  // A pro seat's match is settled by the arena server, which has the pot paid to the one it saw left standing.
  useEffect(() => {
    if (paidIn.current?.mode === "versus" && standing.status === "over") setProNote(standing.winner ? `The pot is on its way to ${standing.winner}.` : "No one was left standing: the match goes to review.");
  }, [standing.status, standing.winner]);
  // The last life of a quest gone: its sound, each time it goes.
  const spent = match?.screen === "Play" && match.quest && !match.alive && match.lives === 1;
  useEffect(() => { if (spent) { sound("lost"); track("game_over", { level: playing.current?.id }); } }, [spent, sound]);
  // A kind of game chosen from the main menu.
  const chime = useCallback(() => sound("start"), [sound]);
  // The main menu: its music is the soundtrack's (audio.ts, `throne`), from the moment it is come to.
  const onMenu = match?.screen === "Title";
  // A choice made in any menu but the main one, which has its own sound: every button but those of the touch controls.
  useEffect(() => {
    if (onMenu) return;
    const chosen = (event: MouseEvent) => { const button = event.target instanceof Element ? event.target.closest("button") : null; if (button && !button.closest('[aria-label="Touch controls"]')) sound("ui"); };
    window.addEventListener("click", chosen, true);
    return () => window.removeEventListener("click", chosen, true);
  }, [onMenu, sound]);
  // spec/app/index.md, "Story: Fight the waves"
  // The soundtrack (audio.ts, musicFor): the main menu's, the credits' while they are open, and in a
  // fight the music of its mode, boss, place or region. It is looked at a few times a second, since the sky, the wave and
  // whether a boss is being fought change without the page being told. A dark place keeps the synthesised music. A
  // fight against the waves has a level of its own too: only a quest or a hero's world is the campaign.
  const inPlay = match?.screen === "Play";
  const [creditsOpen, setCreditsOpen] = useState(false);
  useEffect(() => {
    const pick = Math.floor(Math.random() * 1e6);
    const tune = () => {
      const S = game.scene, sky = S.level?.sky ?? S.sky;
      const boss = S.locked && S.enemies.some((E) => E.boss && E.alive);
      audio.track(onMenu ? (creditsOpen ? "credits" : "throne") : inPlay && !S.dark ? musicFor({ sky, level: S.match.quest || S.match.world ? S.level : null, versus, wave: S.match.wave, boss, pick }) : null);
    };
    tune();
    const timer = window.setInterval(tune, 400);
    return () => window.clearInterval(timer);
  }, [inPlay, onMenu, creditsOpen, versus, game, audio]);
  // spec/app/index.md, "A level starts from the select screen like a fight, but as a quest with three lives"
  // spec/app/index.md, "A hero's world starts from the select screen like a level, with the dash as the save remembers it"
  // An area of a world (levels.ts) is set out on as one, alone: its boss gone once beaten, its dash there once the
  // first area's boss has fallen, and the Reaper's talk only on first coming to an area not yet beaten.
  const embark = useCallback((made: Level, together?: { fighter: number; host: boolean }, fromEnd = false) => {
    const wandering = !together && inWorld(made.hero, made.chapter);
    const done = saga ? chaptersDone(HEROES.indexOf(made.hero), saga) : 0, beaten = wandering && done > made.chapter;
    // The level as the world now has it (story/world.ts). With a co-op group it is played as it was made: the world one
    // player's campaign has shaped is theirs alone, and every game of the group must lay out the same level.
    const turns = saga && !together ? turnsOf(saga) : [], next = saga && !together ? shaped(made, saga) : made;
    // In co-op each plays the protagonist they took at the table.
    send({ type: "focus", pick: together ? together.fighter : PROTAGONISTS.find((p) => p.id === next.hero)!.fighter });
    const mine = built();
    if (!send(wandering ? { type: "wander", owns: done >= 1 } : { type: "embark" })) return;
    paid.current = null; setRefused(false);
    // Kept as it was made, so that setting out on it again shapes it afresh and not twice.
    setLevel(made); playing.current = made;
    // In co-op the level's world is the arena's (arena/level.ts): every game of the group is its guest, and the host
    // leads the group's talk.
    const part = together ? { host: together.host } : null;
    game.coop(together ? { host: false } : null); setGroup(part); setWiped(false); setTeamCleared(false); setHeardTalk(null);
    game.begin(wandering ? area(next, beaten, fromEnd) : next, ...mine); sideways();
    game.title(PARLEY[made.id]?.who ?? null);
    began.current = performance.now(); setWent(null);
    track("chapter_start", { level: made.id, hero: made.hero, chapter: made.chapter + 1 });
    // Its name is shown once the Reaper has had his say.
    naming.current = `${PROTAGONISTS.find((p) => p.id === made.hero)!.title} · chapter ${made.chapter + 1}|${made.name}`;
    if (turns.some((turn) => turn.key === "unboundStrong")) game.gift();
    // Where the roads cross, another of the five stands by the second thing there is to find (alone: in co-op they are there).
    const other = crossing(next.id), by = next.clues[1], them = other && PROTAGONISTS.find((p) => p.id === other.who)!;
    if (them && by && !together) game.visit({ id: "crossing", name: them.title, fighter: them.fighter, x: by.x + 110, y: by.y, vx: 0, vy: 0, facing: -1, hp: 100, lives: 0, alive: true, glow: false, guard: false, over: false, special: null, at: { anim: "idle", frame: 0 } });
    // The guide meets the fighter where the level starts, and the level waits while he talks.
    // He begins with how the chapter before went, and what came of the choice made after it.
    const lines = [...reckoning(next.hero, next.chapter), ...echoOf(next.hero, next.chapter), ...turns.map((turn) => turn.reaper), ...(next.talk ?? [])];
    // Its other voice has the last word, and does not agree with him (story/voices.ts).
    const voice = VOICES[next.hero], answer = voice.says[next.chapter];
    // A co-op guest hears the host's guide instead (`heardTalk`).
    if (lines.length && (!together || together.host) && !beaten && !fromEnd) { setTalk({ lines: answer ? [...lines, answer] : lines, at: 0, voice: answer ? voice.name : undefined }); game.talk(true); talking.current = true; }
  }, [send, game, built, saga]);
  // Co-op: the host's guide is told to the group as he talks, and a guest's level waits while he does, as the host's does.
  useEffect(() => { if (group?.host) together.current?.say(talk ? { lines: talk.lines, at: talk.at, who: talk.who, end: talk.end, voice: talk.voice, choices: talk.at + 1 === talk.lines.length && (talk.voice || talk.boss) ? ["choosing"] : undefined } : null); }, [talk, group]);
  useEffect(() => { if (group && !group.host) game.talk(!!heardTalk); }, [heardTalk, group, game]);
  const embarkNow = useRef(embark);
  useEffect(() => { embarkNow.current = embark; }, [embark]);
  /** Sits down at the table `code`, or wherever matchmaking finds a group: what it says comes to the page. */
  const sit = useCallback(async (code?: string) => {
    setCoopError("");
    together.current?.leave(); together.current = null; setTable(null);
    try {
      together.current = await joinTogether(code, lastName() || `Blade-${100 + Math.floor(Math.random() * 900)}`, game, rules, {
        table: setTable,
        start: (id, host) => {
          const made = levelById(id), hero = mySeat.current;
          if (!made || !hero) return;
          setCoopOpen(false);
          embarkNow.current(made, { fighter: PROTAGONISTS.find((p) => p.id === hero)!.fighter, host });
        },
        host: (host) => setGroup({ host }),
        parley: () => bossSpeaks.current(),
        talk: setHeardTalk,
        standing: setParty,
      });
    } catch (error) { setCoopError(error instanceof Error && error.message === "full" ? "That table is full: five sit at it." : "The table could not be reached. Try again."); }
  }, [game, rules]);
  // An invitation to a table (`?together=<code>`, Coop.tsx): from the home screen straight to the campaign and the table.
  const invitedTo = useRef(new URLSearchParams(location.search).get("together")?.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase() || null);
  useEffect(() => {
    if (!invitedTo.current || match?.screen !== "Title") return;
    const code = invitedTo.current;
    invitedTo.current = null;
    setCampaign(true); setVersus(false); setPro(false); select("enter");
    coopWay.current = true; setCoopOpen(true); void sit(code);
  }, [match?.screen, select, sit]);
  const standUp = useCallback(() => { together.current?.leave(); together.current = null; mySeat.current = null; setTable(null); setGroup(null); game.coop(null); }, [game]);
  /** Back at the table after a level played with the group, however it ended. */
  const backToTable = useCallback(() => {
    together.current?.back(); setGroup(null); game.coop(null); setWiped(false); setTeamCleared(false); setHeardTalk(null);
    if (together.current) setCoopOpen(true);
  }, [game]);
  // Before a protagonist's first chapter, the first time it is set out on in a visit: who it is up against, and who the Reaper is.
  // The level is laid out only when it is set out on, after anything told before it.
  // What the fighter gave the Reaper to be let off in this level, if it was; and whether it turned him down.
  const paid = useRef<string | null>(null), [refused, setRefused] = useState(false);
  const bargain = useCallback((with_: "strength" | "memory") => {
    const at = playing.current;
    if (!at || !saga) return;
    if (with_ === "strength") { pay(at.hero, chaptersDone(HEROES.indexOf(at.hero), saga)); paid.current = "strength"; }
    else { paid.current = memoryOf(at.hero) ?? null; give(at.hero); }
    game.bargain();
  }, [saga, game]);
  const [prelude, setPrelude] = useState<Hero | null>(null), told = useRef(new Set<Hero>());
  // The opening cutscene's music, looped from its first card until the chapter begins or the cards are skipped.
  useSong(match?.screen === "Select" && !!campaign && prelude !== null, "story", audio, muted, true);
  // A level that cannot be laid out is said to be shut, where otherwise nothing at all would happen.
  const [shut, setShut] = useState(false);
  useEffect(() => { if (!shut) return; const timer = window.setTimeout(() => setShut(false), 4000); return () => window.clearTimeout(timer); }, [shut]);
  const open = useCallback((hero: Hero, chapter: number) => {
    try { embark(levelOf(hero, chapter)!); } catch (error) { console.error(error); setShut(true); }
  }, [embark]);
  const play = useCallback((hero: Hero, chapter: number) => {
    if (chapter === 0 && saga && chaptersDone(HEROES.indexOf(hero), saga) === 0 && !told.current.has(hero)) { told.current.add(hero); setPrelude(hero); }
    else open(hero, chapter);
  }, [saga, open]);
  useEffect(() => { if (!campaign) { setPrelude(null); setEnding(null); } }, [campaign]);
  const hush = useCallback(() => { setTalk(null); game.talk(false); talking.current = false; }, [game]);
  // Whom the fighter heeds, of the Reaper and its other voice: kept, and the one passed over has a last word.
  const heeding = useCallback((whom: "reaper" | "voice") => {
    const at = playing.current;
    if (!at) return;
    heed(at.hero, at.id, whom);
    setTalk(whom === "reaper" ? { lines: [VOICES[at.hero].unheeded], at: 0, who: VOICES[at.hero].name, end: "Begin" } : { lines: [REAPER_UNHEEDED], at: 0, end: "Begin" });
  }, []);
  // How the fighter answers the boss: kept, told to the fight, and the boss has its own word back (parley.ts, repliesOf).
  const answering = useCallback((how: Stance) => {
    const at = playing.current, back = at && repliesOf(at.id).find((each) => each.how === how)?.back;
    if (!at) return;
    stand(at.hero, at.id, how);
    if (how !== "silent") { game.answer(how); together.current?.answer(how); }
    if (back) setTalk({ lines: [back], at: 0, who: PARLEY[at.id].who, end: "Fight" });
    else { setTalk(null); game.talk(false); talking.current = false; }
  }, [game]);
  const hear = useCallback(() => setTalk((now) => { if (now && now.at + 1 < now.lines.length) return { ...now, at: now.at + 1 }; if (now?.voice || now?.boss) return now; game.talk(false); talking.current = false; return null; }), [game]);
  // Leaving a level in the middle of the guide's talk ends it.
  const questing = match?.screen === "Play" && match.quest;
  useEffect(() => { if (!questing && talking.current) hush(); }, [questing, hush]);
  // How a level went, taken as it is cleared: for the page that says so, and its best rank kept.
  const began = useRef(0), [went, setWent] = useState<{ seconds: number; lost: number; found: number; of: number } | null>(null);
  // spec/app/index.md, "Story: Explore a hero's world"
  // An area of a world is never cleared: the first time its way out is reached, its page (how it went, its question)
  // is shown over it, held, and from there the fighter goes on into the next area.
  const [passing, setPassing] = useState(false);
  useEffect(() => { if (match?.screen !== "Play") setPassing(false); }, [match?.screen]);
  const cleared = match?.screen === "Play" && (match.cleared || passing);
  useEffect(() => {
    const at = playing.current;
    if (!cleared || !at) return;
    const how = { seconds: Math.round((performance.now() - began.current) / 1000), lost: 3 - rules.get().lives, found: game.scene.cluesFound.length, of: at.clues.length };
    setWent(how); keepRank(at.id, rankOf(how));
    track("chapter_clear", { level: at.id, hero: at.hero, chapter: at.chapter + 1, ...how, rank: rankOf(how) });
  }, [cleared, rules, game]);
  // Drawn again when a setting kept outside the page's state is changed.
  const [, setRedrawn] = useState(0);
  // How long a fight of waves lasted, taken as its fighter is knocked out.
  const [lasted, setLasted] = useState(0);
  useEffect(() => { if (lost) setLasted(Math.round((performance.now() - began.current) / 1000)); }, [lost]);
  // A level's title, shown across the screen as its fighter is let go into it.
  const naming = useRef<string | null>(null);
  useEffect(() => {
    if (talk || !questing || !naming.current) return;
    const [chapter, name] = naming.current.split("|");
    naming.current = null;
    sayBanner({ text: name, tone: "gold" }); sayCallout({ text: chapter });
  }, [talk, questing, sayBanner, sayCallout]);
  // spec/app/saga.md, "A chapter can be finished only by one of the five, and only while that campaign has chapters left"
  // A chapter counts the first time it is cleared: replaying it moves neither the campaign nor the world.
  const counts = level !== null && saga !== undefined && chaptersDone(HEROES.indexOf(level.hero), saga) === level.chapter;
  // spec/app/index.md, "Story: Play a level of a campaign"
  // The black room (story/within.ts): from the select screen, `hero` goes in with the special its answer `said`, of
  // the school `school`, has just given it for its place `slot`. It is told why the answer made the power and to use
  // it, and the room waits while it is told.
  const awaken = useCallback((hero: Hero, slot: number, school: number, said: string) => {
    const fighter = PROTAGONISTS.find((p) => p.id === hero)!.fighter, build = buildOf(hero), power = CHARS[school].specials[slot];
    send({ type: "focus", pick: fighter });
    // spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"
    send({ type: "train", vigor: 10 * build.health, learned: slot + 1 });
    if (!send({ type: "embark" })) return;
    setLevel(null);
    game.begin(within(hero), specialsOf(hero, fighter), build);
    game.trial(slot);
    setAwakening({ name: power.name, slot, used: false });
    setTalk({ who: "Within", lines: [`You chose: ${said}`, WHY[school][slot], `It is in you now. ${power.name}. Use it: ${SPECIAL_INPUTS[slot].slice(0, -1).join(" ")}, then blast.`], at: 0, end: "Use it" });
    game.talk(true); talking.current = true;
  }, [send, game]);
  /** From the play screen into another area of the hero's world, by its start or back in by its way out. Past the
   *  world's last area its campaign goes on in levels: the fighter is back on the campaign's page. */
  const enterArea = useCallback((hero: Hero, chapter: number, fromEnd: boolean) => {
    send({ type: "openMoves" }); send({ type: "change" });
    if (!inWorld(hero, chapter)) return;
    try { embark(levelOf(hero, chapter)!, undefined, fromEnd); } catch (error) { console.error(error); setShut(true); }
  }, [send, embark]);
  // What the fighter does after the black room, when it went in between two areas of a world: on into the next.
  const afterRoom = useRef<(() => void) | null>(null);
  const passNow = useRef<(way: 1 | -1) => boolean>(() => false);
  useEffect(() => {
    passNow.current = (way) => {
      const at = playing.current;
      if (!at || group || !inWorld(at.hero, at.chapter) || at.chapter + way < 0) return false;
      if (way === 1 && counts) { setPassing(true); game.talk(true); return true; }
      enterArea(at.hero, at.chapter + way, way === -1);
      return true;
    };
  }, [counts, group, game, enterArea]);
  const carryOn = useCallback(async (from?: number) => {
    const wandering = level !== null && !group && inWorld(level.hero, level.chapter);
    // How it went, for the Reaper to speak of where the next chapter starts: each life lost was one of three.
    if (level) remember(level.hero, { id: level.id, name: level.name, chapter: level.chapter, deaths: 3 - rules.get().lives, paid: paid.current ?? undefined, found: game.scene.cluesFound.length, of: level.clues.length });
    if (level && counts && from !== undefined && level.chapter < 3) choose(level.hero, PROTAGONISTS.find((p) => p.id === level.hero)!.fighter, level.chapter, from);
    if (level && counts && await tell({ type: "finish", who: HEROES.indexOf(level.hero) })) for (const effect of level.effects) await tell({ type: "shift", ...effect });
    // A co-op fighter out of revives was not there to clear it itself: it leaves as from a lost level. An area of a
    // world was never cleared: it is left the same way, for the next area.
    if (wandering) { setPassing(false); game.talk(false); }
    if (wandering || !send({ type: "leave" })) { send({ type: "openMoves" }); select("change"); }
    if (group) backToTable();
    if (counts) syncSagaToCloud();
    if (counts && level) {
      unlock(`campaign_${HEROES.indexOf(level.hero) + 1}`);
      if (rules.get().lives === 3) unlock("no_death_chapter");
    }
    // The last chapter there is to play, finished for the first time: how the campaign ends (story/endings.ts).
    if (level && counts && !hasLevel(level.hero, level.chapter + 1)) setEnding(level.hero);
    // Having answered, it stands in the black room.
    const said = from !== undefined && counts && level ? DILEMMAS[level.id]?.answers.find((answer) => answer.school === from)?.say : undefined;
    const onward = wandering && level ? () => enterArea(level.hero, level.chapter + 1, false) : null;
    if (level && from !== undefined && said) { awaken(level.hero, level.chapter, from, said); afterRoom.current = onward; }
    else onward?.();
  }, [level, counts, tell, send, rules, game, awaken, group, backToTable, select, enterArea]);
  useEffect(() => { if (match?.screen !== "Play") setAwakening(null); }, [match?.screen]);
  const toggleMoves = useCallback(() => { if (send({ type: "openMoves" }) || send({ type: "closeMoves" })) game.clearInput(); }, [send, game]);
  // Which page of the pause is up (Pause.tsx). Escape steps back a page, and from the first one resumes.
  const [pausePage, setPausePage] = useState<PausePage>("menu"), pageNow = useRef<PausePage>("menu");
  const toPage = useCallback((page: PausePage) => { pageNow.current = page; setPausePage(page); }, []);
  const pause = useCallback((page: PausePage) => { toPage(page); if (send({ type: "openMoves" })) game.clearInput(); }, [toPage, send, game]);
  const toggleMute = useCallback(() => setMuted(audio.toggleMute()), [audio]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      audio.unlock();
      const now = rules.get(), code = event.code;
      const take = (act: () => void) => { event.preventDefault(); act(); };
      // The home screen's keys are its own (TitleScreen, screens.tsx).
      if (now.screen === "Title") return;
      if (now.screen === "Select") {
        if (inCampaign.current) { if (code === "Escape") take(() => send({ type: "back" })); return; }
        const focus = (by: number) => send({ type: "focus", pick: (now.fighter + by + fighters) % fighters });
        if (["ArrowLeft", "KeyA", "ArrowUp", "KeyW"].includes(code)) take(() => focus(-1));
        else if (["ArrowRight", "KeyD", "ArrowDown", "KeyS"].includes(code)) take(() => focus(1));
        else if (CONFIRM.includes(code)) take(() => { sound("ui"); (inVersus.current ? brawl : fight)(); });
        else if (code === "Escape") take(() => send({ type: "back" }));
        return;
      }
      // Knocked out, the keys belong to the name being typed.
      if (knocked.current) return;
      if (talking.current) { if (CONFIRM.includes(code)) take(() => { sound("ui"); hear(); }); else if (code === "Escape") take(hush); return; }
      if (code === "KeyM") return toggleMute();
      if (code === "Escape") return take(() => { if (!now.paused) pause("menu"); else if (pageNow.current !== "menu") toPage("menu"); else toggleMoves(); });
      if (code === "KeyH") return take(() => (now.paused ? toggleMoves() : pause("moves")));
      const key = KEYMAP[code];
      if (now.paused || !key) return;
      event.preventDefault();
      if (!event.repeat) game.press(key);
    };
    const up = (event: KeyboardEvent) => { const key = KEYMAP[event.code]; if (key) { event.preventDefault(); game.release(key); } };
    const blur = () => (["left", "right", "up", "jump", "down", "grab", "charge", "guard"] as const).forEach(game.release);
    addEventListener("keydown", down); addEventListener("keyup", up); addEventListener("blur", blur);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); removeEventListener("blur", blur); };
  }, [audio, rules, send, game, select, fight, brawl, toggleMoves, toggleMute, hear, hush, sound, pause, toPage]);

  // Whoever opens an invitation is taken straight to choosing a fighter for it.
  const invited = useRef(false);
  useEffect(() => {
    if (invited.current || match?.screen !== "Title" || !new URLSearchParams(location.search).has("room")) return;
    invited.current = true;
    setCampaign(false); setVersus(true); setPro(false); select("enter");
  }, [match?.screen, select]);

  /** What the pause offers besides resuming, its pages and settings: the level again from its start (alone, on a
   *  quest), another fighter or chapter, and the main menu, which leaves a duel or a table the way their own buttons do. */
  const pauseActions = (): PauseAction[] => {
    const now = rules.get(), out: PauseAction[] = [];
    if (now.quest && level && !group) out.push({ label: "Restart level", act: () => { if (send({ type: "change" })) embark(level); } });
    if (!now.duel) out.push({ label: now.quest ? "Choose chapter" : "Change fighter", act: () => select("change") });
    out.push({ label: "Main menu", act: () => { if (now.duel) leaveMatch(); else { if (group) standUp(); select("change"); } send({ type: "back" }); } });
    return out;
  };

  const leaveMatch = () => {
    // A pro seat left before anyone else joined its match gets its fee back (server/api/_pro.js, withdraw).
    const paid = paidIn.current;
    paidIn.current = null;
    if (paid?.mode === "versus" && standing.status !== "over" && standing.rivals.length < 2)
      void proWithdraw(paid.id).then(() => setProNote("Nobody else joined, so your entry fee is on its way back."), (error: unknown) => setProNote(error instanceof Error ? error.message : "The fee could not be returned."));
    send({ type: "openMoves" }); select("change");
  };

  // Looking away from a fight against the game stops it: the move list comes up, as if H had been pressed. A duel
  // goes on, since the other players do.
  useEffect(() => {
    const away = () => { audio.sleep(document.hidden); const now = rules.get(); if (document.hidden && now.screen === "Play" && !now.duel && !now.paused) pause("menu"); };
    document.addEventListener("visibilitychange", away);
    return () => document.removeEventListener("visibilitychange", away);
  }, [rules, pause]);
  // What a controller is for just now (gamepad.ts): the fight while there is one to fight and nothing over it to
  // read or press, the fighter select, or whatever else is on the page.
  const padMode = useRef<PadMode>("menu");
  useEffect(() => {
    padMode.current = !match ? "menu" : match.screen === "Select" && !campaign ? "select"
      : match.screen === "Play" && !match.paused && !match.cleared && match.alive && !talk && !awakening?.used ? "fight" : "menu";
  }, [match, campaign, talk, awakening]);
  useGamepad(padMode);
  // The phone's back button (and a browser's): off the title screen it does what Escape does there, and pauses or
  // resumes a fight, rather than leaving the game. From the title screen it leaves, as an app's should. An entry is
  // kept in the history for it to take while the game is away from the title.
  const offTitle = !!match && match.screen !== "Title";
  useEffect(() => {
    if (!offTitle) return;
    if (!history.state?.five) history.pushState({ five: true }, "");
    const back = () => {
      const now = rules.get();
      if (now.screen === "Title") return;
      history.pushState({ five: true }, "");
      if (now.screen === "Play" && !talking.current && !document.querySelector('[aria-label="Before it begins"]')) { if (now.paused) toggleMoves(); else pause("menu"); }
      else window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", key: "Escape", bubbles: true, cancelable: true }));
    };
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
  }, [offTitle, rules, toggleMoves, pause]);
  // While a fight is on, the screen is kept awake: a thumb on the glass is not what a phone counts as being used.
  const awake = match?.screen === "Play" && !match.paused;
  useEffect(() => {
    if (!awake || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null, done = false;
    const hold = () => { if (!done && document.visibilityState === "visible") void navigator.wakeLock.request("screen").then((got) => { if (done) void got.release(); else lock = got; }, () => undefined); };
    hold();
    // A lock is let go whenever the page is hidden, and taken again when it is back.
    document.addEventListener("visibilitychange", hold);
    return () => { done = true; document.removeEventListener("visibilitychange", hold); void lock?.release().catch(() => undefined); };
  }, [awake]);
  // Until what has been kept of the match and the saga is read, the page stays as it was before the game came: the home screen without its ways in.
  if (!match || !saga) return <div className="relative h-dvh overflow-hidden"><TitleBackdrop /></div>;
  // Light lettering over a dark sky, dark over a pale one: whichever sky the place in play has.
  const skyNow = game.scene.level?.sky ?? game.scene.sky, lit = game.scene.dark || (skyNow ? skyIsDark(skyNow) : !!level?.theme);
  const c = CHARS[match.fighter];
  // What is said across the fight: lettered with a rim of the page's own colour, to be read over any backdrop.
  const said = "pointer-events-none absolute inset-x-0 text-center font-display font-bold uppercase transition-opacity duration-base [text-shadow:0_0_2px_var(--background),0_0_8px_var(--background),0_2px_0_var(--background)]";
  // A fighter's colour as it shows over the place in play: ink, which a dark place would swallow, becomes the page's lettering.
  const shown = lit && parseInt(c.color.slice(1, 3), 16) + parseInt(c.color.slice(3, 5), 16) + parseInt(c.color.slice(5, 7), 16) < 150 ? "var(--foreground)" : c.color;

  return (
    <main className={cn("relative h-dvh overflow-hidden", match.screen === "Play" && lit && "dark text-foreground")} onPointerDown={audio.unlock} onContextMenu={(event) => event.preventDefault()}>
      <TurnPhone />
      <Arena game={game} before={tick} />
      <Curtain on={`${match.screen}${campaign ? " campaign" : ""} ${level?.id ?? ""}${awakening ? " within" : ""}`} />
      {match.screen === "Title" && <>
        <TitleScreen onCredits={setCreditsOpen} onCampaign={() => setPartyChoice(true)} onArena={() => setChoosing("Survival")} onVersus={() => setChoosing("Versus")} onProfile={() => setShowProfile(true)} settings={<Preferences audio={audio} onChange={() => setRedrawn((n) => n + 1)} />} onMove={() => audio.sample("ui", audio.sfxVol() * 0.45)} busy={showProfile || !!conflict || !!choosing || askParty} />
        {askParty && <PartyChoice onBack={() => setPartyChoice(false)} onPick={(coop) => { chime(); setPartyChoice(false); coopWay.current = coop; setCampaign(true); setVersus(false); setPro(false); select("enter"); if (coop) setCoopOpen(true); }} />}
        {choosing && <TierChoice mode={choosing} onBack={() => setChoosing(null)} onPick={(paid) => { chime(); setCampaign(false); setVersus(choosing === "Versus"); setPro(paid); setChoosing(null); select("enter"); }} />}
        {showProfile && saga && <Profile saga={saga} onClose={() => setShowProfile(false)} />}
        {conflict && (
          <div className="absolute inset-0 z-40 grid [place-items:safe_center] bg-background/80 px-4 py-4">
            <section className="grid w-full max-w-[440px] gap-3 border-2 border-foreground bg-card px-6 py-5 text-center shadow-[6px_6px_0_var(--foreground)]">
              <p className="text-xs tracking-[0.2em] text-destructive uppercase">Cloud conflict</p>
              <p className="text-[13px] leading-relaxed">Your local save and your cloud save are different. Which one should be kept?</p>
              <div className="flex justify-center gap-3">
                <BigButton onClick={() => { resolveConflict("local", conflict); setConflict(null); }}>Keep local</BigButton>
                <BigButton className="border-foreground bg-card text-foreground" onClick={() => { resolveConflict("cloud", conflict); setConflict(null); location.reload(); }}>Keep cloud</BigButton>
              </div>
            </section>
          </div>
        )}
      </>}
      {match.screen === "Select" && campaign && <CampaignScreen saga={saga} onPlay={play} onEnding={setEnding} />}
      {match.screen === "Select" && campaign && prelude && <Prelude hero={prelude} onDone={() => { const hero = prelude; setPrelude(null); open(hero, 0); }} />}
      {match.screen === "Select" && campaign && shut && <p role="alert" className="dark absolute inset-x-0 bottom-6 z-50 mx-auto w-fit border-2 border-destructive bg-[#05080a] px-4 py-2 text-center text-sm text-foreground">That chapter cannot be opened just now. Try another, or come back to it.</p>}
      {match.screen === "Select" && campaign && ending && <Ending hero={ending} onDone={() => setEnding(null)} />}
      {match.screen === "Select" && campaign && coopOpen && (
        <CoopTable table={table} saga={saga} error={coopError} onJoin={(code) => void sit(code)}
          onSeat={(hero) => { mySeat.current = hero; together.current?.seat(hero); }} onReady={(on) => together.current?.ready(on)}
          onChoose={(id) => together.current?.choose(id)} onStart={() => together.current?.start()}
          onLeave={() => { if (table) standUp(); else { setCoopOpen(false); if (coopWay.current) { coopWay.current = false; send({ type: "back" }); } } }} />
      )}
      {match.screen === "Select" && !campaign && <SelectScreen match={match} mine={{ specials: specialsOf(heroOf(match.fighter), match.fighter), learned: granted && !pro ? 5 : Math.min(5, chaptersDone(HEROES.indexOf(heroOf(match.fighter)), saga)), build: buildOf(heroOf(match.fighter)) }} onFocus={(pick) => send({ type: "focus", pick })} onFight={() => start(versus ? brawl : fight)} onBack={() => send({ type: "back" })} go={pro ? "Pay & enter" : versus ? "Enter match" : "Fight"}
        extra={pro ? <p className="border-2 border-destructive bg-card px-4.5 py-3 text-[12.5px]"><b className="font-sans tracking-[0.12em] uppercase">Pro {versus ? "Versus" : "Survival"}</b> · {proFee || "$BLADES"} entry{proNote && <span role="status" className="mt-1 block text-muted-foreground">{proNote}</span>}</p> : versus ? <MatchPicker /> : undefined} />}
      {match.screen === "Play" && (
        <>
          <Hud match={paidRun.current && runWord ? { ...match, wave: runWord.wave, kos: runWord.kos } : match} keys={keys} />
          <Combo match={match} />
          {/* A first fight is coached, while there is a fight on and nothing over it. */}
          {match.alive && !match.paused && !match.cleared && !talk && !awakening && <Coach match={match} />}
          {group && <CoopParty standing={party} revivesLeft={Math.max(0, match.lives - 1 + (match.spared ? 0 : 1))} />}
          {wiped && <Wiped onTable={() => { send({ type: "openMoves" }); select("change"); backToTable(); }} />}
          {heardTalk && !talk && match.quest && !match.paused && <GuideTalk who={heardTalk.voice && heardTalk.at + 1 === heardTalk.lines.length ? heardTalk.voice : heardTalk.who} watching={heardTalk.choices?.length ? "The host is choosing…" : "The host reads on…"} line={heardTalk.lines[heardTalk.at]} at={heardTalk.at} of={heardTalk.lines.length} onNext={() => undefined} onSkip={() => undefined} />}
          {match.duel && <VersusPanel standing={standing} onInvite={invite} onLeave={leaveMatch} code={duelTable} pro={paidIn.current?.mode === "versus"} />}
          {match.duel && standing.status === "over" && <MatchOver standing={standing} onAgain={pro ? leaveMatch : () => net.current?.again()} onLeave={leaveMatch} again={pro ? "New pro match" : undefined} note={pro ? proNote : undefined} />}
          <p role="status" className={cn(said, "top-[22%] text-[clamp(18px,3.4vw,30px)] tracking-[0.22em]", !callout.on && "opacity-0")} style={{ color: shown }}>
            {callout.text}
            {callout.sub && <small className="mt-0.5 block font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground">{callout.sub}</small>}
          </p>
          <p
            role="status"
            className={cn(said, "top-[34%] text-[clamp(40px,9vw,84px)] tracking-[0.12em]", banner.tone === "red" && "text-destructive", banner.tone === "gold" && "[-webkit-text-stroke:1.5px_var(--foreground)]", !banner.on && "scale-115 opacity-0")}
            style={banner.tone === "gold" ? { color: c.aura } : undefined}
          >
            {banner.text}
          </p>
          <div className="absolute right-4 bottom-3.5 flex gap-2 pointer-coarse:top-[62px] pointer-coarse:bottom-auto">
            {match.quest ? (
              <>
                <KitIcon icon="moves" label="Pause" onClick={() => pause("menu")} />
                <KitIcon icon={muted ? "muted" : "sound"} label={`Sound ${muted ? "off" : "on"}`} aria-pressed={muted} onClick={toggleMute} />
              </>
            ) : (
              <>
                <SmallButton className="border font-mono font-medium text-muted-foreground" onClick={() => pause("menu")}>Pause</SmallButton>
                <SmallButton className="border font-mono font-medium text-muted-foreground" aria-pressed={muted} onClick={toggleMute}>Sound {muted ? "off" : "on"}</SmallButton>
              </>
            )}
          </div>
          <TouchPad game={game} fighter={match.fighter} />
          <p role="status" className={cn("pointer-events-none absolute inset-x-0 bottom-[12%] mx-auto max-w-[640px] px-4 text-center text-[13px] leading-normal transition-opacity duration-slow", !caption.on && "opacity-0")}>
            <span className="bg-background/85 px-2 py-1 box-decoration-clone">{caption.text}</span>
          </p>
          {talk && match.quest && !match.paused && <GuideTalk who={talk.voice && talk.at + 1 === talk.lines.length ? talk.voice : talk.who} end={talk.end} choices={talk.at + 1 < talk.lines.length ? undefined : talk.voice ? [{ say: "Heed the Reaper", pick: () => heeding("reaper") }, { say: `Heed ${talk.voice}`, pick: () => heeding("voice") }] : talk.boss && level ? repliesOf(level.id).map((each) => ({ say: each.say, pick: () => answering(each.how) })) : undefined} line={talk.lines[talk.at]} at={talk.at} of={talk.lines.length} onNext={hear} onSkip={hush} />}
          {lost && !match.quest && !match.duel && !match.paused && <KnockedOut lost={lost} fighter={match.fighter} went={{ seconds: lasted, best: match.best, found: match.found.length }} onAgain={() => start(() => { setLost(null); began.current = performance.now(); game.again(); runAtArena(today()); })} onLeave={() => { setLost(null); send({ type: "openMoves" }); select("change"); }} />}
          {match.quest && !match.alive && match.lives === 1 && !match.paused && level && !match.spared && !refused && saga && !(group && party.rivals.length > 1) && <Bargain memory={memoryOf(level.hero)} strength={canPay(level.hero, chaptersDone(HEROES.indexOf(level.hero), saga))} onGive={bargain} onRefuse={() => setRefused(true)} />}
          {match.quest && !match.alive && match.lives === 1 && !match.paused && level && (match.spared || refused) && !(group && party.rivals.length > 1) && <GameOver level={level} onAgain={() => { send({ type: "openMoves" }); send({ type: "change" }); embark(level); }} onLeave={() => { send({ type: "openMoves" }); select("change"); }} />}
          {awakening && !talk && !match.paused && (
            <p role="status" className="dark pointer-events-none absolute inset-x-0 bottom-[14%] grid justify-items-center gap-2 px-4 text-center text-[14px] text-foreground">
              {awakening.used
                ? <><span>That is <b className="font-sans font-bold tracking-wider text-[#e0b84a] uppercase">{awakening.name}</b>. It goes with you into every fight from now on.</span><KitWord word="Continue" className="pointer-events-auto" onClick={() => { send({ type: "openMoves" }); select("change"); const then = afterRoom.current; afterRoom.current = null; then?.(); }} /></>
                : <span>Use it: <b className="font-sans font-bold text-[#e0b84a]">{SPECIAL_INPUTS[awakening.slot].slice(0, -1).join(" ")}</b>, then <b className="font-sans font-bold text-[#e0b84a]">blast</b>.</span>}
            </p>
          )}
          {(match.cleared || teamCleared || passing) && level && <ChapterClear ask={!group || group.host} level={level} counts={counts} went={went} onContinue={(from) => void carryOn(from)} />}
          {match.paused && (pausePage === "moves"
            ? <MoveList match={match} specials={game.specials()} onResume={toggleMoves} onChange={() => select("change")} extra={<SmallButton className="mt-4" onClick={() => toPage("menu")}>Back</SmallButton>} />
            : <PauseMenu page={pausePage} onPage={toPage} onResume={toggleMoves} actions={pauseActions()} settings={
              <Preferences audio={audio} onChange={() => setRedrawn((n) => n + 1)}>
                <SmallButton onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}>Fullscreen</SmallButton>
              </Preferences>} />)}
        </>
      )}
      {match.screen === "Play" && lost && pro && proNote && <p role="status" className="absolute inset-x-0 top-6 z-30 mx-auto w-fit border-2 border-foreground bg-card px-3 py-1 text-[13px]">{proNote}</p>}
      {paying && <ProEntry mode={versus ? "versus" : "survival"} onCancel={() => { setPaying(false); afterPay.current = null; }}
        onPaid={(entry) => { ready.current = entry; setPaying(false); const go = afterPay.current; afterPay.current = null; go?.(); }} />}
    </main>
  );
}

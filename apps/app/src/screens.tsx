// spec/app/index.md, "Story: Choose a fighter"; spec/app/index.md, "Story: Learn the moves"
import { cn } from "@repo/ui";
import { WalletAddress } from "./WalletAddress.tsx";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { type Board, deleteAccount, reportStanding, standingOf } from "./scores.ts";
import { useAuth } from "./auth.tsx";
import { type Match, blastCostOf, healthOf, lesson, specialCost } from "../gen/app.ts";
import type { Build } from "./story/build.ts";
import { Embers } from "./Embers.tsx";
import { CHARS, FOUND, type Input, type Skin, type SpecialDef, SLOTS, SLOT_INPUTS, SPECIAL_INPUTS, SPECIAL_SHORT, WORDS } from "./game/data.ts";
import { drawPreview } from "./game/render.ts";
import { OUTFITS, RELICS, canWear, outfitOf, skinOf, wear } from "./game/relics.ts";
import { type Quote, TICKERS, quoteOf } from "./prices.ts";

const display = "font-display font-bold uppercase";
const screen = "absolute inset-0 grid [place-items:safe_center] overflow-y-auto bg-background/80 px-4 py-6";

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="mr-1 border border-b-2 border-border bg-card px-1.5 font-mono text-[11px] whitespace-nowrap text-foreground">{children}</kbd>;
}

/** The main action of a screen: an ink block that lifts off its red shadow. */
export function BigButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(display, "cursor-pointer border-2 border-primary bg-primary px-8 py-3 text-base tracking-[0.2em] text-primary-foreground shadow-[5px_5px_0_var(--destructive)] transition-transform duration-fast hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-0.5", className)}
      {...props}
    />
  );
}

export function SmallButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(display, "cursor-pointer border-2 border-foreground bg-card px-3 py-1.5 text-[11px] tracking-[0.12em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}
      {...props}
    />
  );
}

/** The way in: the campaign of The Five Blades, or the arena and its endless waves. */
/** The Survival leaderboard, on the home screen: fetched when it is opened. */
function Leaders() {
  const [board, setBoard] = useState<Board | null>(null), [error, setError] = useState(""), [filter, setFilter] = useState<number | null>(null), [reported, setReported] = useState<number[]>([]);
  const load = (f: number | null) => { setFilter(f); standingOf(undefined, undefined, f ?? undefined).then(setBoard, (e: Error) => setError(e.message)); };
  return (
    <details className="absolute top-3 left-3 z-10 max-w-[min(92vw,360px)] border border-[#e0b84a]/35 bg-black/70 text-[11px] leading-relaxed text-white/85 open:bg-black/90 open:p-3" onToggle={(event) => { if (event.currentTarget.open && !board) load(null); }}>
      <summary className="cursor-pointer list-none px-2 py-1 font-sans font-bold tracking-[0.14em] text-[#f6dfa6] uppercase hover:text-white">Leaderboard</summary>
      <div className="mt-2 mb-1 flex flex-wrap gap-0.5">
        <button type="button" onClick={() => load(null)} className={cn("cursor-pointer rounded px-1.5 py-0.5", filter === null ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80")}>All</button>
        {CHARS.map((c, i) => (
          <button type="button" key={c.id} onClick={() => load(i)} className="cursor-pointer rounded px-1.5 py-0.5 hover:opacity-100" style={{ color: filter === i ? c.color : undefined, opacity: filter === i ? 1 : 0.5 }}>{c.name.slice(0, 3)}</button>
        ))}
      </div>
      {error ? <p>{error}</p> : !board ? <p>Loading…</p> : board.top.length === 0 ? <p>Nobody is on the board yet.</p> : (
        <ol className="grid gap-0.5 tabular-nums">
          {board.top.map((row, i) => (
            <li key={row.id} className="grid grid-cols-[2em_1fr_auto_auto_1.4em] gap-3">
              <span className="text-right text-white/50">{i + 1}</span><b className="truncate font-medium" style={{ color: CHARS[row.fighter]?.color ?? "white" }}>{row.name}</b><span>wave {row.wave}</span><span>{row.kos} K.O.</span>
              {/* A name someone finds offensive can be reported from here; enough reports take it off the board. */}
              <button type="button" aria-label={`Report the name ${row.name}`} title="Report this name" disabled={reported.includes(row.id)}
                className="cursor-pointer text-white/40 hover:text-destructive disabled:cursor-default disabled:text-destructive/70"
                onClick={() => { if (confirm(`Report the name "${row.name}" as offensive?`)) void reportStanding("survival", row.id).then(() => setReported((all) => [...all, row.id]), () => undefined); }}>⚑</button>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

/** Whose work the game is made with, besides its owner's. */
const CREDITS: [string, string][] = [
  ["Fighters", "Hooded Seeker by Primitive Pixels"],
  ["Forest sky", "Free Pixel Art Forest by Eder Muniz (edermunizz.itch.io)"],
  ["City, mountain, corridor, wasteland and underwater skies", "Luis Zuno (@ansimuz)"],
  ["Demon woods sky", "David Marah (@aethrall)"],
  ["Other skies", "The Dawn, NightForest and Background Hills packs"],
  ["Enemies, tiles and interface", "SHADOW Series packs, Dark Samurai, Knight and Sicklezeep"],
  ["Places", "Stringstar Fields, Mossy Assets, Plant Animations and the Lore tiles"],
  ["The guide", "Reaper (Animated Pixel Art)"],
  ["Versus stage and sounds", "Platform Fighter Template"],
  ["Music", "Alex Morgan, Mondamusic, Kiravale, Sub_Clair, Rovador, Moodmode, Apalonbeats, Solarflex, Dimmysad, Jonas Blakewood, Alexzavesa, Vaitsez, Kulakovka and Redoctopus (Pixabay)"],
  ["Pixel effects", "pixelfx by Patch and Hugo Duprez (MIT)"],
  ["Typefaces", "Seven Swordsmen BB by Nate Piekos, Blambot (blambot.com), used under license; Lexend by The Lexend Project, lexend.com (SIL Open Font License)"],
  ["Screen effects", "after Celeste's effects, Maddy Makes Games (MIT)"],
  ["Multiplayer", "Multiplayer Agent"],
];

/** The picture behind the home screen, and a few bytes of it to show, blurred, until it has come. */
const homeArt = Object.values(import.meta.glob<string>("./home.webp", { eager: true, query: "?url", import: "default" }))[0];
const homeBlur = Object.values(import.meta.glob<string>("./home-tiny.webp", { eager: true, query: "?url", import: "default" }))[0];
const logo = Object.values(import.meta.glob<string>("./logo.webp", { eager: true, query: "?url", import: "default" }))[0];

/** Deletes the account, after asking twice: the cloud save, the standings kept under it, and the sign-in itself. What
 *  is kept on this device stays, and the policy says how to clear it. */
function DeleteAccount({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"ask" | "sure" | "going" | "gone" | "failed">("ask"), [why, setWhy] = useState("");
  if (step === "gone") return <p className="text-white/70">Your account and what was kept under it are deleted.</p>;
  return (
    <div className="grid gap-1">
      <button type="button" disabled={step === "going"} className="cursor-pointer text-left text-[10px] font-bold uppercase tracking-[0.14em] text-red-400/80 hover:text-red-300 disabled:opacity-50"
        onClick={() => {
          if (step === "ask" || step === "failed") { setStep("sure"); return; }
          setStep("going");
          void deleteAccount().then(() => { setStep("gone"); setTimeout(onDone, 2500); }, (error: Error) => { setWhy(error.message); setStep("failed"); });
        }}>
        {step === "sure" ? "Tap again: delete everything" : step === "going" ? "Deleting…" : "Delete my account"}
      </button>
      {step === "failed" && <p className="text-red-300">{why}</p>}
    </div>
  );
}

function UserBadge({ onProfile }: { onProfile?: () => void }) {
  const { ready, authenticated, user, login, logout } = useAuth();
  if (!ready) return null;
  const corner = "cursor-pointer border border-[#e0b84a]/35 bg-black/70 px-3 py-1 font-sans text-[11px] font-bold tracking-[0.14em] uppercase text-[#f6dfa6] hover:text-white";
  if (!authenticated)
    return (
      <div className="absolute top-3 right-[120px] z-10 flex gap-2">
        {onProfile && <button type="button" onClick={onProfile} className={corner}>Profile</button>}
        <button type="button" onClick={login} className={corner}>Sign In</button>
      </div>
    );
  return (
    <details className="absolute top-3 right-[120px] z-10 border border-[#e0b84a]/35 bg-black/70 text-[11px] leading-relaxed text-white/85 open:bg-black/90 open:p-3">
      <summary className="cursor-pointer list-none px-3 py-1 font-sans font-bold tracking-[0.14em] uppercase text-[#f6dfa6]">
        {user?.name ?? user?.email ?? "Player"}
      </summary>
      <div className="mt-2 grid gap-2">
        {user?.email && <p className="text-white/60">{user.email}</p>}
        {user?.wallet && <WalletAddress address={user.wallet} className="justify-self-start text-white/80" />}
        {onProfile && <button type="button" onClick={onProfile} className="cursor-pointer text-left font-bold uppercase tracking-[0.14em] text-[#f6dfa6] hover:text-white">Profile</button>}
        <button type="button" onClick={() => void logout()} className="cursor-pointer text-left font-bold uppercase tracking-[0.14em] text-red-400 hover:text-red-300">
          Sign Out
        </button>
        <DeleteAccount onDone={() => void logout()} />
      </div>
    </details>
  );
}

/** What gives light in the picture: where each is in it (hundredths of its width and of its height), how wide its
 *  light falls (hundredths of the picture's width), its colour, how bright it gets, and how many seconds one swell of
 *  it takes. The sun behind the throne, the two braziers, and the eyes of the five. */
const LIGHTS: [x: number, y: number, wide: number, colour: string, bright: number, swell: number][] = [
  [50, 21, 50, "#ffc266", 0.3, 7],
  [7.4, 70, 20, "#ff8a2a", 0.75, 1.7], [91.6, 70, 20, "#ff8a2a", 0.75, 2.3],
  [21.3, 67.2, 5, "#ffd75a", 0.5, 3.4], [35.7, 67.4, 5, "#ff9a7a", 0.5, 4.1], [49.9, 67.8, 5, "#9fe6ff", 0.5, 3.1], [65, 67.5, 5, "#8dffb0", 0.5, 4.6], [80.9, 67.2, 5, "#7dffc8", 0.5, 3.7],
];
/** The lights of the picture, swelling and sinking, each in its own time; a fire's is quick and uneven. Still, and unseen, for a player who has asked for less motion. */
function Lights() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const moving = [...(box.current?.children ?? [])].map((light, i) => {
      const [, , , , bright, swell] = LIGHTS[i], fire = swell < 3;
      const frames = fire
        ? [[0.45, 0.92], [0.85, 1.05], [0.55, 0.97], [1, 1.1], [0.62, 1], [0.9, 1.04], [0.5, 0.95]].map(([lit, size]) => ({ opacity: lit * bright, transform: `scale(${size})` }))
        : [{ opacity: bright * 0.2 }, { opacity: bright }];
      return light.animate(frames, { duration: swell * 1000, delay: -i * 610, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    });
    return () => moving.forEach((each) => each.cancel());
  }, []);
  return (
    <div ref={box} data-lights className="absolute inset-0">
      {LIGHTS.map(([x, y, wide, colour]) => <i key={`${x} ${y}`} className="absolute block aspect-square -translate-1/2 rounded-full opacity-0" style={{ left: `${x}%`, top: `${y}%`, width: `${wide}%`, backgroundImage: `radial-gradient(circle, ${colour} 0%, transparent 68%)` }} />)}
    </div>
  );
}

/** What is behind the home screen, and on the page from its first moment: index.html shows the same while the game is
 *  fetched, and App the same while what was kept is read, so that neither the picture nor the name moves as the game comes. */
export function TitleBackdrop({ alive, children }: { alive?: boolean; children?: ReactNode }) {
  const art = useRef<HTMLDivElement>(null), glint = useRef<HTMLSpanElement>(null);
  // Once the game is there (`alive`) the picture is come a little towards and then breathes, a light crosses the
  // emblem now and again, and the picture leans a little away from a mouse. The emblem itself stays where it is, in
  // the middle. Not for a player who has asked for less motion.
  useEffect(() => {
    if (!alive || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lean = (event: PointerEvent) => {
      const x = event.clientX / innerWidth - 0.5, y = event.clientY / innerHeight - 0.5;
      if (art.current) art.current.style.translate = `${(-x * 22).toFixed(1)}px ${(-y * 12).toFixed(1)}px`;
    };
    // Not until the picture has been come towards: it is that which leaves it room at its edges to lean into.
    const timer = window.setTimeout(() => { if (matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", lean); }, 1500);
    const moving = [
      art.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }], { duration: 2600, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "forwards" }),
      art.current?.animate([{ transform: "scale(1.04)" }, { transform: "scale(1.065)" }], { duration: 22000, delay: 2600, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }),
      glint.current?.animate([{ backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", offset: 0.16 }, { backgroundPosition: "0% 0" }], { duration: 9000, delay: 700, iterations: Infinity }),
    ];
    return () => { window.clearTimeout(timer); window.removeEventListener("pointermove", lean); moving.forEach((each) => each?.cancel()); };
  }, [alive]);
  return (
    <section aria-label="Title screen" className="absolute inset-0 grid place-items-end overflow-hidden bg-black">
      {/* The picture is 1672 by 941, drawn as large as covers the page and about its middle, as index.html draws it. */}
      <div aria-hidden className="absolute top-1/2 left-1/2 aspect-[1672/941] w-[max(100vw,calc(100dvh*1672/941))] -translate-1/2">
        <div ref={art} className="absolute inset-0 bg-cover bg-center transition-[translate] duration-700 ease-out" style={{ backgroundImage: `url(${homeArt}), url(${homeBlur})` }}>
          {alive && <Lights />}
        </div>
      </div>
      {/* The emblem (logo.webp, 866 by 288): never drawn larger than it is, nor taller than a third of a short screen. The
          glint is cut to its shape, so the light crosses the metal and not the air around it. */}
      <h1 className="pointer-events-none absolute inset-x-0 top-[max(3vh,40px)] mx-auto w-[min(866px,66vw,calc(32dvh*866/288))]">
        <img src={logo} alt="Five Blades" width={866} height={288} className="block h-auto w-full [filter:drop-shadow(0_6px_18px_rgba(0,0,0,0.85))]" />
        <span ref={glint} aria-hidden className="absolute inset-0 bg-no-repeat" style={{ backgroundImage: "linear-gradient(100deg, transparent 44%, rgba(255,250,235,0.6) 50%, transparent 56%)", backgroundSize: "300% 100%", backgroundPosition: "100% 0", mask: `url(${logo}) center / 100% 100% no-repeat` }} />
      </h1>
      {children}
    </section>
  );
}

/** The price of $BLADES (prices.ts), under the ways in, read again each minute while the home screen is up.
 *  A token not launched shows a dash; one that cannot be read keeps its last price. */
function Prices() {
  const [quotes, setQuotes] = useState<(Quote | null | undefined)[]>(TICKERS.map(() => undefined));
  useEffect(() => {
    const read = () => TICKERS.forEach((ticker, i) => quoteOf(ticker).then((quote) => setQuotes((now) => now.map((was, j) => (j === i ? quote : was))), () => undefined));
    read();
    const timer = window.setInterval(read, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 6 : 2 });
  return (
    <div aria-label="Prices" className="flex basis-full flex-wrap justify-center gap-x-6 gap-y-1 pt-[clamp(6px,1.6vh,16px)] font-sans text-[clamp(11px,1.1vw,13px)] tracking-[0.12em] text-white/75 tabular-nums">
      {TICKERS.map((ticker, i) => {
        const quote = quotes[i], label = <><b className="font-bold text-[#f6dfa6]">{ticker.symbol}</b> <span className="text-white/45">{ticker.where}</span></>;
        const shown = quote === undefined ? <span className="text-white/45">…</span>
          : quote === null ? <span className="text-white/45">— not launched</span>
            : <>{usd(quote.usd)}{quote.change !== null && <span className={quote.change >= 0 ? "text-[#8dffb0]" : "text-[#ff8a7a]"}> {quote.change >= 0 ? "▲" : "▼"}{Math.abs(quote.change).toFixed(2)}%</span>}</>;
        return quote ? (
          <a key={ticker.symbol} href={quote.url} target="_blank" rel="noreferrer" tabIndex={-1} className="hover:text-white">{label} {shown}</a>
        ) : <span key={ticker.symbol}>{label} {shown}</span>;
      })}
    </div>
  );
}

/** The corners of a plate, cut as a blade's are. */
const CUT = "[clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]";
/** One of the ways in, on the home screen: a dark plate edged in gold. One of them is always the one chosen, by the
 *  mouse coming over it, the keys or a controller, and that one is lit and lifted. */
const WAY = cn(display, CUT, "group cursor-pointer bg-[#e0b84a]/55 p-px outline-none transition-[translate,background-color] duration-fast focus:-translate-y-1 focus:bg-[#fff3cf] active:translate-y-0");
const WAY_PLATE = cn(CUT, "block min-w-[clamp(112px,15vw,190px)] bg-black/70 px-5 py-3.5 text-center text-[clamp(13px,1.5vw,17px)] tracking-[0.22em] text-[#f6dfa6] transition-colors duration-fast group-focus:bg-[#f6dfa6] group-focus:text-[#2a0d0c]");
function Way({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" data-way onPointerEnter={(event) => event.currentTarget.focus()} className={cn(WAY, className)} {...props}>
      <span className={WAY_PLATE}>{children}</span>
    </button>
  );
}
/** The home screen: the five before the throne, filling the page, the game's name over them, and the ways in. While
 *  something is open over it (`busy`) its keys are that thing's. */
export function TitleScreen({ onCampaign, onArena, onVersus, onProfile, onMove, onCredits, busy, settings }: { onCampaign: () => void; onArena: () => void; onVersus: () => void; onProfile?: () => void; onMove?: () => void; /** Told when the credits are opened or closed: they have their own music (App.tsx). */ onCredits?: (open: boolean) => void; busy?: boolean; /** The player's preferences (App.tsx, Preferences), opened from the corner. */ settings?: ReactNode }) {
  // Which way in is lit: told (`onMove`) each time it becomes another, and not as the first is lit on arriving.
  const lit = useRef<EventTarget | null>(null);
  const corners = useRef<HTMLDivElement>(null), ways = useRef<HTMLElement>(null);
  // The keys choose among the ways in: the arrows, or A and D, move along them, and Enter, Space or J takes the one
  // that is lit. With none lit, as after a click elsewhere, a key lights the first. They are left alone while the
  // leaderboard, the credits or signing in has them.
  useEffect(() => {
    if (busy) return;
    const down = (event: KeyboardEvent) => {
      const all = [...(ways.current?.querySelectorAll<HTMLElement>("[data-way]") ?? [])], at = all.indexOf(document.activeElement as HTMLElement);
      if (!all.length || (at < 0 && document.activeElement !== document.body)) return;
      const by = ["ArrowLeft", "KeyA", "ArrowUp", "KeyW"].includes(event.code) ? -1 : ["ArrowRight", "KeyD", "ArrowDown", "KeyS"].includes(event.code) ? 1 : 0;
      if (by) { event.preventDefault(); all[at < 0 ? 0 : (at + by + all.length) % all.length].focus(); }
      else if (event.code === "KeyJ" || (at < 0 && ["Enter", "NumpadEnter", "Space"].includes(event.code))) { event.preventDefault(); all[Math.max(at, 0)].click(); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [busy]);
  // The ways in rise into place one after another as the home screen is come to, and what is at its corners comes after them.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    [...(ways.current?.children ?? [])].forEach((way, i) => way.animate([{ opacity: 0, transform: "translateY(30px)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: 150 + i * 85, easing: "cubic-bezier(0.2, 0.9, 0.25, 1)", fill: "backwards" }));
    corners.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 650, fill: "backwards" });
  }, []);
  return (
    <TitleBackdrop alive>
      <Embers />
      <div ref={corners} className="absolute inset-x-0 top-0 z-10">
        <Leaders />
        {settings && (
          <details className="absolute top-3 left-[150px] z-30 w-[min(88vw,340px)] border border-[#e0b84a]/35 bg-black/70 text-[11px] leading-relaxed text-white/85 open:bg-[#0b1114] open:p-3 open:shadow-[0_8px_30px_rgba(0,0,0,0.8)] [&:not([open])]:w-auto">
            <summary className="cursor-pointer list-none px-2 py-1 font-sans font-bold tracking-[0.14em] text-[#f6dfa6] uppercase hover:text-white">Settings</summary>
            <div className="dark text-foreground">{settings}</div>
          </details>
        )}
        <UserBadge onProfile={onProfile} />
        <details onToggle={(event) => onCredits?.(event.currentTarget.open)} className="absolute top-3 right-3 z-10 max-w-[min(92vw,420px)] border border-[#e0b84a]/35 bg-black/70 text-[11px] leading-relaxed text-white/85 open:bg-black/90 open:p-3">
          <summary className="cursor-pointer list-none px-2 py-1 text-right font-sans font-bold tracking-[0.14em] text-[#f6dfa6] uppercase hover:text-white">Credits</summary>
          <ul className="mt-2 grid gap-1">
            {CREDITS.map(([what, who]) => <li key={what}><b className="font-medium text-white">{what}</b>: {who}</li>)}
          </ul>
          <p className="mt-2 flex gap-3"><a className="underline hover:text-white" href="/privacy">Privacy policy</a><a className="underline hover:text-white" href="/terms">Terms of service</a></p>
        </details>
      </div>
      <nav ref={ways} aria-label="Ways in" onFocus={(event) => { if (lit.current && lit.current !== event.target) onMove?.(); lit.current = event.target; }} className="relative flex w-full flex-wrap justify-center gap-[clamp(8px,1.4vw,18px)] bg-linear-to-t from-black/85 to-transparent px-4 pt-24 pb-[7vh]">
        <Way autoFocus onClick={onCampaign}>Campaign</Way>
        <Way onClick={onArena}>Survival</Way>
        <Way onClick={onVersus}>Versus</Way>
        <Prices />
      </nav>
    </TitleBackdrop>
  );
}

const RATES = ["Power", "Speed", "Health", "Energy"];
/** The colour a palette of the fighters' art is known by, for its swatch. */
const SWATCH: Record<Skin["palette"], string> = { Void: "#7b3fe4", Bone: "#d9d4c5", Ember: "#d42a1e", Frost: "#1f6fd1" };

/** A fighter's colour as it shows on a dark page: ink, which it would swallow, becomes the page's own lettering. */
const seen = (colour: string) => (parseInt(colour.slice(1, 3), 16) + parseInt(colour.slice(3, 5), 16) + parseInt(colour.slice(5, 7), 16) < 150 ? "var(--foreground)" : colour);

/** What fighter `fighter` wears: a swatch for each outfit (relics.ts); those still to be earned say how. On the fighter
 *  select, and on the campaign screen for its protagonist's fighter. */
export function OutfitPicker({ fighter, onChange }: { fighter: number; onChange?: () => void }) {
  const [, redraw] = useState(0), c = CHARS[fighter], wearing = outfitOf(fighter);
  return (
    <div>
      <h4 className={cn(heading, "mt-3")}>Outfit · <span className="normal-case tracking-normal text-muted-foreground">{wearing.name}</span></h4>
      <div role="radiogroup" aria-label="Outfit" className="mt-1.5 flex flex-wrap gap-1.5">
        {OUTFITS.map((outfit) => {
          const open = canWear(outfit), skin = outfit.skin ?? c.skin, [cloak, glow] = skin.tint ?? [SWATCH[skin.palette], SWATCH[skin.palette]];
          const face = outfit.id === "own" ? seen(c.color) : cloak;
          return (
            <button key={outfit.id} type="button" role="radio" aria-checked={wearing.id === outfit.id} disabled={!open}
              aria-label={open ? outfit.name : `${outfit.name}: earned with ${RELICS[outfit.needs!].need} ${RELICS[outfit.needs!].plural}`}
              title={open ? outfit.name : `Collect ${RELICS[outfit.needs!].need} ${RELICS[outfit.needs!].plural} in the campaigns`}
              onClick={() => { wear(fighter, outfit.id); redraw((n) => n + 1); onChange?.(); }}
              className={cn("grid size-8 cursor-pointer place-items-center border-2 disabled:cursor-not-allowed disabled:opacity-40", wearing.id === outfit.id ? "border-foreground" : "border-border")}
              style={{ background: `linear-gradient(135deg, ${face} 55%, ${glow} 55%)` }}>
              {!open && <span aria-hidden className="text-[11px] text-white drop-shadow">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Card({ index, focused, onPick, skin }: { index: number; focused: boolean; onPick: () => void; skin: Skin }) {
  const c = CHARS[index], colour = seen(c.color);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let frame = requestAnimationFrame(function draw(now) { drawPreview(ctx, index, focused, now / 1000, skin); frame = requestAnimationFrame(draw); });
    return () => cancelAnimationFrame(frame);
  }, [index, focused, skin]);
  return (
    <button
      type="button" aria-pressed={focused} onClick={onPick}
      className={cn("grid min-w-0 cursor-pointer justify-items-center gap-1 border-2 border-border bg-card px-2.5 pt-2.5 pb-3 text-center transition-transform duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", focused && "-translate-0.5")}
      style={focused ? { borderColor: colour, boxShadow: `5px 5px 0 ${colour}` } : undefined}
    >
      <canvas ref={canvas} width={240} height={300} aria-hidden className="block h-[150px] w-[120px] max-w-full" />
      <span className={cn(display, "text-xl tracking-[0.14em]")} style={{ color: colour }}>{c.name}</span>
      <span className="text-[11px] text-muted-foreground">{c.title}</span>
      <span className="mt-1.5 grid w-full grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-left text-[9.5px] tracking-widest text-muted-foreground uppercase">
        {RATES.map((label, j) => (
          <span key={label} className="contents">
            <span>{label}</span>
            <span role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={5} aria-valuenow={c.rate[j]} className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => <b key={n} className="h-1.5 flex-1 bg-border" style={n <= c.rate[j] ? { background: colour } : undefined} />)}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

const list = "grid gap-1 text-xs";
const row = "flex justify-between gap-2 border-b border-dashed border-border pb-0.5";
const heading = cn(display, "mb-1.5 text-[11px] tracking-[0.2em] text-destructive");

/** @model spec/app/index.md */
export function SelectScreen({ match, mine, onFocus, onFight, onBack, extra, go = "Fight" }: { match: Match; /** What the player has made of the fighter in focus: the three specials it carries, how many of its five things its campaign has taught it, and what it has been built into. */ mine?: { specials: SpecialDef[]; learned: number; build: Build }; onFocus: (pick: number) => void; onFight: () => void; onBack: () => void; extra?: ReactNode; go?: string }) {
  const c = CHARS[match.fighter], learned = mine?.learned ?? 5, build = mine?.build;
  // What each fighter wears (relics.ts): read again whenever an outfit is chosen.
  const [dressed, setDressed] = useState(0), skins = useMemo(() => CHARS.map((_, i) => skinOf(i)), [dressed]);
  const built = build ? [build.health && `+${10 * build.health} health`, build.jumps && `+${build.jumps} jump${build.jumps > 1 ? "s" : ""}`, build.damage && `+${8 * build.damage}% damage`, build.climb && `+${25 * build.climb}% wall time`, build.dash && `+${11 * build.dash}% dash`].filter(Boolean) : [];
  return (
    <section aria-label="Character select" className={cn(screen, "dark bg-cover bg-center text-foreground")} style={{ backgroundImage: `linear-gradient(rgba(7,9,13,0.9), rgba(7,9,13,0.96)), url(${homeArt})` }}>
      <div className="grid w-full max-w-[1040px] gap-4.5">
        <h2 className={cn(display, "text-[clamp(26px,4vw,40px)] tracking-widest text-balance")}>Choose your fighter</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {CHARS.map((card, i) => <Card key={card.id} index={i} focused={i === match.fighter} skin={skins[i]} onPick={() => (i === match.fighter ? onFight() : onFocus(i))} />)}
        </div>
        <div className="grid gap-x-6 gap-y-3.5 border-2 border-foreground bg-card px-4.5 py-4 md:grid-cols-[1.1fr_1fr_1fr]">
          <div>
            <h3 className={cn(display, "text-2xl tracking-[0.12em]")} style={{ color: seen(c.color) }}>{c.name}</h3>
            <p className="mt-1 max-w-[42ch] text-[12.5px] leading-normal"><b>{c.title}.</b> {c.blurb}</p>
            <p className="mt-1 text-[12.5px]">{healthOf(match.fighter) + 10 * (build?.health ?? 0)} HP · {c.airJumps + 1 + (build?.jumps ?? 0)} jumps · blasts cost {blastCostOf(match.fighter) / 1000} aura</p>
            {built.length > 0 && <p className="mt-1 text-[12.5px] text-[#e0b84a]">Built: {built.join(" · ")}</p>}
            <OutfitPicker fighter={match.fighter} onChange={() => setDressed((n) => n + 1)} />
          </div>
          <div>
            <h4 className={heading}>Specials</h4>
            <ul className={list}>
              {[...(mine?.specials ?? c.specials).slice(0, 3), ...c.specials.slice(3)].map((s, j) => <li key={s.name} className={cn(row, lesson(j) >= learned && "text-muted-foreground")}>{lesson(j) < learned ? s.name : `Special ${j + 1}`}<span className="whitespace-nowrap text-muted-foreground">{lesson(j) < learned ? `${SPECIAL_SHORT[j]} · ${specialCost(j) / 1000}` : `locked · chapter ${lesson(j) + 1}`}</span></li>)}
              {mine && [["Overdrive", 4], ["Flight", 5]].map(([power, chapter]) => <li key={power} className={cn(row, learned < Number(chapter) && "text-muted-foreground")}>{power}<span className="whitespace-nowrap text-muted-foreground">{learned >= Number(chapter) ? "learned" : `locked · chapter ${chapter}`}</span></li>)}
            </ul>
            {mine && learned < 5 && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">What is locked is earned in this fighter's campaign, a chapter at a time, and goes with it into every kind of fight.</p>}
          </div>
          <div>
            <h4 className={heading}>Combos</h4>
            <ul className={list}>{SLOTS.map((slot) => <li key={slot} className={row}>{c.slots[slot][1]}</li>)}</ul>
          </div>
        </div>
        {extra}
        <div className="flex flex-wrap justify-end gap-3">
          <SmallButton className="bg-transparent px-5 py-2.5 text-[13px]" onClick={onBack}>Back</SmallButton>
          <BigButton onClick={onFight}>{go}</BigButton>
        </div>
      </div>
    </section>
  );
}

function Keys({ input }: { input: Input }) {
  return <>{input.map((part, i) => (WORDS.has(part) ? <span key={i}>{part} </span> : <Kbd key={i}>{part}</Kbd>))}</>;
}

function Move({ n, name, found, children }: { n: ReactNode; name: string; found: boolean; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 border-b border-dashed border-border py-0.5 text-[12.5px]">
      <span className="text-muted-foreground tabular-nums">{n}</span>
      <b className="font-medium">{name}{found && <span aria-label="found" className="text-destructive"> ✓</span>}</b>
      <span className="min-w-0 text-right">{children}</span>
    </li>
  );
}

/**
 * The move list of the fighter in play, ticked where a move has been found.
 * @model spec/app/index.md
 */
export function VolumeSliders({ sfxVol, musicVol, onSfx, onMusic }: { sfxVol: number; musicVol: number; onSfx: (v: number) => void; onMusic: (v: number) => void }) {
  const [sfx, setSfx] = useState(sfxVol), [mus, setMus] = useState(musicVol);
  return (
    <div className="mt-4 grid gap-2">
      <h4 className={cn("font-display font-bold uppercase", "text-[11px] tracking-[0.2em] text-destructive")}>Volume</h4>
      <label className="grid grid-cols-[3.5em_1fr_2em] items-center gap-2 text-[11px]">
        <span className="tracking-widest text-muted-foreground uppercase">SFX</span>
        <input type="range" min="0" max="100" value={Math.round(sfx * 100)} onChange={(e) => { const v = +e.target.value / 100; setSfx(v); onSfx(v); }} className="w-full accent-destructive" />
        <span className="text-right tabular-nums text-muted-foreground">{Math.round(sfx * 100)}</span>
      </label>
      <label className="grid grid-cols-[3.5em_1fr_2em] items-center gap-2 text-[11px]">
        <span className="tracking-widest text-muted-foreground uppercase">Music</span>
        <input type="range" min="0" max="100" value={Math.round(mus * 100)} onChange={(e) => { const v = +e.target.value / 100; setMus(v); onMusic(v); }} className="w-full accent-destructive" />
        <span className="text-right tabular-nums text-muted-foreground">{Math.round(mus * 100)}</span>
      </label>
    </div>
  );
}

export function MoveList({ match, specials, onResume, onChange, extra }: { match: Match; /** The three specials the fighter went in with: its own, or what it chose. */ specials: SpecialDef[]; onResume: () => void; onChange: () => void; extra?: ReactNode }) {
  const c = CHARS[match.fighter];
  const found = (move: number) => match.found.includes(move);
  const title = cn(display, "mt-4 mb-1.5 text-xs tracking-[0.2em] text-destructive");
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-background/85 px-4 pt-16 pb-5">
      <section aria-labelledby="movesTitle" className="w-full max-w-[660px] border-2 border-foreground bg-card px-5 pt-4.5 pb-5 shadow-[6px_6px_0_var(--foreground)]">
        <header className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 id="movesTitle" className={cn(display, "text-xl tracking-[0.14em] text-balance")}>{c.name} move list</h2>
          <div className="flex gap-2">
            <SmallButton onClick={onChange}>Change fighter</SmallButton>
            <SmallButton autoFocus className="bg-primary text-primary-foreground" onClick={onResume}>Resume</SmallButton>
          </div>
        </header>
        <h3 className={title}>Combos</h3>
        <ol className="grid gap-1">
          {SLOTS.map((slot, i) => <Move key={slot} n={i + 1} name={c.slots[slot][1]} found={found(i)}><Keys input={SLOT_INPUTS[slot]} /></Move>)}
        </ol>
        <h3 className={title}>Specials</h3>
        <ol className="grid gap-1">
          {specials.map((s, i) => <Move key={s.name} n={`S${i + 1}`} name={lesson(i) < match.learned ? s.name : "Not learned yet"} found={i < 3 && found(FOUND.special + i)}><Keys input={SPECIAL_INPUTS[i]} /> · {specialCost(i) / 1000}</Move>)}
        </ol>
        <h3 className={title}>Powers</h3>
        <ol className="grid gap-1">
          <Move n="·" name="Dash" found={false}><Kbd>I</Kbd> with a direction · once until you land</Move>
          <Move n="·" name="Wall climb" found={false}>hold <Kbd>O</Kbd> at a wall, <Kbd>W</Kbd>/<Kbd>S</Kbd>, <Kbd>Space</Kbd> to jump off</Move>
          <Move n="·" name="Use an item" found={false}><Kbd>T</Kbd> uses what is chosen in the bag · <Kbd>R</Kbd> chooses the next · foes leave them as they fall</Move>
          <Move n="·" name="Energy Blast" found={found(FOUND.blast)}><Kbd>L</Kbd> · {blastCostOf(match.fighter) / 1000}</Move>
          <Move n="·" name="Flight" found={found(FOUND.fly)}><Kbd>F</Kbd> then <Kbd>W</Kbd>/<Kbd>S</Kbd> · drains</Move>
          <Move n="·" name="Charge" found={found(FOUND.charge)}>hold <Kbd>U</Kbd></Move>
          <Move n="·" name="Overdrive" found={found(FOUND.overdrive)}>keep holding <Kbd>U</Kbd> at full aura</Move>
        </ol>
        <p className="mt-2.5 text-xs leading-normal text-muted-foreground">
          Arrows mean forward and back relative to where you face. {c.name} gets {c.airJumps} mid-air flip{c.airJumps > 1 ? "s" : ""}. Overdrive lasts 15 seconds: faster, 1.5× damage, every power free.
        </p>
        {extra}
      </section>
    </div>
  );
}

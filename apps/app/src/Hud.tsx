// spec/app/index.md, "Story: Stay alive"; spec/app/index.md, "Story: Charge and spend aura"; spec/app/index.md, "Story: Fight the waves"
import { cn } from "@repo/ui";
import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { type Match, fullAura, full } from "../gen/app.ts";
import { CHARS, MOVES_TO_FIND } from "./game/data.ts";
import type { Button, Game } from "./game/sim.ts";
import { KitBar } from "./kit.tsx";
import { Kbd } from "./screens.tsx";

const display = "font-display font-bold uppercase";

function Bar({ label, value, max, fill, className }: { label: string; value: number; max: number; fill?: string; className?: string }) {
  return (
    <>
      <span>{label}</span>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className={cn("h-2 border-[1.5px] border-foreground bg-background", className)}>
        <i className="block h-full bg-foreground" style={{ width: `${(100 * value) / max}%`, background: fill }} />
      </div>
    </>
  );
}

/** What a controller's buttons do (gamepad.ts), for the legend while one is plugged in. */
const PADS: [string[], string][] = [[["Stick"], "move"], [["A"], "jump"], [["X"], "punch"], [["Y"], "kick"], [["B"], "blast"], [["RB"], "dash"], [["LB"], "guard"], [["LT"], "charge"], [["RT"], "hold wall"], [["←", "↑", "→"], "specials"], [["Back", "←↑→"], "greater arts"], [["↓"], "fly"], [["L3"], "next item"], [["R3"], "use item"], [["Start"], "move list"]];
const KEYS: [string[], string][] = [[["A", "D"], "move"], [["S"], "down"], [["Shift"], "run"], [["W"], "jump/flip"], [["I"], "dash"], [["O"], "hold wall"], [["J"], "punch"], [["K"], "kick"], [["L"], "blast"], [["U"], "hold charge"], [["G"], "guard"], [["F"], "fly"], [["1", "2", "3"], "specials"], [["4", "5", "6"], "greater arts"], [["T"], "use item"], [["R"], "next item"], [["H"], "move list"]];

/** A number of the fight; it pops when `value` goes up, so that a gain is felt as well as read. */
function Stat({ label, value, children }: { label: string; value: number; children?: ReactNode }) {
  const number = useRef<HTMLElement>(null), last = useRef(value);
  useEffect(() => {
    if (value > last.current) number.current?.animate?.([{ transform: "scale(1.7)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
    last.current = value;
  }, [value]);
  return <span>{label} <b ref={number} className="inline-block font-medium text-foreground">{children ?? value}</b></span>;
}

/**
 * Health, aura and the score of the fight in play.
 * @model spec/app/index.md
 */
export function Hud({ match, keys }: { match: Match; keys: { found: number; of: number } }) {
  const c = CHARS[match.fighter], health = full(match);
  // The legend names a controller's buttons while one is plugged in, and steps back once a fight is well under way,
  // coming forward again under the pointer.
  const [pad, setPad] = useState(false), [fresh, setFresh] = useState(true);
  useEffect(() => {
    const look = () => setPad([...(navigator.getGamepads?.() ?? [])].some((each) => each?.connected));
    look();
    const timer = window.setInterval(look, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { setFresh(true); const timer = window.setTimeout(() => setFresh(false), 20000); return () => window.clearTimeout(timer); }, [match.fighter, match.quest, match.duel]);
  return (
    <header className="pointer-events-none absolute inset-x-4 top-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className={cn(display, "text-[22px] leading-none tracking-[0.14em]")}>Five <span className="text-destructive">Blades</span></h1>
        <div className="mt-2 grid grid-cols-[auto_180px] items-center justify-start gap-x-2 gap-y-1 text-[10px] tracking-[0.12em] text-muted-foreground">
          {/* The kit's bar is drawn at three quarters of its size, to sit in the column the aura's is in. */}
          {match.quest ? <><span>HP</span><div className="h-[57px] w-[180px]"><div className="origin-top-left scale-[0.76]"><KitBar label="HP" value={match.hp} max={health} /></div></div></> : <Bar label="HP" value={match.hp} max={health} fill={match.hp < health * 0.3 ? "var(--destructive)" : undefined} />}
          <Bar label="AURA" value={match.aura} max={fullAura} fill={c.aura} className={match.overdrive > 0 ? "animate-pulse" : undefined} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs tracking-wider text-muted-foreground tabular-nums">
          {/* Ink is the page's own lettering, which a dark place turns pale: its fighter's name is lettered in that. */}
          <b className="font-medium uppercase" style={{ color: parseInt(c.color.slice(1, 3), 16) + parseInt(c.color.slice(3, 5), 16) + parseInt(c.color.slice(5, 7), 16) < 150 ? "var(--foreground)" : c.color }}>{c.name}</b>
          {match.duel || match.quest ? <span>LIVES <b className="font-medium text-destructive">{"●".repeat(match.lives)}</b></span> : !match.quest && <Stat label="WAVE" value={match.wave} />}
          {match.quest && keys.of > 0 && <span>KEY <b className="font-medium text-[#3fbf9a]">{"◆".repeat(keys.found)}{"◇".repeat(keys.of - keys.found)}</b></span>}
          <Stat label="K.O.s" value={match.kos} />
          <Stat label="BEST COMBO" value={match.best} />
          <Stat label="MOVES" value={match.found.filter((move) => move < MOVES_TO_FIND).length}>{match.found.filter((move) => move < MOVES_TO_FIND).length}/{MOVES_TO_FIND}</Stat>
        </p>
      </div>
      <div aria-label="Controls" className={cn("pointer-events-auto flex max-w-[600px] flex-wrap justify-end gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground transition-opacity duration-700 hover:opacity-100 pointer-coarse:hidden", !fresh && "opacity-25")}>
        {(pad ? PADS : KEYS).map(([keys, does]) => <span key={does}>{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}{does}</span>)}
      </div>
    </header>
  );
}

/**
 * The run of blows the fighter is in the middle of, counted at the side of the screen: it jumps as each lands and
 * goes when the run has gone cold.
 */
// spec/app/index.md, "Story: Fight the waves"
export function Combo({ match }: { match: Match }) {
  const count = useRef<HTMLParagraphElement>(null), [warm, setWarm] = useState(false);
  useEffect(() => {
    if (match.combo < 2) { setWarm(false); return; }
    setWarm(true);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) count.current?.animate([{ transform: "scale(1.45)" }, { transform: "scale(1)" }], { duration: 180, easing: "ease-out" });
    const timer = window.setTimeout(() => setWarm(false), 1600);
    return () => window.clearTimeout(timer);
  }, [match.combo, match.hits]);
  return (
    <p ref={count} role="status" aria-label="Combo" className={cn(display, "pointer-events-none absolute top-[38%] right-[4%] origin-right text-right leading-none transition-opacity duration-300 [text-shadow:0_0_2px_var(--background),0_0_10px_var(--background)]", !warm && "opacity-0")}>
      <span className="block text-[clamp(34px,6vw,64px)] text-destructive tabular-nums">{match.combo}</span>
      <span className="block text-[13px] tracking-[0.3em]">hits</span>
    </p>
  );
}

/** How big the touch controls are drawn, and how solid: the player's choice, kept on the device. */
export const TOUCH_SIZES = [0.85, 1, 1.18] as const, TOUCH_SEEN = [1, 0.75, 0.5] as const;
export function touchFit(): { size: number; seen: number } {
  try { const kept = JSON.parse(localStorage.getItem("touch") ?? "{}"); return { size: TOUCH_SIZES.includes(kept.size) ? kept.size : 1, seen: TOUCH_SEEN.includes(kept.seen) ? kept.seen : 1 }; }
  catch { return { size: 1, seen: 1 }; }
}
export function setTouchFit(fit: { size: number; seen: number }) { try { localStorage.setItem("touch", JSON.stringify(fit)); } catch { /* Private browsing: for this visit only. */ } }

/** A short buzz under the thumb, on phones that can. */
const tick = () => { try { navigator.vibrate?.(8); } catch { /* A browser may refuse. */ } };
const pad = cn(display, "absolute touch-none rounded-full border-2 border-foreground/80 bg-background/55 p-0 text-[10px] tracking-wider backdrop-blur-[2px] transition-transform duration-75 select-none [-webkit-touch-callout:none] active:scale-90 active:bg-foreground active:text-background");

/**
 * A button held for as long as a thumb is on it, wherever on the screen the thumb then slides: `press` is called as
 * the thumb comes down, and what it returns as the thumb lifts.
 */
function Hold({ press, className, children, label, style }: { press: () => () => void; className?: string; children: ReactNode; label?: string; style?: CSSProperties }) {
  const liftRef = useRef<(() => void) | null>(null);
  const up = () => { liftRef.current?.(); liftRef.current = null; };
  return (
    <button
      type="button" aria-label={label} className={cn(pad, className)} style={style}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); tick(); up(); liftRef.current = press(); }}
      onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

/**
 * The stick: the left half of the screen. Wherever a thumb comes down is its middle, and how far the thumb is from
 * there is what it asks for: left or right past a small dead ring, a run when pushed well over, down or up when
 * pushed that way. Its middle follows a thumb that strays, so that it never has to be found again.
 */
function Stick({ game }: { game: Game }) {
  const ring = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null);
  const live = useRef<{ id: number; x: number; y: number } | null>(null), held = useRef(new Set<Button>());
  const DEAD = 14, RUN = 46, REACH = 58;
  const ask = (want: Button[]) => {
    for (const k of [...held.current]) if (!want.includes(k)) { game.release(k); held.current.delete(k); }
    for (const k of want) if (!held.current.has(k)) { game.press(k); held.current.add(k); }
  };
  const show = (dx: number, dy: number) => {
    const at = live.current;
    if (!ring.current || !knob.current) return;
    ring.current.style.opacity = at ? "1" : "0";
    if (at) { ring.current.style.transform = `translate(${at.x - 62}px, ${at.y - 62}px)`; knob.current.style.transform = `translate(${dx}px, ${dy}px)`; }
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const at = live.current;
    if (!at || event.pointerId !== at.id) return;
    const box = event.currentTarget.getBoundingClientRect();
    let dx = event.clientX - box.left - at.x, dy = event.clientY - box.top - at.y;
    const far = Math.hypot(dx, dy);
    // Past its reach the middle is dragged along behind the thumb.
    if (far > REACH) { at.x += dx * (1 - REACH / far); at.y += dy * (1 - REACH / far); dx *= REACH / far; dy *= REACH / far; }
    const want: Button[] = [];
    if (dx < -DEAD) want.push("left"); else if (dx > DEAD) want.push("right");
    if (Math.abs(dx) > RUN) want.push("run");
    if (dy > 30) want.push("down"); else if (dy < -34 && Math.abs(dy) > Math.abs(dx) * 0.8) want.push("up");
    ask(want); show(dx, dy);
  };
  const end = (event: PointerEvent<HTMLDivElement>) => { if (live.current?.id !== event.pointerId) return; live.current = null; ask([]); show(0, 0); };
  return (
    <div
      aria-label="Move" className="absolute inset-y-0 left-0 w-[46%] touch-none"
      onPointerDown={(event) => {
        if (live.current) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        const box = event.currentTarget.getBoundingClientRect();
        live.current = { id: event.pointerId, x: event.clientX - box.left, y: event.clientY - box.top };
        show(0, 0);
      }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={ring} className="pointer-events-none absolute top-0 left-0 size-[124px] rounded-full border-2 border-foreground/60 bg-background/25 opacity-0 transition-opacity duration-100">
        <div ref={knob} className="absolute top-[34px] left-[34px] size-14 rounded-full border-2 border-foreground bg-background/80" />
      </div>
    </div>
  );
}

type Shape = "triangle" | "square" | "circle" | "cross";
/** Where each face button sits in its diamond, from the cluster's top left, and the mark it is known by. */
const FACES: [Shape, left: number, top: number, mark: ReactNode][] = [
  ["triangle", 52, 38, <path key="m" d="M12 4.5 20.5 19h-17Z" />], ["square", 0, 90, <rect key="m" x="5" y="5" width="14" height="14" />],
  ["circle", 104, 90, <circle key="m" cx="12" cy="12" r="7.5" />], ["cross", 52, 142, <path key="m" d="m6 6 12 12M18 6 6 18" />],
];
/** What the face buttons and the right shoulder press on each page: as they are, with Aura held, with Arts held. */
const PAGES: Record<Shape | "shoulder", [Button, Button, Button]> = {
  triangle: ["kick", "s2", "s5"], square: ["punch", "s1", "s4"], circle: ["blast", "s3", "s6"], cross: ["jump", "fly", "item"], shoulder: ["dash", "dash", "next"],
};
const NAMES: Partial<Record<Button, string>> = { punch: "Punch", kick: "Kick", blast: "Blast", jump: "Jump", fly: "Fly", item: "Item", next: "Next", dash: "Dash", guard: "Guard", grab: "Hold" };

/**
 * The controls for a touch screen, shown only where the pointer is coarse and the screen is on its side, kept to a
 * corner each so that the fight stays in sight. Under the left thumb the stick, and over it Aura, which charges while
 * held, and Arts; under the right a diamond of four and two shoulders. Aura or Arts held turns the face buttons into
 * the specials or the greater arts, flight and the bag, and each button names what it does on the page in play.
 */
export function TouchPad({ game }: { game: Game; fighter: number }) {
  // `fighter` draws the controls again when the fighter, and so its specials, changes.
  // A special is named in full to a screen reader, and by its first word on the button.
  const specials = game.specials(), name = (k: Button) => NAMES[k] ?? specials[Number(k.slice(1)) - 1]?.name ?? "";
  // The page is read as a face button comes down, from `pageRef`, which changes the moment a thumb lands on Aura or Arts.
  const [page, setPage] = useState<0 | 1 | 2>(0), pageRef = useRef<0 | 1 | 2>(0);
  const turn = (to: 0 | 1 | 2) => { pageRef.current = to; setPage(to); };
  const hold = (k: Button) => { game.press(k); return () => game.release(k); };
  // The shoulder on the left guards on the ground and holds a wall in the air: it says which it is about to do.
  const [air, setAir] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setAir(game.scene.hero?.grounded === false), 150); return () => window.clearInterval(timer); }, [game]);
  // The buttons grow or shrink from the corner each cluster sits in, so that they stay under the thumb.
  const fit = touchFit(), grow = (corner: string): CSSProperties => ({ transform: `scale(${fit.size})`, transformOrigin: corner });
  const shift = (to: 1 | 2, left: number, label: string, also?: Button) => (
    <Hold
      label={label} className={cn("size-11", to === 1 && "border-warn", page === to && "bg-foreground text-background")}
      style={{ left: `calc(max(24px, env(safe-area-inset-left)) + ${left}px)`, bottom: 232, ...grow("bottom left") }}
      press={() => { turn(to); if (also) game.press(also); return () => { turn(0); if (also) game.release(also); }; }}
    >
      {label}
    </Hold>
  );
  const shoulder = "h-7 w-16 text-[9px]", guard: Button = air ? "grab" : "guard";
  return (
    <div aria-label="Touch controls" className="pointer-events-none absolute inset-0 hidden pointer-coarse:block [&>*]:pointer-events-auto" style={{ opacity: fit.seen }}>
      <Stick game={game} />
      {shift(1, 0, "Aura", "charge")}
      {shift(2, 54, "Arts")}
      {/* Half an inch over the bottom edge, where a thumb rests without curling down to the phone's rim. */}
      <div className="absolute right-[max(12px,env(safe-area-inset-right))] bottom-[calc(max(10px,env(safe-area-inset-bottom))_+_48px)] h-[194px] w-[156px] !pointer-events-none [&>*]:pointer-events-auto" style={grow("bottom right")}>
        <Hold label={name(guard)} className={cn(shoulder, "top-0 left-0")} press={() => hold(game.scene.hero?.grounded === false ? "grab" : "guard")}>{name(guard)}</Hold>
        <Hold label={name(PAGES.shoulder[page])} className={cn(shoulder, "top-0 right-0")} press={() => hold(PAGES.shoulder[pageRef.current])}>{name(PAGES.shoulder[page])}</Hold>
        {FACES.map(([shape, left, top, mark]) => {
          const k = PAGES[shape][page];
          return (
            <Hold
              key={shape} label={name(k)} style={{ left, top }} press={() => hold(PAGES[shape][pageRef.current])}
              className="flex size-[52px] flex-col items-center justify-center gap-0.5 overflow-hidden text-[8px] tracking-normal"
            >
              {/* The mark in the colour of what the button does: a blow, aura spent, or a jump. */}
              <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 shrink-0 fill-none stroke-current stroke-[2.2]", page > 0 || shape === "circle" ? "text-warn" : shape !== "cross" && "text-destructive")}>{mark}</svg>
              <span className="max-w-full truncate px-0.5">{name(k).split(" ")[0]}</span>
            </Hold>
          );
        })}
      </div>
    </div>
  );
}

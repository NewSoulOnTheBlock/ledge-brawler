// spec/app/index.md, "Story: Stay alive"; spec/app/index.md, "Story: Charge and spend aura"; spec/app/index.md, "Story: Fight the waves"
import { cn } from "@repo/ui";
import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { type Match, fullAura, full } from "../gen/app.ts";
import { CHARS, MOVES_TO_FIND } from "./game/data.ts";
import type { Button, Game } from "./game/sim.ts";
import { KitBar } from "./kit.tsx";
import { Kbd } from "./screens.tsx";

const display = "font-sans font-bold uppercase";

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

/** A button held for as long as a thumb is on it, wherever on the screen the thumb then slides. */
function Hold({ game, k, className, children, label, style }: { game: Game; k: Button; className?: string; children: ReactNode; label?: string; style?: CSSProperties }) {
  return (
    <button
      type="button" aria-label={label} className={cn(pad, className)} style={style}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); tick(); game.press(k); }}
      onPointerUp={() => game.release(k)} onPointerCancel={() => game.release(k)} onLostPointerCapture={() => game.release(k)}
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

/**
 * The controls for a touch screen, shown only where the pointer is coarse and the screen is on its side: the stick
 * under the left thumb, and under the right the buttons in the order a thumb reaches them, the most used the largest.
 */
export function TouchPad({ game, fighter }: { game: Game; fighter: number }) {
  const energy = "border-warn", hit = "border-destructive text-destructive";
  const at = (right: number, bottom: number, size: number): CSSProperties => ({ right, bottom, width: size, height: size });
  // The buttons grow or shrink from the corner each cluster sits in, so that they stay under the thumb.
  const fit = touchFit(), grow = (corner: string): CSSProperties => ({ transform: `scale(${fit.size})`, transformOrigin: corner });
  return (
    <div aria-label="Touch controls" className="pointer-events-none absolute inset-0 hidden pointer-coarse:block [&>*]:pointer-events-auto" style={{ opacity: fit.seen }}>
      <Stick game={game} />
      {/* The bag, over the stick, for the left thumb: the right has its hands full. */}
      <Hold game={game} k="item" label="Use item" style={{ left: "max(24px, env(safe-area-inset-left))", bottom: 232, width: 46, height: 46, ...grow("bottom left") }}>Item</Hold>
      <Hold game={game} k="next" label="Next item" style={{ left: "calc(max(24px, env(safe-area-inset-left)) + 56px)", bottom: 238, width: 38, height: 38, ...grow("bottom left") }}>Next</Hold>
      <div className="absolute right-[max(10px,env(safe-area-inset-right))] bottom-[max(8px,env(safe-area-inset-bottom))] h-[230px] w-[236px] !pointer-events-none [&>*]:pointer-events-auto" style={grow("bottom right")}>
        <Hold game={game} k="jump" style={at(0, 0, 78)} className="text-xs">Jump</Hold>
        <Hold game={game} k="punch" style={at(86, 0, 66)} className={hit}>Punch</Hold>
        <Hold game={game} k="kick" style={at(4, 86, 66)} className={hit}>Kick</Hold>
        <Hold game={game} k="dash" style={at(80, 74, 56)}>Dash</Hold>
        <Hold game={game} k="blast" style={at(160, 2, 54)} className={energy}>Blast</Hold>
        <Hold game={game} k="guard" style={at(144, 64, 50)}>Guard</Hold>
        <Hold game={game} k="grab" style={at(10, 160, 50)}>Hold</Hold>
        <Hold game={game} k="charge" style={at(72, 138, 50)} className={energy}>Charge</Hold>
        <Hold game={game} k="fly" style={at(132, 122, 46)} className={energy}>Fly</Hold>
        <div className="absolute right-[64px] bottom-[196px] grid w-[172px] grid-cols-3 gap-1">
          {game.specials().map((special, i) => <Hold key={special.name} game={game} k={`s${i + 1}` as Button} label={special.name} className={cn(energy, "!static h-[26px] overflow-hidden rounded-md text-[9px]")}>{special.name.split(" ")[0]}</Hold>)}
        </div>
      </div>
    </div>
  );
}

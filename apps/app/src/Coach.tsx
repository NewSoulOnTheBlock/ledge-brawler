// spec/app/index.md, "Story: Learn the moves"
// A first fight's coaching: one thing to try at a time, named by the key, the controller's button or the button on
// the screen that does it, and gone as soon as it has been done. A player is coached once, in whatever kind of fight
// comes first, and can wave it away; the move list (H) has everything else.
import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import type { Match } from "../gen/app.ts";

/** What to try, how it is asked for on each kind of control, and what shows it has been done: one of these keys going down, or the match itself. */
const LESSONS: { say: string; key: string; pad: string; touch: string; codes?: string[]; done?: (match: Match) => boolean }[] = [
  { say: "Move", key: "A  D", pad: "the stick", touch: "the stick", codes: ["KeyA", "KeyD", "ArrowLeft", "ArrowRight"] },
  { say: "Jump", key: "W", pad: "A", touch: "Jump", codes: ["KeyW", "Space", "ArrowUp"] },
  { say: "Strike", key: "J", pad: "X", touch: "Punch", codes: ["KeyJ", "KeyZ"] },
  { say: "Land three blows in a row", key: "J  J  J", pad: "X  X  X", touch: "Punch three times", done: (match) => match.best >= 3 },
  { say: "Dash", key: "I", pad: "RB", touch: "Dash", codes: ["KeyI", "KeyE"] },
  { say: "Shoot a blast", key: "L", pad: "B", touch: "Blast", codes: ["KeyL", "KeyC"] },
];
const coached = () => { try { return localStorage.getItem("coached") === "1"; } catch { return true; } };

export function Coach({ match }: { match: Match }) {
  const [at, setAt] = useState(() => (coached() ? LESSONS.length + 1 : 0));
  const [how, setHow] = useState<"key" | "pad" | "touch">(() => (matchMedia("(pointer: coarse)").matches ? "touch" : "key"));
  const lesson = LESSONS[at];
  // A lesson asked of the keys is learned as one of them goes down: a controller's buttons are keys too (gamepad.ts).
  useEffect(() => {
    if (!lesson?.codes) return;
    const down = (event: KeyboardEvent) => { if (lesson.codes!.includes(event.code)) setAt((n) => n + 1); };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [lesson]);
  useEffect(() => { if (lesson?.done?.(match)) setAt((n) => n + 1); }, [lesson, match]);
  // The controls it names are the ones in the player's hands: a controller's while one is plugged in.
  useEffect(() => {
    if (at > LESSONS.length) return;
    const look = () => setHow((now) => ([...(navigator.getGamepads?.() ?? [])].some((each) => each?.connected) ? "pad" : now === "pad" ? "key" : now));
    look();
    const timer = window.setInterval(look, 1000);
    return () => window.clearInterval(timer);
  }, [at]);
  // The last lesson learned, or the coaching waved away: it is over for good, after a word on where the rest is.
  useEffect(() => {
    if (at !== LESSONS.length) return;
    try { localStorage.setItem("coached", "1"); } catch { /* Private browsing may refuse: it is coached again next time. */ }
    const timer = window.setTimeout(() => setAt(LESSONS.length + 1), 4500);
    return () => window.clearTimeout(timer);
  }, [at]);
  if (at > LESSONS.length) return null;
  return (
    <aside aria-label="First steps" className="pointer-events-none absolute inset-x-0 bottom-[16%] z-20 grid justify-items-center gap-1.5 px-4 text-center">
      <p role="status" className="border-2 border-foreground bg-background/85 px-4 py-2 text-[14px] text-foreground shadow-[4px_4px_0_var(--foreground)]">
        {lesson
          ? <>{lesson.say}: <b className={cn("mx-1 font-sans font-bold tracking-[0.12em] text-destructive", how === "key" && "border border-foreground/60 px-1.5 py-0.5")}>{lesson[how]}</b><span className="ml-2 text-muted-foreground tabular-nums">{at + 1} / {LESSONS.length}</span></>
          : <>That is the heart of it. <b className="font-sans font-bold">H</b> (or Start) shows every move.</>}
      </p>
      {lesson && <button type="button" className="pointer-events-auto text-[11px] tracking-[0.14em] text-muted-foreground uppercase underline-offset-2 hover:underline" onClick={() => setAt(LESSONS.length)}>Skip the coaching</button>}
    </aside>
  );
}

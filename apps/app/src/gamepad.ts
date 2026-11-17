// spec/app/index.md, "Story: Learn the moves"
// A controller plays the game as the keyboard does. In a fight each of its buttons is a key (App.tsx, KEYMAP), pressed
// and let go as the button is, so that whatever a key does a button does. On the fighter select its stick chooses and
// A takes; everywhere else the stick moves through what can be pressed on the page, A presses it and B goes back.
// The first controller that is plugged in is the one that is read.
import { type RefObject, useEffect } from "react";

/** What the controller is for just now: fighting, choosing a fighter, or any other screen with things to press. */
export type PadMode = "fight" | "select" | "menu";

// The standard layout: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 10 and 11 the sticks pressed, 12-15 the D-pad up, down, left, right.
/** In a fight: jump, blast, punch, kick; guard and dash on the bumpers; charge and hold a wall on the triggers; the move list on Start; the bag's next item and using it on the left and right sticks pressed; the three specials on the D-pad's left, up and right, and flight on its down. With Back held, the D-pad's left, up and right are the three greater arts instead. */
const FIGHT: Record<number, string> = { 0: "Space", 1: "KeyL", 2: "KeyJ", 3: "KeyK", 4: "KeyG", 5: "KeyI", 6: "KeyU", 7: "KeyO", 9: "KeyH", 10: "KeyR", 11: "KeyT", 14: "Digit1", 12: "Digit2", 15: "Digit3", 13: "KeyF" };
/** The greater arts, with Back held: the D-pad's left, up and right. */
const ARTS: Record<number, string> = { 14: "Digit4", 12: "Digit5", 15: "Digit6" };
/** How far the stick is pushed before it counts, and how far before the fighter runs. */
const PUSHED = 0.4, HARD = 0.9;

const key = (type: "keydown" | "keyup", code: string) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
const tap = (code: string) => { key("keydown", code); key("keyup", code); };
/** What can be pressed on the page, in the order it is laid out: not the fight's touch controls, and nothing hidden or shut. */
const pressable = () => [...document.querySelectorAll<HTMLElement>("button:not([disabled]), [role=tab]")].filter((el) => el.offsetParent !== null && !el.closest('[aria-label="Touch controls"]'));
/** Moves to the next thing that can be pressed, or the one before. */
function step(by: number) {
  const all = pressable(), at = all.indexOf(document.activeElement as HTMLElement);
  all[at < 0 ? 0 : (at + by + all.length) % all.length]?.focus();
}

/** Reads the controller every frame for as long as the page is open; `mode` says what it is for at the moment. */
export function useGamepad(mode: RefObject<PadMode>) {
  useEffect(() => {
    let frame = 0, was: boolean[] = [], repeat = 0;
    const held = new Set<string>();
    const hold = (want: Set<string>) => {
      for (const code of held) if (!want.has(code)) { held.delete(code); key("keyup", code); }
      for (const code of want) if (!held.has(code)) { held.add(code); key("keydown", code); }
    };
    const read = () => {
      frame = requestAnimationFrame(read);
      const pad = [...(navigator.getGamepads?.() ?? [])].find((each) => each?.connected);
      if (!pad) { hold(new Set()); return; }
      const down = pad.buttons.map((button) => button.pressed), x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
      const pressed = (n: number) => down[n] && !was[n];
      if (mode.current === "fight") {
        const want = new Set<string>();
        for (const [n, code] of Object.entries(FIGHT)) if (down[Number(n)]) want.add(down[8] ? ARTS[Number(n)] ?? code : code);
        if (x < -PUSHED) want.add("ArrowLeft"); else if (x > PUSHED) want.add("ArrowRight");
        if (y < -PUSHED) want.add("ArrowUp"); else if (y > PUSHED) want.add("ArrowDown");
        if (Math.abs(x) > HARD) want.add("ShiftLeft");
        hold(want);
      } else {
        hold(new Set());
        // The stick or the D-pad, once as it is pushed and then four times a second while it is held.
        const way = x < -PUSHED || down[14] ? "left" : x > PUSHED || down[15] ? "right" : y < -PUSHED || down[12] ? "up" : y > PUSHED || down[13] ? "down" : null;
        const now = performance.now(), moved = way !== null && now >= repeat;
        if (way === null) repeat = 0; else if (moved) repeat = now + (repeat === 0 ? 380 : 240);
        if (mode.current === "select") {
          if (moved) tap(way === "left" || way === "up" ? "ArrowLeft" : "ArrowRight");
          if (pressed(0)) tap("Enter");
        } else {
          if (moved) step(way === "left" || way === "up" ? -1 : 1);
          if (pressed(0)) { const at = document.activeElement; if (at instanceof HTMLElement && pressable().includes(at)) at.click(); else step(1); }
          if (pressed(9)) tap("KeyH");
        }
        if (pressed(1)) tap("Escape");
      }
      was = down;
    };
    frame = requestAnimationFrame(read);
    return () => { cancelAnimationFrame(frame); hold(new Set()); };
  }, [mode]);
}

// spec/app/index.md, "The move list opens only during a fight and pauses it; closing it resumes"; "From the open move list the player can go back to choose another fighter"; "The title screen leads to the select screen, and back"
// What Escape brings up in a fight: the pause, with everything a pause is for on one panel. The move list and the
// settings are pages of it; Escape steps back a page, and from the first page resumes (App.tsx).
import { cn } from "@repo/ui";
import type { ReactNode } from "react";
import { BigButton, SmallButton } from "./screens.tsx";

export type PausePage = "menu" | "moves" | "settings";
/** One thing the pause can do: its label and what pressing it does. */
export interface PauseAction { label: string; act: () => void }

const display = "font-display font-bold uppercase";
const item = "w-full py-2.5 text-[13px] tracking-[0.16em]";

/** The pause's panel: its first page (`menu`) or its settings; the move list is its own panel (screens.tsx, MoveList). */
export function PauseMenu({ page, onPage, onResume, actions, settings }: {
  page: Exclude<PausePage, "moves">; onPage: (page: PausePage) => void; onResume: () => void;
  /** What else the pause offers in this fight, in order: a restart, another fighter or chapter, the main menu. */
  actions: PauseAction[];
  settings: ReactNode;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-background/85 px-4 py-6">
      <section aria-labelledby="pauseTitle" className="w-full max-w-[380px] border-2 border-foreground bg-card px-5 pt-4.5 pb-5 shadow-[6px_6px_0_var(--foreground)]">
        <h2 id="pauseTitle" className={cn(display, "mb-4 text-xl tracking-[0.2em]")}>{page === "settings" ? "Settings" : "Paused"}</h2>
        {page === "menu" ? (
          <nav aria-label="Pause" className="grid gap-2">
            <BigButton autoFocus className="w-full" onClick={onResume}>Resume</BigButton>
            {actions.slice(0, -1).map((a) => <SmallButton key={a.label} className={item} onClick={a.act}>{a.label}</SmallButton>)}
            <SmallButton className={item} onClick={() => onPage("moves")}>Move list</SmallButton>
            <SmallButton className={item} onClick={() => onPage("settings")}>Settings</SmallButton>
            {actions.slice(-1).map((a) => <SmallButton key={a.label} className={cn(item, "mt-2 border-destructive text-destructive")} onClick={a.act}>{a.label}</SmallButton>)}
          </nav>
        ) : (
          <>
            {settings}
            <SmallButton autoFocus className={cn(item, "mt-5")} onClick={() => onPage("menu")}>Back</SmallButton>
          </>
        )}
      </section>
    </div>
  );
}

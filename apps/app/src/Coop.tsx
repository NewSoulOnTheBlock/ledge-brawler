// spec/app/index.md, "Story: Play a level of a campaign"
// Co-op's screens (docs/coop-plan.md, coop.ts): the table where the group gathers, takes its five protagonists and
// starts a chapter; the group as it stands while a level is played; and the end of a level that every fighter of
// the group went down in.
import { cn } from "@repo/ui";
import { useState } from "react";
import { type Saga, chaptersDone } from "../gen/app__saga.ts";
import type { Table } from "./coop.ts";
import { CHARS } from "./game/data.ts";
import { chapterById, chapterOf } from "./game/levels.ts";
import { KitButton, KitPanel } from "./kit.tsx";
import { HEROES, type Hero, PROTAGONISTS } from "./story/canon.ts";
import type { Rival, Standing } from "./versus.ts";

const display = "font-sans font-bold uppercase";

/** The chapters of `hero`'s campaign the host may start: every one finished, and the next. */
export function chaptersFor(hero: Hero, saga: Saga | undefined) {
  const done = saga ? chaptersDone(HEROES.indexOf(hero), saga) : 0, list = [];
  for (let chapter = 0; chapter <= Math.min(done, 9); chapter++) { const c = chapterOf(hero, chapter); if (c) list.push(c); }
  return list;
}

/** The group's table: the room's code and link, who sits there and as whom, and (for the host) the chapter and the start. */
export function CoopTable({ table, saga, error, onSeat, onReady, onChoose, onStart, onLeave, onJoin }: {
  table: Table | null; saga: Saga | undefined; error: string;
  onSeat: (hero: Hero | null) => void; onReady: (on: boolean) => void; onChoose: (level: string) => void; onStart: () => void; onLeave: () => void;
  /** Joins another table by its code, or a new one without. */
  onJoin: (code?: string) => void;
}) {
  const [code, setCode] = useState(""), [copied, setCopied] = useState(false);
  if (!table) return (
    <div className="dark absolute inset-0 z-30 grid [place-items:safe_center] bg-[#0b1114]/85 px-4 py-6 text-foreground">
      <KitPanel aria-label="Play together" className="grid w-full max-w-[460px] gap-3 px-5 py-4">
        <h2 className={cn(display, "text-2xl tracking-[0.14em]")}>Play together</h2>
        <p className="text-[12.5px] leading-normal text-muted-foreground">Up to five, each one of the five blades. The host chooses a chapter of their own campaign; it counts for everyone who clears it.</p>
        <KitButton onClick={() => onJoin()} className="justify-self-start px-4 py-2">Open a new table</KitButton>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (code.trim()) onJoin(code.trim()); }}>
          <input aria-label="Table code" value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase())} placeholder="Code" className="w-32 border border-[#e0b84a]/40 bg-black/50 px-2 py-1 font-mono text-sm" />
          <KitButton type="submit" disabled={!code} className="px-3 py-1 disabled:opacity-40">Join</KitButton>
        </form>
        {error && <p role="alert" className="text-[12.5px] text-destructive">{error}</p>}
        <KitButton onClick={onLeave} className="justify-self-start px-3 py-1">Back</KitButton>
      </KitPanel>
    </div>
  );
  const me = table.seats.find((s) => s.me)!, host = table.seats.find((s) => s.host), taken = new Set(table.seats.filter((s) => !s.me && s.hero).map((s) => s.hero));
  const link = `${location.origin}${location.pathname}?together=${table.code}`;
  const chapters = table.host && me.hero ? chaptersFor(me.hero, saga) : [];
  const pick = table.pick ? chapterById(table.pick) : undefined;
  const others = table.seats.filter((s) => !s.me), allReady = others.every((s) => s.ready && s.hero) && !!me.hero;
  const underway = table.seats.some((s) => s.playing) && !me.playing;
  return (
    <div className="dark absolute inset-0 z-30 grid [place-items:safe_center] overflow-y-auto bg-[#0b1114]/85 px-4 py-6 text-foreground">
      <KitPanel aria-label="Play together" className="grid w-full max-w-[560px] gap-3 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={cn(display, "text-2xl tracking-[0.14em]")}>Table {table.code}</h2>
          <span className="text-[12px] text-muted-foreground">{table.seats.length} of 5 · {table.status === "reconnecting" ? "reconnecting…" : host?.me ? "you host" : `${host?.name ?? "…"} hosts`}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Invite link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 border border-[#e0b84a]/30 bg-black/50 px-2 py-1 font-mono text-[11px]" />
          <KitButton className="px-3 py-1" onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true), () => undefined)}>{copied ? "Copied" : "Copy invite"}</KitButton>
        </div>
        <ul aria-label="At the table" className="grid gap-1">
          {table.seats.map((s) => {
            const p = s.hero && PROTAGONISTS.find((each) => each.id === s.hero);
            return (
              <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-white/10 py-1 text-[13px]">
                <span><b className="font-medium">{s.name}</b>{s.me && " (you)"}{s.host && <span className="ml-1.5 text-[11px] text-[#e0b84a]">HOST</span>}
                  <span className="ml-2" style={{ color: p ? CHARS[p.fighter].color === "#111111" ? "#f2b200" : CHARS[p.fighter].color : undefined }}>{p ? p.title : "choosing…"}</span></span>
                <span className={cn("text-[11px] tracking-[0.12em] uppercase", s.ready || s.host ? "text-[#8dffb0]" : "text-muted-foreground")}>{s.playing ? "in a level" : s.host ? "host" : s.ready ? "ready" : "not ready"}</span>
              </li>
            );
          })}
        </ul>
        <div>
          <p className="mb-1 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Your blade</p>
          <div role="radiogroup" aria-label="Your blade" className="flex flex-wrap gap-1.5">
            {PROTAGONISTS.map((p) => (
              <KitButton key={p.id} role="radio" aria-checked={me.hero === p.id} disabled={taken.has(p.id)} onClick={() => onSeat(me.hero === p.id ? null : p.id)}
                className={cn("px-2.5 py-1 text-[12px] disabled:opacity-30", me.hero === p.id && "outline outline-2 outline-[#e0b84a]")}>{p.title}</KitButton>
            ))}
          </div>
        </div>
        {table.host ? (
          <div>
            <p className="mb-1 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Chapter</p>
            {!me.hero ? <p className="text-[12.5px] text-muted-foreground">Choose your blade: the chapter is from your campaign.</p> : (
              <div role="radiogroup" aria-label="Chapter" className="flex flex-wrap gap-1.5">
                {chapters.map((c) => <KitButton key={c.id} role="radio" aria-checked={table.pick === c.id} onClick={() => onChoose(c.id)} className={cn("px-2.5 py-1 text-[12px]", table.pick === c.id && "outline outline-2 outline-[#e0b84a]")}>{c.chapter + 1}. {c.name}</KitButton>)}
              </div>
            )}
          </div>
        ) : <p className="text-[12.5px]">{pick ? <>The host has chosen <b>{pick.name}</b>, chapter {pick.chapter + 1}.</> : "The host is choosing a chapter."}</p>}
        {underway && <p role="status" className="text-[12.5px] text-[#e0b84a]">A level is under way. You will set out with the group on the next one.</p>}
        {error && <p role="alert" className="text-[12.5px] text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {table.host
            ? <KitButton disabled={!me.hero || !table.pick || !allReady} onClick={onStart} className="px-4 py-2 disabled:opacity-40">{!allReady && others.length ? "Waiting for everyone to be ready" : "Set out"}</KitButton>
            : <KitButton disabled={!me.hero} aria-pressed={me.ready} onClick={() => onReady(!me.ready)} className="px-4 py-2 disabled:opacity-40">{me.ready ? "Not ready" : "Ready"}</KitButton>}
          <KitButton onClick={onLeave} className="px-3 py-2">Leave table</KitButton>
        </div>
      </KitPanel>
    </div>
  );
}

/** The group as it stands in a level: each fighter's health and revives, who is down, and how well each is heard. */
export function CoopParty({ standing, revivesLeft }: { standing: Standing; revivesLeft: number }) {
  return (
    <aside aria-label="Your group" className="pointer-events-none absolute top-[150px] left-4 grid w-[min(60vw,230px)] gap-1 text-[11.5px] pointer-coarse:top-[104px] pointer-coarse:left-2 pointer-coarse:w-[170px] pointer-coarse:text-[10px]">
      {standing.rivals.map((r: Rival) => {
        const colour = CHARS[r.fighter].color === "#111111" ? "#f2b200" : CHARS[r.fighter].color;
        // Lives on a quest: two to lose, and the Reaper's letting-off; shown as the revives that are left. A teammate's
        // game does not say whether it has been let off, so its last life is counted as one more (it is, until it has).
        const left = r.me ? revivesLeft : Math.max(0, r.lives);
        return (
          <div key={r.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-x-2 border-l-2 bg-black/55 px-2 py-0.5", !r.alive && "opacity-80")} style={{ borderColor: colour }}>
            <b className="truncate font-medium" style={{ color: colour }}>{r.name}{r.me && " (you)"}</b>
            <span className={cn("text-right tabular-nums", r.quiet ? "text-destructive" : "text-muted-foreground")}>{r.me ? "" : r.quiet ? "lagging" : r.ping !== undefined ? `${r.ping}ms` : "…"}</span>
            <span className={cn("col-span-2 text-[10.5px] tracking-[0.1em] uppercase", r.alive ? "text-white/70" : left > 0 || r.me ? "text-[#ff8a7a]" : "text-muted-foreground line-through")}>
              {r.alive ? `${"◆".repeat(left)}${"◇".repeat(Math.max(0, 3 - left))} revives` : left > 0 || r.me ? "down: stand by them" : "out"}
            </span>
          </div>
        );
      })}
    </aside>
  );
}

/** Every fighter of the group down at once: the level is lost, for all of them. */
export function Wiped({ onTable }: { onTable: () => void }) {
  return (
    <div className="dark absolute inset-0 z-20 grid place-items-center bg-[#0b1114]/80 px-4 text-foreground">
      <KitPanel aria-labelledby="wipedTitle" className="grid w-full max-w-[420px] justify-items-center gap-3 px-5 py-4 text-center">
        <h2 id="wipedTitle" className={cn(display, "text-3xl tracking-[0.12em] text-destructive")}>The group has fallen</h2>
        <p className="text-[12.5px] text-muted-foreground">Every blade went down at once. Gather at the table and try again.</p>
        <KitButton onClick={onTable} className="px-4 py-2">Back to the table</KitButton>
      </KitPanel>
    </div>
  );
}

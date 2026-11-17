// spec/app/saga.md, "Story: Play five campaigns"; spec/app/saga.md, "Story: Change the world"; spec/app/saga.md, "Story: Begin again"
import { cn } from "@repo/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type Saga, chaptersDone, chaptersEach, knows, playerKnows } from "../gen/app__saga.ts";
import { CHARS } from "./game/data.ts";
import { RELICS, RELIC_ICONS, RELIC_KINDS, RELIC_MARK, type RelicKind, isFound, relicCounts } from "./game/relics.ts";
import { OutfitPicker } from "./screens.tsx";
import { type Level, hasLevel } from "./game/levels.ts";
import { ArtLoading, KitButton, KitPanel, KitWord } from "./kit.tsx";
import { FACTS, HEROES, type Hero, MEASURES, PROTAGONISTS, REGIONS, factNumber } from "./story/canon.ts";
import { DILEMMAS, bestOf, rankOf } from "./story/parley.ts";
import { prelude } from "./story/prelude.ts";
import { TRUTHS, markRead, wasRead } from "./story/truths.ts";
import { turnsOf } from "./story/world.ts";
import { SCHOOLS, deedsOf, end, endedBy, epilogue, waysOf } from "./story/endings.ts";
import { VOICES } from "./story/voices.ts";
import { PATHS, buildOf, pointsLeft, spend, unbuild } from "./story/build.ts";

const display = "font-sans font-bold uppercase";
/** What is inside comes up out of nothing each time `on` changes: a card of a telling, a truth opened, an ending told. Not for a player who has asked for less motion. */
function Rise({ on, className, children }: { on: unknown; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    box.current?.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: "ease-out" });
  }, [on]);
  return <div ref={box} className={className}>{children}</div>;
}
/** A fighter's colour as it shows on the kit's dark plates: ink, which would not, becomes bone. */
const lit = (colour: string) => (parseInt(colour.slice(1, 3), 16) + parseInt(colour.slice(3, 5), 16) + parseInt(colour.slice(5, 7), 16) < 150 ? "#dfe3e0" : colour);
/** The kit's four small frames, one to a campaign in turn. */
const FRAMES = Object.values(import.meta.glob<string>("./game/packs/ui/frame*.png", { eager: true, query: "?url", import: "default" }));

/**
 * The five campaigns: how far each has come, the chapter to play next, and the state of the world.
 * @model spec/app/saga.md
 */
/** The picture the Puzzle Pieces make up: the home screen's. */
const HOME = Object.values(import.meta.glob<string>("./home.webp", { eager: true, query: "?url", import: "default" }))[0];

/** A collectible's picture, square pixels drawn as the game draws it (relics.ts). */
function RelicIcon({ kind }: { kind: RelicKind }) {
  const { icon, colours } = RELIC_ICONS[kind];
  return (
    <svg aria-hidden viewBox={`0 0 ${icon[0].length} ${icon.length}`} className="size-7 shrink-0 [image-rendering:pixelated]" shapeRendering="crispEdges">
      {icon.flatMap((row, y) => [...row].map((c, x) => (c === "." ? null : <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={colours[c]} />)))}
    </svg>
  );
}

export function CampaignScreen({ saga, canBeginAgain, onPlay, onEnding, onBack, onBeginAgain }: { saga: Saga; canBeginAgain: boolean; onPlay: (hero: Hero, chapter: number) => void; /** Opens the ending of a campaign whose chapters are all finished. */ onEnding: (hero: Hero) => void; onBack: () => void; onBeginAgain: () => void }) {
  const [chosen, setChosen] = useState(0), [knowing, setKnowing] = useState(false), [sure, setSure] = useState(false);
  const found = relicCounts();
  const fresh = TRUTHS.filter((truth) => truth.halves.every((half) => playerKnows(factNumber(half), saga)) && !wasRead(truth.id)).length;
  const hero = PROTAGONISTS[chosen], colour = lit(CHARS[hero.fighter].color), done = chaptersDone(chosen, saga);
  return (
    <section aria-label="Campaign" className="dark absolute inset-0 grid place-items-center overflow-y-auto bg-[#0b1114]/94 px-4 py-6 text-foreground">
      <div className="grid w-full max-w-[1040px] gap-4">
        <h2 className={cn(display, "text-[clamp(26px,4vw,40px)] tracking-widest text-[#9fe3e6]")}>The Five Blades <ArtLoading /></h2>
        <div role="tablist" className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {PROTAGONISTS.map((p, i) => {
            const mine = lit(CHARS[p.fighter].color), finished = chaptersDone(i, saga);
            return (
              <button
                key={p.id} type="button" role="tab" aria-selected={i === chosen} onClick={() => setChosen(i)}
                className={cn("grid cursor-pointer gap-1.5 bg-[#10171b] bg-clip-padding px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", i !== chosen && "opacity-55 hover:opacity-90")}
                style={{ border: "16px solid transparent", borderImage: `url(${FRAMES[i % FRAMES.length]}) 8 fill / 16px stretch`, imageRendering: "pixelated" }}
              >
                <span className={cn(display, "text-base tracking-[0.12em]")} style={{ color: mine }}>{p.title}</span>
                <span role="meter" aria-label={`${p.title}: chapters finished`} aria-valuemin={0} aria-valuemax={chaptersEach} aria-valuenow={finished} className="flex gap-0.5">
                  {p.chapters.map((chapter, n) => <b key={chapter.title} className="h-1.5 flex-1 bg-border" style={n < finished ? { background: mine } : undefined} />)}
                </span>
              </button>
            );
          })}
        </div>
        <KitPanel className="grid gap-x-6 gap-y-4 px-3 py-2 md:grid-cols-[1fr_1.2fr]">
          <div className="grid content-start gap-2 text-[12.5px] leading-normal">
            <h3 className={cn(display, "text-2xl tracking-[0.12em]")} style={{ color: colour }}>{hero.campaign}</h3>
            <p><b>{hero.archetype}.</b></p>
            <p>{hero.background}</p>
            <p className="text-muted-foreground">{hero.weapon}. {hero.magic}. {REGIONS.find((region) => region.id === hero.start)!.name}.</p>
            <Skills hero={hero.id} chapters={done} colour={colour} />
            <OutfitPicker fighter={hero.fighter} />
            {/* Every chapter there is to play is finished: how it ends, or how it ended. */}
            {done > 0 && !hasLevel(hero.id, done) && <KitButton className="mt-1 justify-self-start px-3 py-1" onClick={() => onEnding(hero.id)}>{endedBy(hero.id) === null ? "How it ends" : `It ended: ${hero.finalChoice[endedBy(hero.id)!]}`}</KitButton>}
          </div>
          <ol className="grid content-start gap-1 text-[12.5px]">
            {hero.chapters.map((chapter, n) => {
              const open = n <= done && hasLevel(HEROES[chosen], n);
              return (
                <li key={chapter.title} className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 border-b border-dashed border-border py-1">
                  <span className="text-muted-foreground tabular-nums">{n + 1}</span>
                  <span className={cn(n > done && "text-muted-foreground")}>
                    <b className="font-medium">{chapter.title}</b>
                    {n < done && <span aria-label="finished" className="text-destructive"> ✓</span>}
                    {bestOf(`${HEROES[chosen]}-${n + 1}`) && <b aria-label="best rank" className="ml-1.5 font-sans text-[#e0b84a]">{bestOf(`${HEROES[chosen]}-${n + 1}`)}</b>}
                    {/* Its Puzzle Piece, Soul Stone Fragment and Thread: filled once found, so the ones still hidden can be gone back for. */}
                    {n <= done && hasLevel(HEROES[chosen], n) && (
                      <span className="ml-2 inline-flex gap-1 align-middle">
                        {RELIC_KINDS.map((kind) => {
                          const got = isFound(kind, `${HEROES[chosen]}-${n + 1}`);
                          return <i key={kind} aria-label={`${RELICS[kind].name}: ${got ? "found" : "not found"}`} className={cn("inline-block size-2 border", RELIC_MARK[kind])} style={{ borderColor: RELICS[kind].colour, background: got ? RELICS[kind].colour : "transparent" }} />;
                        })}
                      </span>
                    )}
                    {n <= done && <span className="block text-muted-foreground">{chapter.event}</span>}
                  </span>
                  {open && <KitButton className={cn(n !== done && "opacity-70")} onClick={() => onPlay(HEROES[chosen], n)}>{n === done ? "Play" : "Replay"}</KitButton>}
                  {/* A chapter of the story with no level made for it yet says so, where otherwise it would only seem shut. */}
                  {!hasLevel(HEROES[chosen], n) && <span className="text-[11px] tracking-wider text-muted-foreground uppercase">to come</span>}
                </li>
              );
            })}
          </ol>
        </KitPanel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-5 gap-y-2 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          {MEASURES.map((measure) => (
            <div key={measure.key} className="grid gap-1">
              <span>{measure.name}</span>
              <div role="meter" aria-label={measure.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={saga[measure.key]} className="h-2 border-[1.5px] border-foreground bg-background">
                <i className="block h-full bg-foreground" style={{ width: `${saga[measure.key]}%` }} />
              </div>
            </div>
          ))}
        </div>
        {turnsOf(saga).length > 0 && (
          <ul aria-label="How the world has turned" className="grid gap-0.5 text-[12.5px]">
            {turnsOf(saga).map((turn) => <li key={turn.key}><b className="font-medium text-[#e0b84a]">{turn.name}.</b> <span className="text-muted-foreground">{turn.does}</span></li>)}
          </ul>
        )}
        {/* The puzzle: the five before the throne, cut in twenty-five, one piece in each level, a protagonist to a row
            and a chapter to a column. A found piece shows its part of the picture; the rest are dark, numbered by chapter. */}
        <figure aria-label={`The puzzle: ${found.puzzle} of 25 pieces found`} className="grid gap-1.5">
          <div className="grid aspect-[16/9] w-full max-w-[420px] grid-cols-5 gap-px bg-border/60 p-px">
            {HEROES.flatMap((who, row) => [0, 1, 2, 3, 4].map((col) => {
              const got = isFound("puzzle", `${who}-${col + 1}`);
              return (
                <i key={`${who}-${col}`} title={`${PROTAGONISTS[row].title}, chapter ${col + 1}${got ? "" : ": not yet found"}`}
                  className="grid place-items-center bg-[#0b1114] text-[9px] text-muted-foreground not-italic"
                  style={got ? { backgroundImage: `url(${HOME})`, backgroundSize: "500% 500%", backgroundPosition: `${col * 25}% ${row * 25}%` } : undefined}>
                  {!got && col + 1}
                </i>
              );
            }))}
          </div>
          <figcaption className="text-[11px] text-muted-foreground">A piece of this picture is hidden in every level.</figcaption>
        </figure>
        {/* What has been found besides the keys, in all five campaigns, and what enough of each earns (relics.ts). */}
        <ul aria-label="Found in the campaigns" className="grid gap-2 sm:grid-cols-3">
          {RELIC_KINDS.map((kind) => {
            const def = RELICS[kind], count = Math.min(found[kind], def.need), done = count >= def.need;
            return (
              <li key={kind} className="flex items-center gap-2.5 text-[12px]">
                <RelicIcon kind={kind} />
                <span className="grid">
                  <b className="font-medium" style={{ color: def.colour }}>{def.plural} <span className="tabular-nums">{count} / {def.need}</span></b>
                  <span className={done ? "text-[#e0b84a]" : "text-muted-foreground"}>{done ? "Earned: " : ""}{def.reward}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap justify-end gap-3">
          <KitButton className="px-3 py-1.5" onClick={() => setKnowing(true)}>What is known{fresh > 0 && <b className="ml-2 text-[#e0b84a]">{fresh} new</b>}</KitButton>
          {/* Beginning again forgets everything, for all five: it is asked for twice. */}
          {canBeginAgain && (sure
            ? <span role="alertdialog" aria-label="Begin again?" className="flex flex-wrap items-center gap-2 text-[12.5px] text-destructive">Forget every chapter, build and ending, for all five?<KitButton autoFocus className="px-3 py-1.5" onClick={() => setSure(false)}>Keep them</KitButton><KitButton className="px-3 py-1.5 text-destructive" onClick={() => { setSure(false); onBeginAgain(); }}>Forget everything</KitButton></span>
            : <KitButton className="px-3 py-1.5 text-destructive" onClick={() => setSure(true)}>Begin again</KitButton>)}
          <KitWord word="Back" onClick={onBack} />
        </div>
      </div>
      {knowing && <Known saga={saga} onClose={() => setKnowing(false)} />}
    </section>
  );
}

/** The guide speaking: one line of what he has to say, and the way on to the next. */
export function GuideTalk({ who, end, choices, line, at, of, onNext, onSkip, watching }: { who?: string; end?: string; /** What the player may say to this line, in place of going on. */ choices?: { say: string; pick: () => void }[]; line: string; at: number; of: number; onNext: () => void; onSkip: () => void;
  /** Co-op: someone else's talk, read as they go on with it (docs/coop-plan.md): this player only follows it. */ watching?: string }) {
  return (
    <div className="dark absolute inset-x-0 top-[17%] grid place-items-center px-4 text-foreground">
      <KitPanel aria-label={`${who ?? "The Reaper"} speaks`} className="grid w-full max-w-[680px] gap-2 px-4 py-3">
        <p className="flex items-baseline justify-between text-xs tracking-[0.2em] uppercase">
          <b className="font-sans font-bold text-[#e0566a]">{who ?? "The Reaper"}</b>
          <span className="text-muted-foreground tabular-nums">{at + 1} / {of}</span>
        </p>
        <p role="status" className="min-h-[3.2em] text-[14px] leading-relaxed text-foreground">{line}</p>
        {watching ? <p className="text-right text-[12px] text-muted-foreground italic">{watching}</p> : <div className="flex items-center justify-end gap-3">
          {!choices && <KitButton className="px-2 py-0.5 opacity-70" onClick={onSkip}>Skip</KitButton>}
          {choices
            ? <div className="grid w-full gap-1.5">{choices.map((choice) => <KitButton key={choice.say} className="justify-start px-3 py-1 text-left" onClick={choice.pick}>{choice.say}</KitButton>)}</div>
            : <KitButton autoFocus className="px-3 py-0.5" onClick={onNext}>{at + 1 < of ? "Next" : end ?? (who ? "Fight" : "Begin")}</KitButton>}
        </div>}
      </KitPanel>
    </div>
  );
}

/**
 * What the player knows: each fact of the canon and which protagonists learned it, and the truths that two facts make
 * together, which can be read once both are known, by whoever learned them.
 */
function Known({ saga, onClose }: { saga: Saga; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const has = (fact: (typeof FACTS)[number]["id"]) => playerKnows(factNumber(fact), saga);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-[#05080a]/95 px-4 py-6">
      <KitPanel aria-label="What is known" className="grid w-full max-w-[1040px] gap-x-6 gap-y-3 px-4 py-3 text-[12.5px] md:grid-cols-2">
        <div className="grid content-start gap-1">
          <h3 className={cn(display, "text-xl tracking-[0.12em] text-[#9fe3e6]")}>What is known</h3>
          <ul className="grid gap-1">
            {FACTS.map((fact, n) => (
              <li key={fact.id} className={cn("border-b border-dashed border-border py-1", !has(fact.id) && "text-muted-foreground")}>
                {has(fact.id) ? fact.truth : "Not yet known."}
                {has(fact.id) && <span className="block text-[11px]">{PROTAGONISTS.map((p, who) => knows(who, n, saga) && <b key={p.id} className="mr-2 font-medium" style={{ color: lit(CHARS[p.fighter].color) }}>{p.title}</b>)}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-2">
          <h3 className={cn(display, "text-xl tracking-[0.12em] text-[#e0b84a]")}>What it adds up to</h3>
          <p className="text-muted-foreground">Some truths are in two pieces, found on different roads. No one of the five holds both. You can.</p>
          {TRUTHS.map((truth) => {
            const held = truth.halves.filter(has).length, whole = held === 2;
            return (
              <div key={truth.id} className={cn("border-2 px-2 py-1.5", whole ? "border-[#e0b84a]/70" : "border-foreground/20 text-muted-foreground")}>
                <button type="button" disabled={!whole} aria-expanded={open === truth.id} className="flex w-full items-baseline justify-between gap-2 text-left" onClick={() => { markRead(truth.id); setOpen(open === truth.id ? null : truth.id); }}>
                  <b className={cn(display, "tracking-[0.1em]")}>{whole ? truth.title : "Something unfinished"}</b>
                  <span className="text-[11px]">{whole ? (wasRead(truth.id) ? "read" : "new") : `${held} of 2 pieces`}</span>
                </button>
                {open === truth.id && <Rise on={truth.id}>{truth.scene.map((line) => <p key={line} className="mt-1.5 leading-relaxed text-foreground">{line}</p>)}</Rise>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end md:col-span-2"><KitWord word="Back" autoFocus onClick={onClose} /></div>
      </KitPanel>
    </div>
  );
}

/**
 * How a protagonist's campaign ends: what it did, the three ways it can end with those it has not earned shut, and,
 * once one is chosen, what is told of it. A choice made stands.
 */
export function Ending({ hero, onDone }: { hero: Hero; onDone: () => void }) {
  const p = PROTAGONISTS.find((each) => each.id === hero)!, did = deedsOf(hero), voice = VOICES[hero].name.replace(/^./, (first) => first.toLowerCase());
  const [chosen, setChosen] = useState(endedBy(hero));
  const answers = did.schools.flatMap((n, school) => Array.from({ length: n }, () => SCHOOLS[school]));
  return (
    <div className="dark absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-[#05080a] px-4 py-6 text-foreground">
      <section aria-labelledby="endingTitle" className="grid w-full max-w-[680px] gap-4 text-[13px] leading-relaxed">
        <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{p.title} · {p.campaign}</p>
        <h2 id="endingTitle" className={cn(display, "text-3xl tracking-[0.12em]")} style={{ color: lit(CHARS[p.fighter].color) }}>{chosen === null ? "How it ends" : p.finalChoice[chosen]}</h2>
        {chosen === null ? (
          <>
            <ul aria-label="What you did" className="grid gap-0.5 text-muted-foreground">
              <li>You heeded the Reaper <b className="font-medium text-foreground tabular-nums">{did.reaper}</b> times, and {voice} <b className="font-medium text-foreground tabular-nums">{did.voice}</b>.</li>
              <li>You defied <b className="font-medium text-foreground tabular-nums">{did.defied}</b> of those sent against you, reasoned with <b className="font-medium text-foreground tabular-nums">{did.reasoned}</b>, and said nothing to <b className="font-medium text-foreground tabular-nums">{did.silent}</b>.</li>
              {answers.length > 0 && <li>When something was asked of you, you answered with <b className="font-medium text-foreground">{answers.join(", ")}</b>.</li>}
              {did.memories > 0 && <li>You gave the Reaper <b className="font-medium text-foreground tabular-nums">{did.memories}</b> of your memories.</li>}
            </ul>
            <p>That is who came to the end of this road. These are the ways it can end. Not all of them are open to the one you became.</p>
            <div className="grid gap-2">
              {waysOf(hero).map((way, which) => (
                <button key={way.name} type="button" disabled={!way.open} onClick={() => { end(hero, which); setChosen(which); }}
                  className={cn("grid gap-0.5 border-2 px-3 py-2 text-left", way.open ? "border-[#e0b84a]/70 hover:bg-[#e0b84a]/10" : "border-foreground/15 text-muted-foreground")}>
                  <b className={cn(display, "tracking-[0.1em]")}>{way.name}</b>
                  <span className="text-[12px]">{way.open ? `Open to you, by ${way.by}.` : `Closed. It is earned by ${way.by}.`}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end"><KitButton className="px-3 py-1 opacity-70" onClick={onDone}>Not yet</KitButton></div>
          </>
        ) : (
          <>
            <Rise on={chosen} className="grid gap-4">{epilogue(hero, chosen).map((line) => <p key={line} className="text-[15px]">{line}</p>)}</Rise>
            <div className="flex justify-end"><KitWord word="Back" autoFocus onClick={onDone} /></div>
          </>
        )}
      </section>
    </div>
  );
}

/** Before a protagonist's first chapter: the world, who it is, who it is up against, and who the Reaper is, a card at a time. */
/** The pictures made for the opening's cards (story/intro), by name: `prelude-<art>.webp` or `.png`. */
const INTRO = Object.fromEntries(Object.entries(import.meta.glob<string>("./story/intro/prelude-*.{webp,png,jpg}", { eager: true, query: "?url", import: "default" })).map(([path, url]) => [path.replace(/^.*prelude-|\.\w+$/g, ""), url]));

export function Prelude({ hero, onDone }: { hero: Hero; onDone: () => void }) {
  const cards = prelude(hero), [at, setAt] = useState(0), card = cards[at], last = at + 1 === cards.length, art = card.art && INTRO[card.art];
  // The keys that go on everywhere else go on here: Enter, Space or J for the next card, Escape to skip them all.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (["Enter", "NumpadEnter", "Space", "KeyJ"].includes(event.code)) { event.preventDefault(); event.stopPropagation(); if (last) onDone(); else setAt((n) => n + 1); }
      else if (event.code === "Escape") { event.preventDefault(); event.stopPropagation(); onDone(); }
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [last, onDone]);
  return (
    <div className={cn("dark absolute inset-0 z-40 grid bg-[#05080a] px-4 text-foreground", art ? "place-items-end pb-[8vh]" : "place-items-center")}>
      {/* The card's picture, where one has been made, filling the page and darkened where the words are. */}
      {art && <Rise on={art} className="absolute inset-0"><div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, #05080a 0%, rgba(5,8,10,0.88) 42%, rgba(5,8,10,0) 72%), url(${art})` }} /></Rise>}
      <section aria-label="Before it begins" className="relative mx-auto grid w-full max-w-[760px] gap-5">
        <p className="flex items-baseline justify-between text-xs tracking-[0.25em] uppercase">
          <b className={cn(display, "text-[#e0566a]")}>{card.who}</b>
          <span className="text-muted-foreground tabular-nums">{at + 1} / {cards.length}</span>
        </p>
        <Rise on={at}><p role="status" className="min-h-[10em] text-[16px] leading-relaxed text-pretty">{card.text}</p></Rise>
        <div className="flex items-center justify-end gap-3">
          {!last && <KitButton className="px-2 py-0.5 opacity-70" onClick={onDone}>Skip</KitButton>}
          <KitButton autoFocus className="px-3 py-0.5" onClick={() => (last ? onDone() : setAt(at + 1))}>{last ? "Begin" : "Next"}</KitButton>
        </div>
      </section>
    </div>
  );
}

/** What the player has built a protagonist into: its points, and the five paths they go on. */
function Skills({ hero, chapters, colour }: { hero: Hero; chapters: number; colour: string }) {
  const [, redraw] = useState(0), build = buildOf(hero), left = pointsLeft(hero, chapters);
  const act = (change: () => void) => { change(); redraw((n) => n + 1); };
  return (
    <section aria-label="Skills" className="mt-2 grid gap-1 border-t border-dashed border-border pt-2 text-[12.5px]">
      <p className="flex items-baseline justify-between">
        <b className={cn(display, "tracking-[0.12em]")}>Skills</b>
        <span className="text-muted-foreground"><b className="font-medium tabular-nums" style={{ color: colour }}>{left}</b> to spend · two for each chapter finished</span>
      </p>
      {PATHS.map((path) => (
        <p key={path.key} className="grid grid-cols-[70px_1fr_auto_auto] items-center gap-2">
          <b className="font-medium">{path.name}</b>
          <span className="text-muted-foreground">{path.each}</span>
          <span role="meter" aria-label={path.name} aria-valuemin={0} aria-valuemax={path.most} aria-valuenow={build[path.key]} className="flex gap-0.5">
            {Array.from({ length: path.most }, (_, n) => <b key={n} className="h-2 w-3 bg-border" style={n < build[path.key] ? { background: colour } : undefined} />)}
          </span>
          <KitButton aria-label={`Add to ${path.name}`} disabled={left <= 0 || build[path.key] >= path.most} className="px-2 py-0 disabled:opacity-40" onClick={() => act(() => spend(hero, path.key, chapters))}>+</KitButton>
        </p>
      ))}
      {left < 2 * chapters && <KitButton className="justify-self-start px-2 py-0 opacity-70" onClick={() => act(() => unbuild(hero))}>Take the points back</KitButton>}
    </section>
  );
}

/** A level cleared: its chapter, what it did to the world, and the way on. */
export function ChapterClear({ level, counts, went, onContinue, ask = true }: { level: Level; counts: boolean; /** Whether this player answers the chapter's question: in co-op only the host does (docs/coop-plan.md). */ ask?: boolean; /** How it went: the time it took in seconds, the lives it cost, and how much of what there was to find was found. */ went: { seconds: number; lost: number; found: number; of: number } | null; onContinue: (from?: number) => void }) {
  const hero = PROTAGONISTS.find((p) => p.id === level.hero)!;
  // spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"
  // What finishing this chapter for the first time teaches: one of four specials for each of the first three, then Overdrive, then flight.
  const [from, setFrom] = useState<number | null>(null), slot = level.chapter, dilemma = ask && counts && slot < 3 ? DILEMMAS[level.id] : undefined;
  return (
    <div className="dark absolute inset-0 grid place-items-center bg-[#0b1114]/80 px-4 text-foreground">
      <KitPanel aria-labelledby="clearTitle" className="grid w-full max-w-[520px] justify-items-start gap-3 px-4 py-3">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{hero.title} · chapter {level.chapter + 1}</p>
        <h2 id="clearTitle" className={cn(display, "text-3xl tracking-[0.12em]")}>{level.name}</h2>
        <p className="text-[12.5px] leading-normal">{hero.chapters[level.chapter].event}.</p>
        {went && (<>
          <dl aria-label="How it went" className="grid w-full grid-cols-4 gap-2 text-center">
            {[["Time", `${Math.floor(went.seconds / 60)}:${String(went.seconds % 60).padStart(2, "0")}`], ["Lives lost", String(went.lost)], ["Found", `${went.found} / ${went.of}`]].map(([label, value]) => (
              <div key={label} className="grid gap-0.5 border border-foreground/25 px-1 py-1.5">
                <dt className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{label}</dt>
                <dd className={cn(display, "text-lg tabular-nums")}>{value}</dd>
              </div>
            ))}
            <div className="grid gap-0.5 border-2 border-[#e0b84a] bg-[#e0b84a]/10 px-1 py-1.5">
              <dt className="text-[10px] tracking-[0.16em] text-[#e0b84a] uppercase">Rank</dt>
              <dd className={cn(display, "text-2xl leading-none text-[#e0b84a]")}>{rankOf(went)}</dd>
            </div>
          </dl>
          {/* What else this level held: filled for each found, so a miss is seen while there is still the will to go back. */}
          <p aria-label="Found in this level" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px]">
            {RELIC_KINDS.map((kind) => { const got = isFound(kind, level.id); return <span key={kind} className="inline-flex items-center gap-1.5" style={{ color: got ? RELICS[kind].colour : undefined }}><i aria-hidden className={cn("inline-block size-2 border", RELIC_MARK[kind])} style={{ borderColor: RELICS[kind].colour, background: got ? RELICS[kind].colour : "transparent" }} />{RELICS[kind].name}{got ? "" : ": still hidden"}</span>; })}
          </p>
        </>)}
        {counts && (
          <ul className="grid gap-0.5 text-[12.5px]">
            {level.effects.map((effect) => <li key={effect.measure}>{MEASURES[effect.measure].name} <b className="font-medium tabular-nums">{effect.amount > 0 ? "+" : "−"}{Math.abs(effect.amount)}</b></li>)}
          </ul>
        )}
        {dilemma && (
          <fieldset className="grid w-full gap-1.5">
            <legend className="mb-1 text-[12.5px] leading-normal text-[#e0b84a]">{dilemma.ask}</legend>
            {dilemma.answers.map((answer) => (
              <button key={answer.school} type="button" aria-pressed={from === answer.school} disabled={from !== null} onClick={() => setFrom(answer.school)}
                className={cn("border-2 px-2 py-1.5 text-left text-[12.5px] leading-snug", from === answer.school ? "border-[#e0b84a] bg-[#e0b84a]/15" : "border-foreground/30", from !== null && from !== answer.school && "opacity-40")}>
                {answer.say}
              </button>
            ))}
            {/* What was chosen cannot be taken back, and only then is what it taught shown. */}
            {from !== null && <p role="status" className="text-[12.5px]">It is done. From it you learn <b className="font-sans font-bold tracking-wider text-[#e0b84a] uppercase">{CHARS[from].specials[slot].name}</b>, on key {slot + 1}.</p>}
          </fieldset>
        )}
        {counts && slot === 3 && <p className="text-[12.5px] text-[#e0b84a]">Learned: Overdrive. Hold U at full aura.</p>}
        {counts && slot === 4 && <p className="text-[12.5px] text-[#e0b84a]">Learned: flight. Press F to take off.</p>}
        {(!dilemma || from !== null) && <KitWord word="Continue" autoFocus onClick={() => onContinue(dilemma ? from ?? undefined : undefined)} />}
      </KitPanel>
    </div>
  );
}

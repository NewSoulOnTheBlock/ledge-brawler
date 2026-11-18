import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import { chaptersDone, type Saga } from "../gen/app__saga.ts";
import { useAuth } from "./auth.tsx";
import { CHARS } from "./game/data.ts";
import { type Board, type GameStats, loadStats, standingOf, syncSagaToCloud } from "./scores.ts";
import { HEROES, PROTAGONISTS } from "./story/canon.ts";
import { WalletAddress } from "./WalletAddress.tsx";
import { TheWorld, lit } from "./Campaign.tsx";
import { KitButton, KitPanel } from "./kit.tsx";
import { ACHIEVEMENTS, unlocked as getUnlocked } from "./achievements.ts";

const display = "font-display font-bold uppercase";
const CHAPTERS_PER_HERO = 5;

export function Profile({ saga, onClose }: { saga: Saga; onClose: () => void }) {
  const { user, logout } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [stats] = useState<GameStats>(loadStats);
  const [badges] = useState<string[]>(getUnlocked);

  useEffect(() => { standingOf().then(setBoard).catch(() => {}); }, []);

  const totalDone = HEROES.reduce((sum, _, i) => sum + chaptersDone(i, saga), 0);
  const totalChapters = HEROES.length * CHAPTERS_PER_HERO;

  const handleSync = () => {
    setSyncing(true);
    syncSagaToCloud();
    setTimeout(() => { setSyncing(false); setSynced(true); }, 600);
  };

  return (
    <section aria-labelledby="profile" className="dark absolute inset-0 z-20 overflow-y-auto bg-[#0b1114] px-4 py-6 text-foreground">
      <div className="mx-auto grid w-full max-w-[1040px] gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="profile" className={cn(display, "text-[clamp(26px,4vw,40px)] tracking-widest text-[#9fe3e6]")}>Profile</h2>
          <KitButton className="px-4 py-1.5" onClick={onClose}>Close</KitButton>
        </header>

        {user && (
          <div className="grid gap-1.5 text-[13px]">
            {user.name && <p><b className="font-medium text-foreground">{user.name}</b></p>}
            {user.email && <p className="text-muted-foreground">{user.email}</p>}
            {user.wallet && <p className="flex items-center gap-1.5 text-muted-foreground">Wallet <WalletAddress address={user.wallet} /></p>}
          </div>
        )}

        <KitPanel className="grid gap-x-8 gap-y-5 px-4 py-3 md:grid-cols-2">
        <div>
          <h3 className={cn(display, "mb-2 text-[11px] tracking-[0.2em] text-destructive")}>Campaign progress</h3>
          <div className="grid gap-1.5">
            {HEROES.map((hero, i) => {
              const done = chaptersDone(i, saga);
              const prot = PROTAGONISTS.find((p) => p.id === hero)!;
              const c = CHARS[prot.fighter];
              return (
                <div key={hero} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2.5 rounded-full" style={{ background: lit(c.color) }} />
                    <span className="font-medium" style={{ color: lit(c.color) }}>{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {Array.from({ length: CHAPTERS_PER_HERO }, (_, j) => (
                        <b key={j} className="block size-2" style={{ background: j < done ? lit(c.color) : "var(--border)" }} />
                      ))}
                    </span>
                    <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">{done}/{CHAPTERS_PER_HERO}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{totalDone} of {totalChapters} chapters cleared.</p>
        </div>

        {stats.gamesPlayed > 0 && (
          <div>
            <h3 className={cn(display, "mb-2 text-[11px] tracking-[0.2em] text-destructive")}>Survival stats</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px]">
              <span className="text-muted-foreground">Games played</span><span className="text-right tabular-nums">{stats.gamesPlayed}</span>
              <span className="text-muted-foreground">Total K.O.s</span><span className="text-right tabular-nums">{stats.totalKos}</span>
              <span className="text-muted-foreground">Total deaths</span><span className="text-right tabular-nums">{stats.totalDeaths}</span>
            </div>
            <div className="mt-2 grid gap-1">
              {CHARS.map((c, i) => stats.highestWave[i] > 0 ? (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="inline-block size-2 rounded-full" style={{ background: lit(c.color) }} />
                  <span style={{ color: lit(c.color) }}>{c.name}</span>
                  <span className="text-muted-foreground ml-auto tabular-nums">best wave {stats.highestWave[i]} · {stats.fighterPlays[i]} plays</span>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {badges.length > 0 && (
          <div>
            <h3 className={cn(display, "mb-2 text-[11px] tracking-[0.2em] text-destructive")}>Achievements ({badges.length}/{ACHIEVEMENTS.length})</h3>
            <div className="grid gap-1">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.id} className={cn("flex items-center gap-2 text-[12px]", badges.includes(a.id) ? "text-foreground" : "text-muted-foreground/40")}>
                  <span className="text-[10px]">{badges.includes(a.id) ? "◆" : "◇"}</span>
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-auto text-[11px]">{a.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {board && board.top.length > 0 && (
          <div>
            <h3 className={cn(display, "mb-2 text-[11px] tracking-[0.2em] text-destructive")}>Survival leaderboard</h3>
            <ol className="grid gap-0.5 text-[12.5px] tabular-nums">
              {board.top.slice(0, 5).map((row, i) => (
                <li key={row.id} className="grid grid-cols-[2em_1fr_auto_auto] gap-3">
                  <span className="text-right text-muted-foreground">{i + 1}</span>
                  <b className="truncate font-medium" style={{ color: lit(CHARS[row.fighter].color) }}>{row.name}</b>
                  <span>wave {row.wave}</span>
                  <span>{row.kos} K.O.</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        </KitPanel>

        <section aria-label="The world" className="grid gap-4">
          <h3 className={cn(display, "text-[11px] tracking-[0.2em] text-destructive")}>The world</h3>
          <TheWorld saga={saga} />
        </section>

        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <KitButton onClick={handleSync} disabled={syncing} className="px-3 py-1 text-[12px] disabled:opacity-50">
              {syncing ? "Syncing…" : synced ? "Synced to cloud" : "Sync to cloud"}
            </KitButton>
            <KitButton onClick={() => void logout()} className="px-3 py-1 text-[12px] text-red-400">Sign out</KitButton>
          </div>
        )}
      </div>
    </section>
  );
}

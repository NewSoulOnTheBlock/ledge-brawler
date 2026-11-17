// The operator's dashboard at /admin (main.tsx): every player and what they have done, from server/api/admin.js,
// which answers only the operator's own sign-in. What is counted is sent by src/track.ts.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth.tsx";
import { CHARS } from "./game/data.ts";
import { authHeaders, SITE } from "./scores.ts";

type Row = Record<string, unknown>;
interface Player { player: string; user_id: string | null; first_seen: string; last_seen: string; visits: number; survival_runs: number; best_wave: number | null; kos: number; chapters_cleared: number; game_overs: number; versus: number; versus_wins: number; seconds: number; device: string | null }
interface Event { id: number; player?: string; user_id: string | null; kind: string; data: Row; created_at: string }
interface Account { id: string; email: string | null; twitter: string | null; created_at: string | null }
interface Report {
  totals: { players: number; signed_in: number; visits: number; active_day: number; active_week: number; since: string | null };
  days: { day: string; active: number; new: number; games: number }[];
  kinds: { kind: string; n: number; players: number }[];
  fighters: { fighter: number; n: number }[];
  chapters: { level: string; starts: number; clears: number; game_overs: number; avg_seconds: number | null }[];
  players: Player[]; recent: Event[]; accounts: Account[];
  saves: { user_id: string; saga: string | null; updated_at: string }[];
  scores: { id: number; name: string; wave: number; kos: number; fighter: number; user_id: string | null; created_at: string }[];
  daily: { day: string; name: string; wave: number; kos: number; fighter: number; user_id: string | null }[];
}

const GOLD = "#d4af37";
const fighterName = (i: unknown) => CHARS[Number(i)]?.name ?? "?";
const ago = (when: string) => {
  const s = Math.max(0, (Date.now() - new Date(when).getTime()) / 1000);
  return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
};
const duration = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${(s / 3600).toFixed(1)}h`);
const short = (id: string) => id.slice(0, 8);

/** One line for what a player did. */
function said(e: Event): string {
  const d = e.data;
  switch (e.kind) {
    case "visit": return `Opened the game (${String(d.device ?? "?")}${d.referrer ? `, from ${String(d.referrer)}` : ""})`;
    case "signin": return "Signed in";
    case "survival_start": return `Started ${d.daily ? "the Daily" : "Survival"}${d.pro ? " (Pro)" : ""} as ${fighterName(d.fighter)}`;
    case "survival_end": return `Fell at wave ${String(d.wave)} with ${String(d.kos)} K.O. as ${fighterName(d.fighter)} · ${duration(Number(d.seconds ?? 0))}`;
    case "versus_start": return `Entered Versus${d.pro ? " (Pro)" : ""} as ${fighterName(d.fighter)} · room ${String(d.room)}`;
    case "versus_end": return d.won ? `Won a Versus match of ${String(d.players)}` : `Lost a Versus match to ${String(d.winner ?? "nobody")}`;
    case "chapter_start": return `Set out on ${String(d.level)}`;
    case "chapter_clear": return `Cleared ${String(d.level)} · rank ${String(d.rank)} · ${duration(Number(d.seconds ?? 0))}, ${String(d.lost)} lives lost, ${String(d.found)}/${String(d.of)} found`;
    case "game_over": return `Game over in ${String(d.level ?? "a level")}`;
    case "ending": return `Chose ending ${Number(d.which) + 1} for ${String(d.hero)}`;
    default: return e.kind;
  }
}

/** The campaign progress kept in a cloud save: chapters finished per protagonist. */
function progress(saga: string | null) {
  try {
    const s = JSON.parse(saga ?? "") as Record<string, number>;
    return ["forbidden", "ember", "exile", "hollow", "architect"].map((h) => `${h[0].toUpperCase()}${s[h] ?? 0}`).join(" ");
  } catch { return "—"; }
}

function Panel({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`rounded-sm border border-[#2a2416] bg-[#0e0e0f] p-4 shadow-[inset_0_1px_0_#ffffff08] ${wide ? "lg:col-span-2" : ""}`}>
      <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.25em] uppercase" style={{ color: GOLD }}>{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-sm border border-[#2a2416] bg-[#0b0b0c] px-4 py-3">
      <div className="text-[11px] tracking-[0.2em] text-[#8b8478] uppercase">{label}</div>
      <div className="mt-1 font-sans text-3xl font-bold tabular-nums text-[#f4ead2]">{value}</div>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  const most = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="grid gap-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate text-[#c9c1b0]" title={r.note}>{r.label}</span>
          <span className="h-2.5 rounded-sm bg-[#1a1812]"><span className="block h-full rounded-sm" style={{ width: `${(r.value / most) * 100}%`, background: GOLD }} /></span>
          <span className="text-right tabular-nums text-[#f4ead2]">{r.value}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-[#8b8478]">Nothing yet.</p>}
    </div>
  );
}

const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="max-h-[28rem] overflow-auto">
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 bg-[#0e0e0f] text-[11px] tracking-[0.15em] text-[#8b8478] uppercase"><tr>{head.map((h) => <th key={h} className="px-2 py-1.5 font-normal whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="text-[#d8d0bf] tabular-nums">{children}</tbody>
    </table>
  </div>
);

export function Admin() {
  const { configured, ready, authenticated, user, login, logout } = useAuth();
  const [report, setReport] = useState<Report | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null), [trail, setTrail] = useState<Event[] | null>(null), [filter, setFilter] = useState("");

  const ask = useCallback(async (query = "") => {
    const response = await fetch(`${SITE}/api/admin${query}`, { headers: await authHeaders() });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error ?? `The dashboard could not be reached (${response.status}).`);
    return body;
  }, []);
  const load = useCallback(() => {
    setLoading(true); setError("");
    ask().then((r: Report) => setReport(r), (e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [ask]);
  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);
  useEffect(() => {
    if (!picked) return setTrail(null);
    setTrail(null);
    ask(`?player=${encodeURIComponent(picked)}`).then((r: { events: Event[] }) => setTrail(r.events), (e: Error) => setError(e.message));
  }, [picked, ask]);

  const emails = useMemo(() => new Map((report?.accounts ?? []).map((a) => [a.id, a.email ?? (a.twitter ? `@${a.twitter}` : a.id)])), [report]);
  const who = (p: { user_id: string | null; player?: string }) => (p.user_id ? emails.get(p.user_id) ?? short(p.user_id) : `guest ${short(p.player ?? "")}`);
  const players = useMemo(() => (report?.players ?? []).filter((p) => !filter || who(p).toLowerCase().includes(filter.toLowerCase()) || p.player.includes(filter)), [report, filter, emails]);
  const count = (kind: string) => report?.kinds.find((k) => k.kind === kind)?.n ?? 0;

  const shell = (inside: ReactNode) => (
    <main className="min-h-dvh bg-[#070708] px-4 py-6 font-mono text-[#e8e0cc] sm:px-8">
      <header className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-[#2a2416] pb-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: GOLD }}>Five Blades · Operator</h1>
          <p className="text-xs text-[#8b8478]">{report?.totals.since ? `Tracking since ${new Date(report.totals.since).toLocaleString()}` : "Players and everything they have done"}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {authenticated && <span className="text-[#8b8478]">{user?.email}</span>}
          {authenticated && <button type="button" onClick={load} disabled={loading} className="rounded-sm border border-[#4a3d1c] px-3 py-1.5 active:translate-y-px disabled:opacity-50" style={{ color: GOLD }}>{loading ? "Loading…" : "Refresh"}</button>}
          {authenticated && <button type="button" onClick={() => void logout()} className="rounded-sm border border-[#2a2416] px-3 py-1.5 text-[#8b8478] active:translate-y-px">Sign out</button>}
          <a href="/" className="px-2 text-[#8b8478] underline-offset-4 hover:underline">Game</a>
        </div>
      </header>
      <div className="mx-auto max-w-7xl">{inside}</div>
    </main>
  );

  if (!configured) return shell(<p>Sign-in is not set up in this build (VITE_PRIVY_APP_ID).</p>);
  if (!ready) return shell(<p className="text-[#8b8478]">Loading sign-in…</p>);
  if (!authenticated) return shell(
    <div className="grid justify-items-center gap-4 py-24 text-center">
      <p className="text-[#c9c1b0]">Sign in with the operator account to see the dashboard.</p>
      <button type="button" onClick={login} className="rounded-sm px-6 py-2.5 font-sans font-bold tracking-[0.2em] text-black uppercase shadow-[0_3px_0_#7a5f12] active:translate-y-[3px] active:shadow-none" style={{ background: GOLD }}>Sign in</button>
    </div>,
  );
  if (error && !report) return shell(<p className="text-[#e06c5a]">{error}</p>);
  if (!report) return shell(<p className="text-[#8b8478]">Loading…</p>);

  const t = report.totals, mostDay = Math.max(1, ...report.days.map((d) => d.active));
  return shell(
    <div className="grid gap-4">
      {error && <p className="text-sm text-[#e06c5a]">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Players" value={t.players} />
        <Stat label="Accounts" value={report.accounts.length} />
        <Stat label="Active 24h" value={t.active_day} />
        <Stat label="Active 7d" value={t.active_week} />
        <Stat label="Visits" value={t.visits} />
        <Stat label="Games played" value={count("survival_start") + count("versus_start") + count("chapter_start")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Last 14 days" wide>
          <div className="flex h-36 items-end gap-1.5">
            {report.days.map((d) => (
              <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.active} active, ${d.new} new, ${d.games} games`}>
                <span className="text-[10px] tabular-nums text-[#8b8478]">{d.active || ""}</span>
                <span className="w-full rounded-t-sm" style={{ height: `${(d.active / mostDay) * 100}%`, minHeight: d.active ? 3 : 1, background: d.active ? GOLD : "#1a1812" }} />
                <span className="text-[10px] text-[#5d574c]">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#8b8478]">Active players per day. New this fortnight: {report.days.reduce((n, d) => n + d.new, 0)} · games: {report.days.reduce((n, d) => n + d.games, 0)}</p>
        </Panel>

        <Panel title="What gets played">
          <Bars rows={[
            { label: "Survival runs", value: count("survival_start") },
            { label: "Versus entries", value: count("versus_start") },
            { label: "Chapters begun", value: count("chapter_start") },
            { label: "Chapters cleared", value: count("chapter_clear") },
            { label: "Game overs", value: count("game_over") },
            { label: "Endings chosen", value: count("ending") },
            { label: "Sign-ins", value: count("signin") },
          ]} />
        </Panel>
        <Panel title="Fighters picked">
          <Bars rows={CHARS.map((c, i) => ({ label: c.name, value: report.fighters.find((f) => f.fighter === i)?.n ?? 0 }))} />
        </Panel>

        <Panel title={`Players (${report.players.length})`} wide>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by email or id" className="mb-3 w-full rounded-sm border border-[#2a2416] bg-[#0b0b0c] px-3 py-2 text-sm outline-none focus:border-[#4a3d1c]" />
          <Table head={["Who", "Device", "First seen", "Last seen", "Visits", "Survival", "Best wave", "K.O.", "Chapters", "Game overs", "Versus", "Wins", "Played"]}>
            {players.map((p) => (
              <tr key={p.player} onClick={() => setPicked(picked === p.player ? null : p.player)} className={`cursor-pointer border-t border-[#1a1812] hover:bg-[#15140f] ${picked === p.player ? "bg-[#1a170d]" : ""}`}>
                <td className="px-2 py-1.5 whitespace-nowrap" style={p.user_id ? { color: GOLD } : undefined}>{who(p)}</td>
                <td className="px-2">{p.device ?? "—"}</td>
                <td className="px-2 whitespace-nowrap">{ago(p.first_seen)}</td>
                <td className="px-2 whitespace-nowrap">{ago(p.last_seen)}</td>
                <td className="px-2">{p.visits}</td><td className="px-2">{p.survival_runs}</td><td className="px-2">{p.best_wave ?? "—"}</td><td className="px-2">{p.kos}</td>
                <td className="px-2">{p.chapters_cleared}</td><td className="px-2">{p.game_overs}</td><td className="px-2">{p.versus}</td><td className="px-2">{p.versus_wins}</td>
                <td className="px-2">{duration(p.seconds)}</td>
              </tr>
            ))}
          </Table>
          {players.length === 0 && <p className="mt-2 text-sm text-[#8b8478]">No one yet. Players appear here from their first visit after this was deployed.</p>}
        </Panel>

        {picked && (
          <Panel title={`Everything ${who(report.players.find((p) => p.player === picked) ?? { user_id: null, player: picked })} has done`} wide>
            {!trail ? <p className="text-sm text-[#8b8478]">Loading…</p> : (
              <ol className="max-h-96 overflow-auto text-sm">
                {trail.map((e) => <li key={e.id} className="grid grid-cols-[10rem_1fr] gap-3 border-t border-[#1a1812] py-1.5"><span className="text-[#8b8478]">{new Date(e.created_at).toLocaleString()}</span><span>{said(e)}</span></li>)}
              </ol>
            )}
          </Panel>
        )}

        <Panel title={`Sign-in accounts (${report.accounts.length})`}>
          <Table head={["Account", "Joined", "Campaign", "Saved"]}>
            {report.accounts.map((a) => { const save = report.saves.find((s) => s.user_id === a.id); return (
              <tr key={a.id} className="border-t border-[#1a1812]">
                <td className="px-2 py-1.5">{a.email ?? (a.twitter ? `@${a.twitter}` : short(a.id))}</td>
                <td className="px-2 whitespace-nowrap">{a.created_at ? ago(a.created_at) : "—"}</td>
                <td className="px-2 whitespace-nowrap" title="Chapters done: Forbidden, Ember, Exile, Hollow, Architect">{save ? progress(save.saga) : "—"}</td>
                <td className="px-2 whitespace-nowrap">{save ? ago(save.updated_at) : "—"}</td>
              </tr>); })}
          </Table>
        </Panel>

        <Panel title="Chapters">
          <Table head={["Level", "Begun", "Cleared", "Game overs", "Avg clear"]}>
            {report.chapters.map((c) => (
              <tr key={c.level} className="border-t border-[#1a1812]"><td className="px-2 py-1.5">{c.level}</td><td className="px-2">{c.starts}</td><td className="px-2">{c.clears}</td><td className="px-2">{c.game_overs}</td><td className="px-2">{c.avg_seconds ? duration(c.avg_seconds) : "—"}</td></tr>
            ))}
          </Table>
          {report.chapters.length === 0 && <p className="text-sm text-[#8b8478]">No chapters played yet.</p>}
        </Panel>

        <Panel title="Survival leaderboard">
          <Table head={["Name", "Wave", "K.O.", "Fighter", "Account", "When"]}>
            {report.scores.map((s) => (
              <tr key={s.id} className="border-t border-[#1a1812]"><td className="px-2 py-1.5">{s.name}</td><td className="px-2">{s.wave}</td><td className="px-2">{s.kos}</td><td className="px-2">{fighterName(s.fighter)}</td><td className="px-2">{s.user_id ? emails.get(s.user_id) ?? short(s.user_id) : "guest"}</td><td className="px-2 whitespace-nowrap">{ago(s.created_at)}</td></tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Daily challenge">
          <Table head={["Day", "Name", "Wave", "K.O.", "Fighter"]}>
            {report.daily.map((s, i) => (
              <tr key={i} className="border-t border-[#1a1812]"><td className="px-2 py-1.5 whitespace-nowrap">{String(s.day).slice(0, 10)}</td><td className="px-2">{s.name}</td><td className="px-2">{s.wave}</td><td className="px-2">{s.kos}</td><td className="px-2">{fighterName(s.fighter)}</td></tr>
            ))}
          </Table>
          {report.daily.length === 0 && <p className="text-sm text-[#8b8478]">No daily runs yet.</p>}
        </Panel>

        <Panel title="Live activity" wide>
          <ol className="max-h-96 overflow-auto text-sm">
            {report.recent.map((e) => (
              <li key={e.id} className="grid grid-cols-[6rem_12rem_1fr] gap-3 border-t border-[#1a1812] py-1.5">
                <span className="text-[#8b8478]">{ago(e.created_at)}</span>
                <button type="button" onClick={() => setPicked(e.player ?? null)} className="truncate text-left hover:underline" style={e.user_id ? { color: GOLD } : undefined}>{who(e)}</button>
                <span>{said(e)}</span>
              </li>
            ))}
          </ol>
          {report.recent.length === 0 && <p className="text-sm text-[#8b8478]">Nothing has happened since tracking began.</p>}
        </Panel>
      </div>
    </div>,
  );
}

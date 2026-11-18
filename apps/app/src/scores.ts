// spec/app/index.md, "A fighter knocked out against the waves starts over from the first"
// The Survival leaderboard, kept for everyone in one database behind the site's /api/scores (server/api/scores.js).
// A standing is the wave reached, then knockouts. Played from a development server, the live site's board is used.
const API = /^(localhost|127\.|192\.168\.)/.test(location.hostname) ? "https://ledge-brawler.vercel.app/api/scores" : "/api/scores";
const SAVE_API = /^(localhost|127\.|192\.168\.)/.test(location.hostname) ? "https://ledge-brawler.vercel.app/api/save" : "/api/save";

export interface Standing { id: number; name: string; wave: number; kos: number; fighter: number }
/** The best standings, how many there are in all, and, when asked about one, its place among them. */
export interface Board { top: Standing[]; total: number; rank: number | null; id: number | null }

let _getToken: (() => Promise<string | null>) | null = null;
/** Called once from the app root to wire auth token retrieval into scores/saves. */
export const setTokenProvider = (fn: () => Promise<string | null>) => { _getToken = fn; };

export async function authHeaders(): Promise<Record<string, string>> {
  if (!_getToken) return {};
  const token = await _getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The site's other endpoints (server/api), the live site's when played from a development server. */
export const SITE = /^(localhost|127.|192.168.)/.test(location.hostname) ? "https://ledge-brawler.vercel.app" : "";

/** Reports a name on a board as offensive (server/api/report.js): enough reports take it off until it is looked at. */
export async function reportStanding(board: "survival" | "daily", id: number): Promise<void> {
  const response = await fetch(`${SITE}/api/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ board, id }) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "The report could not be sent.");
}

/** Deletes the signed-in player's cloud save, standings and sign-in account (server/api/account.js). */
export async function deleteAccount(): Promise<{ saves: number; standings: number; signIn: boolean }> {
  const response = await fetch(`${SITE}/api/account`, { method: "DELETE", headers: await authHeaders() });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "The account could not be deleted.");
  return body.deleted;
}

async function ask(url: string, init?: RequestInit): Promise<Board> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "The leaderboard could not be reached.");
  return response.json() as Promise<Board>;
}

/** The board, and where a fight that ended at `wave` with `kos` knockouts would stand on it. Optionally filtered to one fighter. */
export const standingOf = (wave?: number, kos?: number, fighter?: number) => {
  const params: string[] = [];
  if (wave !== undefined) params.push(`wave=${wave}`, `kos=${kos ?? 0}`);
  if (fighter !== undefined) params.push(`fighter=${fighter}`);
  return ask(params.length ? `${API}?${params.join("&")}` : API);
};
/** Keeps a standing under `name`, and answers with the board and its place. */
export const keep = async (name: string, wave: number, kos: number, fighter: number) => {
  const auth = await authHeaders();
  return ask(API, { method: "POST", headers: { "Content-Type": "application/json", ...auth }, body: JSON.stringify({ name, wave, kos, fighter }) });
};

/** The name last used, for the next time. */
export const lastName = () => { try { return localStorage.getItem("name") ?? ""; } catch { return ""; } };
export const rememberName = (name: string) => { try { localStorage.setItem("name", name); } catch { /* Private browsing may refuse. */ } };

// --- Cloud saves (campaign progress) ---
export interface SaveData { [key: string]: unknown }

/** Load the signed-in user's cloud save. Returns null if not signed in or no save exists. */
export async function loadCloudSave(): Promise<SaveData | null> {
  const auth = await authHeaders();
  if (!auth.Authorization) return null;
  try {
    const res = await fetch(SAVE_API, { headers: auth });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch { return null; }
}

/** Save campaign progress to the cloud. No-op if not signed in. */
export async function saveToCloud(data: SaveData): Promise<boolean> {
  const auth = await authHeaders();
  if (!auth.Authorization) return false;
  try {
    const res = await fetch(SAVE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch { return false; }
}

/** Push the current localStorage saga to the cloud. Fire-and-forget. */
export function syncSagaToCloud(): void {
  try {
    const raw = localStorage.getItem("saga");
    if (!raw) return;
    void saveToCloud({ saga: raw, at: Date.now() });
  } catch { /* Private browsing may refuse localStorage reads. */ }
}

export interface ConflictInfo { cloudSaga: string; localSaga: string }

/** Pull a cloud saga into localStorage when no local save exists. Returns true if cloud was loaded, ConflictInfo if both exist and differ. */
export async function pullCloudSaga(): Promise<boolean | ConflictInfo> {
  try {
    const local = localStorage.getItem("saga");
    const cloud = await loadCloudSave();
    const cloudSaga = typeof cloud?.saga === "string" ? cloud.saga : null;
    if (!local && cloudSaga) { localStorage.setItem("saga", cloudSaga); return true; }
    if (local && !cloudSaga) { syncSagaToCloud(); return false; }
    if (local && cloudSaga && local !== cloudSaga) return { cloudSaga, localSaga: local };
    if (local) syncSagaToCloud();
    return false;
  } catch { return false; }
}

export function resolveConflict(keep: "local" | "cloud", conflict: ConflictInfo) {
  if (keep === "cloud") try { localStorage.setItem("saga", conflict.cloudSaga); } catch {}
  syncSagaToCloud();
}

// --- Stats ---
export interface GameStats { totalKos: number; totalDeaths: number; fighterPlays: number[]; highestWave: number[]; gamesPlayed: number }
const STATS_KEY = "gameStats";
const defaultStats = (): GameStats => ({ totalKos: 0, totalDeaths: 0, fighterPlays: [0, 0, 0, 0, 0], highestWave: [0, 0, 0, 0, 0], gamesPlayed: 0 });

export function loadStats(): GameStats {
  try { const raw = localStorage.getItem(STATS_KEY); return raw ? JSON.parse(raw) : defaultStats(); } catch { return defaultStats(); }
}

export function recordSurvival(fighter: number, wave: number, kos: number): GameStats {
  const s = loadStats();
  s.totalKos += kos;
  s.totalDeaths++;
  s.gamesPlayed++;
  s.fighterPlays[fighter] = (s.fighterPlays[fighter] ?? 0) + 1;
  s.highestWave[fighter] = Math.max(s.highestWave[fighter] ?? 0, wave);
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {}
  return s;
}

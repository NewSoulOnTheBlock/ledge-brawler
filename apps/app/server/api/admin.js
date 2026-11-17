// The operator's dashboard (src/Admin.tsx): every player and what they have done. Only the operator's own sign-in
// gets an answer: the Privy token is checked, the account's address is looked up at Privy (never taken from the
// browser) and its SHA-256 compared with the one below, so that no address is written here (as in src/granted.ts).
//   GET /api/admin                 the whole picture: totals, days, modes, players, accounts, boards, recent events
//   GET /api/admin?player=<id>     every event of one player
const { neon } = require("@neondatabase/serverless");
const { createHash } = require("node:crypto");
const { getPrivy, userIdOf, emailOf } = require("./_privy.js");

const OPERATORS = new Set(["2582f9f6b2391bdf67c1b98e0c4ce52d89c54233e639072d6bbff22152ceeb90"]);
const hashed = (email) => createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Only GET." });
  const userId = await userIdOf(req), client = await getPrivy();
  if (!userId || !client) return res.status(401).json({ error: "Sign in first." });
  let me;
  try { me = await client.users()._get(userId); } catch { return res.status(401).json({ error: "Sign in again." }); }
  const email = emailOf(me);
  if (!email || !OPERATORS.has(hashed(email))) return res.status(403).json({ error: "This account is not the operator's." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "The database is not set up." });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.query?.player) {
      const events = await sql`SELECT id, kind, data, user_id, created_at FROM events WHERE player = ${String(req.query.player)} ORDER BY created_at DESC LIMIT 1000`;
      return res.status(200).json({ events });
    }
    const [totals] = await sql`SELECT
        count(DISTINCT player)::int AS players,
        count(DISTINCT user_id)::int AS signed_in,
        count(*) FILTER (WHERE kind = 'visit')::int AS visits,
        count(DISTINCT player) FILTER (WHERE created_at > now() - interval '1 day')::int AS active_day,
        count(DISTINCT player) FILTER (WHERE created_at > now() - interval '7 days')::int AS active_week,
        min(created_at) AS since
      FROM events`;
    const days = await sql`SELECT to_char(d, 'YYYY-MM-DD') AS day,
        (SELECT count(DISTINCT player)::int FROM events WHERE created_at >= d AND created_at < d + interval '1 day') AS active,
        (SELECT count(*)::int FROM (SELECT player FROM events GROUP BY player HAVING min(created_at) >= d AND min(created_at) < d + interval '1 day') n) AS new,
        (SELECT count(*)::int FROM events WHERE kind IN ('survival_start', 'versus_start', 'chapter_start') AND created_at >= d AND created_at < d + interval '1 day') AS games
      FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') AS d ORDER BY d`;
    const kinds = await sql`SELECT kind, count(*)::int AS n, count(DISTINCT player)::int AS players FROM events GROUP BY kind ORDER BY n DESC`;
    const fighters = await sql`SELECT (data->>'fighter')::int AS fighter, count(*)::int AS n FROM events WHERE kind IN ('survival_start', 'versus_start') AND data ? 'fighter' GROUP BY 1 ORDER BY 1`;
    const chapters = await sql`SELECT data->>'level' AS level,
        count(*) FILTER (WHERE kind = 'chapter_start')::int AS starts,
        count(*) FILTER (WHERE kind = 'chapter_clear')::int AS clears,
        count(*) FILTER (WHERE kind = 'game_over')::int AS game_overs,
        round(avg((data->>'seconds')::numeric) FILTER (WHERE kind = 'chapter_clear'))::int AS avg_seconds
      FROM events WHERE kind IN ('chapter_start', 'chapter_clear', 'game_over') GROUP BY 1 ORDER BY 1`;
    const players = await sql`SELECT player, max(user_id) AS user_id, min(created_at) AS first_seen, max(created_at) AS last_seen,
        count(*) FILTER (WHERE kind = 'visit')::int AS visits,
        count(*) FILTER (WHERE kind = 'survival_end')::int AS survival_runs,
        max((data->>'wave')::int) FILTER (WHERE kind = 'survival_end') AS best_wave,
        coalesce(sum((data->>'kos')::int) FILTER (WHERE kind = 'survival_end'), 0)::int AS kos,
        count(*) FILTER (WHERE kind = 'chapter_clear')::int AS chapters_cleared,
        count(*) FILTER (WHERE kind = 'game_over')::int AS game_overs,
        count(*) FILTER (WHERE kind = 'versus_start')::int AS versus,
        count(*) FILTER (WHERE kind = 'versus_end' AND (data->>'won')::boolean)::int AS versus_wins,
        coalesce(sum((data->>'seconds')::int) FILTER (WHERE kind IN ('survival_end', 'chapter_clear', 'versus_end')), 0)::int AS seconds,
        max(data->>'device') FILTER (WHERE kind = 'visit') AS device
      FROM events GROUP BY player ORDER BY last_seen DESC LIMIT 500`;
    const recent = await sql`SELECT id, player, user_id, kind, data, created_at FROM events ORDER BY created_at DESC LIMIT 150`;
    const saves = await sql`SELECT user_id, data->>'saga' AS saga, updated_at FROM game_saves`;
    const scores = await sql`SELECT id, name, wave, kos, fighter, user_id, created_at FROM scores ORDER BY wave DESC, kos DESC LIMIT 50`;
    const daily = await sql`SELECT day, name, wave, kos, fighter, user_id, created_at FROM daily_scores ORDER BY day DESC, wave DESC, kos DESC LIMIT 50`;
    // Every sign-in account Privy holds, with its address: including those who signed in before anything was tracked.
    const accounts = [];
    for await (const user of client.users().list()) {
      accounts.push({ id: user.id, email: emailOf(user), twitter: user.linked_accounts?.find((a) => a.type === "twitter_oauth")?.username ?? null, created_at: user.created_at ? new Date(user.created_at * 1000).toISOString() : null });
      if (accounts.length >= 1000) break;
    }
    return res.status(200).json({ totals, days, kinds, fighters, chapters, players, recent, saves, scores, daily, accounts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: String(error?.message ?? error) });
  }
};

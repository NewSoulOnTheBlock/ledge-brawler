// What players do, for the operator's dashboard (admin.js). Every visitor has an anonymous id kept in their browser
// (src/track.ts); a signed-in one's Privy user id is stored beside it.
//   POST /api/track  {player, events: [{kind, data}]}   at most 40 events, of the kinds below
// Table events (player, user_id, kind, data jsonb, created_at). DATABASE_URL is set on the Vercel project.
const { neon } = require("@neondatabase/serverless");
const { userIdOf } = require("./_privy.js");

const KINDS = new Set(["visit", "signin", "survival_start", "survival_end", "versus_start", "versus_end", "chapter_start", "chapter_clear", "game_over", "ending"]);
const PLAYER = /^[a-z0-9-]{8,40}$/;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Not set up." });
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}; } catch { return res.status(400).json({ error: "Bad body." }); }
  const player = String(body.player ?? "");
  const events = Array.isArray(body.events) ? body.events.slice(0, 40).filter((e) => KINDS.has(e?.kind)) : [];
  if (!PLAYER.test(player) || events.length === 0) return res.status(400).json({ error: "Nothing to keep." });
  const rows = events.map((e) => { const data = JSON.stringify(e.data && typeof e.data === "object" ? e.data : {}); return { kind: e.kind, data: data.length > 2000 ? "{}" : data }; });
  const userId = await userIdOf(req);
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`INSERT INTO events (player, user_id, kind, data)
      SELECT ${player}, ${userId}, r.kind, r.data::jsonb FROM json_to_recordset(${JSON.stringify(rows)}::json) AS r(kind text, data text)`;
    return res.status(204).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Not kept." });
  }
};

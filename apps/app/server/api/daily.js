// The daily challenge: one seed per UTC day (YYYYMMDD), which names the required fighter (seed % 5).
//   GET  /api/daily                  today's seed, fighter and best
//   GET  /api/daily?wave=4&kos=17    the same, and where a fight that ended so would stand today
//   POST /api/daily  {name, wave, kos}   keeps a standing for today, with the daily fighter
// Table daily_scores (day DATE, name, wave, kos, fighter, user_id, created_at). The database is the site's own (api/_db.js).
const { db } = require("./_db.js");

let privy = null;
const getPrivy = async () => {
  if (!privy && process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
    try { const { PrivyClient } = await import("@privy-io/node"); privy = new PrivyClient({ appId: process.env.PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET }); }
    catch (error) { console.error(error); }
  }
  return privy;
};

async function optionalUserId(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const client = await getPrivy();
  if (!client) return null;
  try {
    const { user_id } = await client.utils().auth().verifyAccessToken(header.slice(7));
    return user_id;
  } catch {
    return null;
  }
}

const TOP = 20;
const most = (wave) => { let n = 0; for (let w = 1; w <= wave + 1; w++) n += Math.min(w + 1, 8); return n; };
const whole = (value, max) => { const n = Number(value); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; };
// Names are cleaned, and standings reported by enough people hidden, by the rules in _names.js.
const { named, HIDDEN_AFTER } = require("./_names.js");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "The leaderboard is not set up." });
  const sql = db();
  const today = new Date().toISOString().slice(0, 10);
  const seed = parseInt(today.replace(/-/g, ""), 10);
  const fighter = seed % 5;
  try {
    let wave = null, kos = null, kept = null;
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
      const name = named(body.name);
      wave = whole(body.wave, 999); kos = whole(body.kos, 99999);
      if (body.fighter !== undefined && whole(body.fighter, 4) !== fighter) return res.status(400).json({ error: "That is not today's fighter." });
      if (!name || wave === null || kos === null || kos > most(wave)) return res.status(400).json({ error: "That standing cannot be kept." });
      const userId = await optionalUserId(req);
      if (userId) {
        [kept] = await sql`INSERT INTO daily_scores (day, name, wave, kos, fighter, user_id) VALUES (${today}, ${name}, ${wave}, ${kos}, ${fighter}, ${userId}) RETURNING id, created_at`;
      } else {
        [kept] = await sql`INSERT INTO daily_scores (day, name, wave, kos, fighter) VALUES (${today}, ${name}, ${wave}, ${kos}, ${fighter}) RETURNING id, created_at`;
      }
    } else if (req.method === "GET") {
      if (req.query.wave !== undefined) { wave = whole(req.query.wave, 999); kos = whole(req.query.kos ?? 0, 99999); }
    } else return res.status(405).json({ error: "Only GET and POST." });

    const top = await sql`SELECT id, name, wave, kos, fighter FROM daily_scores WHERE day = ${today} AND id NOT IN (SELECT ref FROM reports WHERE board = 'daily' GROUP BY ref HAVING count(*) >= ${HIDDEN_AFTER}) ORDER BY wave DESC, kos DESC, created_at ASC LIMIT ${TOP}`;
    const [{ total }] = await sql`SELECT count(*)::int AS total FROM daily_scores WHERE day = ${today}`;
    let rank = null;
    if (wave !== null && kos !== null) {
      const [{ ahead }] = kept
        ? await sql`SELECT count(*)::int AS ahead FROM daily_scores WHERE day = ${today} AND (wave > ${wave} OR (wave = ${wave} AND kos > ${kos}) OR (wave = ${wave} AND kos = ${kos} AND created_at < ${kept.created_at}))`
        : await sql`SELECT count(*)::int AS ahead FROM daily_scores WHERE day = ${today} AND (wave > ${wave} OR (wave = ${wave} AND kos >= ${kos}))`;
      rank = ahead + 1;
    }
    return res.status(200).json({ seed, fighter, top: top.map((row) => ({ ...row, id: Number(row.id) })), total, rank, id: kept ? Number(kept.id) : null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The leaderboard could not be reached." });
  }
};

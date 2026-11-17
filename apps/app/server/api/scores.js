// The Survival leaderboard: one table in Neon (project "five-blades"), read and written here and nowhere else.
//   GET  /api/scores                 the best, and how many there are
//   GET  /api/scores?wave=4&kos=17   the same, and where a fight that ended so would stand
//   POST /api/scores  {name, wave, kos, fighter}   keeps a standing under a name; answers as GET does, with its place
// A standing is the wave reached, then knockouts, then who was there first. The numbers come from the player's own
// browser and are only checked for being possible, so this is a board for fun, not for prizes.
// When the player is signed in (Authorization: Bearer <privy-token>), their user_id is stored with the score.
// DATABASE_URL is set on the Vercel project (never in the code).
const { neon } = require("@neondatabase/serverless");

let privy = null;
// Loaded only when sign-in is set up, and as an ES module: on Vercel the library's CommonJS build cannot load its own
// dependency. A failure here never takes the function down: the request is simply not signed in.
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
  const sql = neon(process.env.DATABASE_URL);
  try {
    let wave = null, kos = null, kept = null;
    const filterFighter = req.query?.fighter !== undefined ? whole(req.query.fighter, 4) : null;
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
      const name = named(body.name), fighter = whole(body.fighter, 4);
      wave = whole(body.wave, 999); kos = whole(body.kos, 99999);
      if (!name || wave === null || kos === null || fighter === null || kos > most(wave)) return res.status(400).json({ error: "That standing cannot be kept." });
      const userId = await optionalUserId(req);
      if (userId) {
        [kept] = await sql`INSERT INTO scores (name, wave, kos, fighter, user_id) VALUES (${name}, ${wave}, ${kos}, ${fighter}, ${userId}) RETURNING id, created_at`;
      } else {
        [kept] = await sql`INSERT INTO scores (name, wave, kos, fighter) VALUES (${name}, ${wave}, ${kos}, ${fighter}) RETURNING id, created_at`;
      }
    } else if (req.method === "GET") {
      if (req.query.wave !== undefined) { wave = whole(req.query.wave, 999); kos = whole(req.query.kos ?? 0, 99999); }
    } else return res.status(405).json({ error: "Only GET and POST." });

    const top = filterFighter === null
      ? await sql`SELECT id, name, wave, kos, fighter FROM scores WHERE id NOT IN (SELECT ref FROM reports WHERE board = 'survival' GROUP BY ref HAVING count(*) >= ${HIDDEN_AFTER}) ORDER BY wave DESC, kos DESC, created_at ASC LIMIT ${TOP}`
      : await sql`SELECT id, name, wave, kos, fighter FROM scores WHERE fighter = ${filterFighter} AND id NOT IN (SELECT ref FROM reports WHERE board = 'survival' GROUP BY ref HAVING count(*) >= ${HIDDEN_AFTER}) ORDER BY wave DESC, kos DESC, created_at ASC LIMIT ${TOP}`;
    const [{ total }] = filterFighter === null
      ? await sql`SELECT count(*)::int AS total FROM scores`
      : await sql`SELECT count(*)::int AS total FROM scores WHERE fighter = ${filterFighter}`;
    let rank = null;
    if (wave !== null && kos !== null) {
      const f = filterFighter;
      const [{ ahead }] = kept
        ? (f === null
          ? await sql`SELECT count(*)::int AS ahead FROM scores WHERE wave > ${wave} OR (wave = ${wave} AND kos > ${kos}) OR (wave = ${wave} AND kos = ${kos} AND created_at < ${kept.created_at})`
          : await sql`SELECT count(*)::int AS ahead FROM scores WHERE fighter = ${f} AND (wave > ${wave} OR (wave = ${wave} AND kos > ${kos}) OR (wave = ${wave} AND kos = ${kos} AND created_at < ${kept.created_at}))`)
        : (f === null
          ? await sql`SELECT count(*)::int AS ahead FROM scores WHERE wave > ${wave} OR (wave = ${wave} AND kos >= ${kos})`
          : await sql`SELECT count(*)::int AS ahead FROM scores WHERE fighter = ${f} AND (wave > ${wave} OR (wave = ${wave} AND kos >= ${kos}))`);
      rank = ahead + 1;
    }
    return res.status(200).json({ top: top.map((row) => ({ ...row, id: Number(row.id) })), total, rank, id: kept ? Number(kept.id) : null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The leaderboard could not be reached." });
  }
};

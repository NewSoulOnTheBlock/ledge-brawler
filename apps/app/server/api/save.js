// Cloud saves: campaign progress tied to a Privy-authenticated user.
//   GET  /api/save              load the user's saved game state
//   POST /api/save  {data}      save game state (replaces previous)
// Requires PRIVY_APP_ID, PRIVY_APP_SECRET and DATABASE_URL env vars.
// The user sends their Privy access token in the Authorization header.
const { db } = require("./_db.js");

let privy = null;
// Loaded only when sign-in is set up, and as an ES module: the library's CommonJS build cannot load its own
// dependency. A failure here never takes the function down: the request is simply not signed in.
const getPrivy = async () => {
  if (!privy && process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
    try { const { PrivyClient } = await import("@privy-io/node"); privy = new PrivyClient({ appId: process.env.PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET }); }
    catch (error) { console.error(error); }
  }
  return privy;
};

async function verifyUser(req) {
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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database not configured." });

  const userId = await verifyUser(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const sql = db();

  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT data, updated_at FROM game_saves WHERE user_id = ${userId}`;
      if (rows.length === 0) return res.status(200).json({ data: null });
      return res.status(200).json({ data: rows[0].data, updatedAt: rows[0].updated_at });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
      if (!body.data || typeof body.data !== "object") return res.status(400).json({ error: "Missing save data." });
      const json = JSON.stringify(body.data);
      if (json.length > 65536) return res.status(400).json({ error: "Save data too large." });
      await sql`
        INSERT INTO game_saves (user_id, data, updated_at) VALUES (${userId}, ${json}::jsonb, now())
        ON CONFLICT (user_id) DO UPDATE SET data = ${json}::jsonb, updated_at = now()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Only GET and POST." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Save failed." });
  }
};

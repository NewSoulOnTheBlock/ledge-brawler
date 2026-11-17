// A signed-in player's own account (the store asks that a player can delete their account and what is kept of it).
//   GET    /api/account   what is kept under this account: how many saves and standings
//   DELETE /api/account   deletes the cloud save, every standing kept under the account on both boards, and the
//                         sign-in account itself at Privy
// Authorization: Bearer <privy-token> is required for both. DATABASE_URL and the Privy keys are set on the Vercel project.
const { neon } = require("@neondatabase/serverless");

let privy = null;
const getPrivy = async () => {
  if (!privy && process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
    try { const { PrivyClient } = await import("@privy-io/node"); privy = new PrivyClient({ appId: process.env.PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET }); }
    catch (error) { console.error(error); }
  }
  return privy;
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "DELETE") return res.status(405).json({ error: "Only GET and DELETE." });
  const header = req.headers.authorization, client = await getPrivy();
  if (!header?.startsWith("Bearer ") || !client) return res.status(401).json({ error: "Sign in first." });
  let userId;
  try { ({ user_id: userId } = await client.utils().auth().verifyAccessToken(header.slice(7))); }
  catch { return res.status(401).json({ error: "Sign in again." }); }
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Accounts are not set up." });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === "GET") {
      const [{ saves }] = await sql`SELECT count(*)::int AS saves FROM game_saves WHERE user_id = ${userId}`;
      const [{ standings }] = await sql`SELECT count(*)::int AS standings FROM scores WHERE user_id = ${userId}`;
      const [{ daily }] = await sql`SELECT count(*)::int AS daily FROM daily_scores WHERE user_id = ${userId}`;
      return res.status(200).json({ saves, standings, daily });
    }
    const saves = await sql`DELETE FROM game_saves WHERE user_id = ${userId} RETURNING 1`;
    const standings = await sql`DELETE FROM scores WHERE user_id = ${userId} RETURNING 1`;
    const daily = await sql`DELETE FROM daily_scores WHERE user_id = ${userId} RETURNING 1`;
    // Last, the sign-in itself: if Privy cannot be reached, the game's data is already gone, and the answer says so.
    let signIn = true;
    try { await client.users().delete(userId); } catch (error) { console.error(error); signIn = false; }
    return res.status(200).json({ deleted: { saves: saves.length, standings: standings.length + daily.length, signIn } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The account could not be deleted. Try again, or write to the address in the privacy policy." });
  }
};

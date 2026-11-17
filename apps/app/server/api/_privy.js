// Privy for the functions that need to know who is signed in (track.js, admin.js, pro.js, pro-arena.js). Loaded only when sign-in is set
// up, and as an ES module: on Vercel the library's CommonJS build cannot load its own dependency.
let privy = null;
const getPrivy = async () => {
  if (!privy && process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
    try { const { PrivyClient } = await import("@privy-io/node"); privy = new PrivyClient({ appId: process.env.PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET }); }
    catch (error) { console.error(error); }
  }
  return privy;
};

/** The Privy user id a sign-in token belongs to, or null when it does not check out. */
async function userIdOfToken(token) {
  const client = await getPrivy();
  if (!token || !client) return null;
  try { return (await client.utils().auth().verifyAccessToken(token)).user_id; } catch { return null; }
}

/** The Privy user id of the request's bearer token, or null when it has none or it does not check out. */
const userIdOf = (req) => (req.headers.authorization?.startsWith("Bearer ") ? userIdOfToken(req.headers.authorization.slice(7)) : Promise.resolve(null));

/** The address a Privy user signs in with: by email, or the one a Google account brings. */
const emailOf = (user) => {
  const accounts = user?.linked_accounts ?? [];
  return accounts.find((a) => a.type === "email")?.address ?? accounts.find((a) => a.type === "google_oauth")?.email ?? null;
};

module.exports = { getPrivy, userIdOf, userIdOfToken, emailOf };

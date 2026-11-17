// spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"
// Accounts that have every ability of every fighter (its three specials, Overdrive and flight) whatever their
// campaigns have taught them, in every kind of fight. Each is kept as the SHA-256 of the address it signs in with,
// trimmed and in lower case, so that no address is written in the game.
const GRANTED = new Set(["2582f9f6b2391bdf67c1b98e0c4ce52d89c54233e639072d6bbff22152ceeb90"]);

/** Whether the account that signs in with `email` has been given everything. */
export async function grantedAll(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return GRANTED.has([...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
}

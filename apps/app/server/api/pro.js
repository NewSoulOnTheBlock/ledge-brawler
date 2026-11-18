// Pro mode for players (the money itself is in _pro.js; schema in server/pro.sql).
//   GET  /api/pro[?wallet=0x…]                           open or not; the fee, the token and the pot on Robinhood Chain;
//                                                        today's Survival pot and best runs; what `wallet` holds
//   POST /api/pro {action: "quote",  mode, wallet}       the permit paying the fee, for the wallet to sign (or, for a
//                                                        token without permits, the approval to send first)
//   POST /api/pro {action: "enter",  mode, wallet, signature, token, deadline, nonce}   the signed permit: the pot takes
//                                                        the fee, the site paying the gas, and the entry is kept
//   POST /api/pro {action: "check",  entry}              an entry left pending, looked at again
//   POST /api/pro {action: "withdraw", entry}            a lone seat's fee back, while nobody else has joined
// A Versus match's fight and its end, and a Survival run's end, are the arena server's to tell (pro-arena.js), not a
// player's game's.
// Every POST needs Authorization: Bearer <privy-token>.
const { neon } = require("@neondatabase/serverless");
const pro = require("./_pro.js");
const { userIdOf } = require("./_privy.js");

const MODES = new Set(["survival", "versus"]);
const WALLET = /^0x[0-9a-fA-F]{40}$/;
const id = (value) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; };
/** An entry as the page sees it. */
const shown = (e) => ({ id: Number(e.id), mode: e.mode, status: e.status, match: e.match_id ? Number(e.match_id) : null, day: e.day ? new Date(e.day).toISOString().slice(0, 10) : null });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!pro.enabled()) return res.status(200).json({ open: false });
  const sql = neon(process.env.DATABASE_URL);
  try {
    const c = await pro.chain();
    if (req.method === "GET") {
      const wallet = WALLET.test(req.query?.wallet ?? "") ? req.query.wallet : null;
      return res.status(200).json({ open: true, fee: (await pro.feeOf(c)).toString(), decimals: c.decimals, token: c.token, pot: c.pot, chainId: c.id,
        survival: await pro.survivalBoard(sql), ...(wallet && { held: await pro.heldBy(c, wallet) }) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Only GET and POST." });
    const userId = await userIdOf(req);
    if (!userId) return res.status(401).json({ error: "Sign in first." });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const answer = (out) => res.status(out.error ? 400 : 200).json(out);

    switch (body.action) {
      case "quote":
        if (!MODES.has(body.mode) || !WALLET.test(body.wallet ?? "")) return answer({ error: "Pick a mode and a wallet." });
        return answer(await pro.quote(userId, body.mode, body.wallet));
      case "enter": {
        if (!MODES.has(body.mode) || !WALLET.test(body.wallet ?? "") || typeof body.token !== "string" || !/^\d{1,78}$/.test(`${body.deadline}`) || !/^\d{1,78}$/.test(`${body.nonce}`)) return answer({ error: "That entry is incomplete." });
        const out = await pro.enter(sql, userId, body.mode, body.wallet, body.signature, body.token, `${body.deadline}`, `${body.nonce}`);
        return answer(out.entry ? { entry: shown(out.entry) } : out);
      }
      case "check": {
        const [row] = await sql`SELECT * FROM pro_entries WHERE id = ${id(body.entry)} AND user_id = ${userId}`;
        if (!row) return answer({ error: "That entry was not found." });
        return answer({ entry: shown(await pro.recheck(sql, row)) });
      }
      case "withdraw":
        return answer(await pro.withdraw(sql, userId, id(body.entry)));
      default:
        return answer({ error: "Unknown action." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Pro mode could not be reached. Try again in a moment." });
  }
};

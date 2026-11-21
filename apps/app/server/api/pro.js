// Pro mode for players (the money itself is in _pro.js; schema in server/pro.sql).
//   GET  /api/pro[?wallet=…]                             open or not; the fee, the mint and the pot wallet on Solana;
//                                                        today's Survival pot and best runs; what `wallet` holds
//   POST /api/pro {action: "quote",  mode, wallet}       a transaction paying the fee, for the wallet to sign
//   POST /api/pro {action: "enter",  mode, wallet, tx, token, lastValid}   the signed transaction: sent, and the entry kept
//   POST /api/pro {action: "check",  entry}              an entry left pending, looked at again
//   POST /api/pro {action: "withdraw", entry}            a lone seat's fee back, while nobody else has joined
// A Versus match's fight and its end, and a Survival run's end, are the arena server's to tell (pro-arena.js), not a
// player's game's.
// Every POST needs Authorization: Bearer <privy-token>.
const { db } = require("./_db.js");
const pro = require("./_pro.js");
const { userIdOf } = require("./_privy.js");

const MODES = new Set(["survival", "versus"]);
const WALLET = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
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
  const sql = db();
  try {
    const c = await pro.chain();
    if (req.method === "GET") {
      const wallet = WALLET.test(req.query?.wallet ?? "") ? req.query.wallet : null;
      return res.status(200).json({ open: true, fee: c.fee.toString(), decimals: c.decimals, mint: c.mint.toBase58(), pot: c.pot.publicKey.toBase58(),
        survival: await pro.survivalBoard(sql, c), ...(wallet && { held: await pro.heldBy(c, wallet) }) });
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
        if (!MODES.has(body.mode) || !WALLET.test(body.wallet ?? "") || typeof body.tx !== "string" || typeof body.token !== "string") return answer({ error: "That entry is incomplete." });
        const out = await pro.enter(sql, userId, body.mode, body.wallet, body.tx, body.token, body.lastValid);
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

// Pro Versus matches as the arena server referees them (apps/app/src/arena/pot.vibe; spec/app/bout.md, "Story: Fight
// for the pot"). Only the arena may call: Authorization: Bearer <ARENA_SECRET>, set on this project and on the arena.
//   POST {action: "seat",   entry, token}    the match a paid entry plays in, if `token` is its owner's sign-in
//   POST {action: "fight",  match}           the arena has begun the match's fight: no more entries are seated in it
//   POST {action: "result", match, winner}   how it ended: the winner's entry is paid the pot; null holds it for review
const { neon } = require("@neondatabase/serverless");
const { createHash, timingSafeEqual } = require("node:crypto");
const pro = require("./_pro.js");
const { userIdOfToken } = require("./_privy.js");

const digest = (text) => createHash("sha256").update(String(text)).digest();
const id = (value) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.ARENA_SECRET;
  if (!secret || !timingSafeEqual(digest(req.headers.authorization ?? ""), digest(`Bearer ${secret}`))) return res.status(401).json({ error: "Not allowed." });
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST." });
  if (!pro.enabled()) return res.status(503).json({ error: "Pro mode is not set up." });
  const sql = neon(process.env.DATABASE_URL);
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  try {
    switch (body.action) {
      case "seat": {
        const userId = await userIdOfToken(typeof body.token === "string" ? body.token : "");
        if (!userId) return res.status(400).json({ error: "That sign-in does not check out." });
        const out = await pro.seatOf(sql, userId, id(body.entry));
        return res.status(out.error ? 400 : 200).json(out);
      }
      case "fight":
        await pro.lock(sql, id(body.match));
        return res.status(200).json({ ok: true });
      case "result": {
        const match = id(body.match);
        if (!match) return res.status(400).json({ error: "Which match?" });
        return res.status(200).json({ settled: await pro.decided(sql, match, body.winner === null ? null : id(body.winner)) });
      }
      default:
        return res.status(400).json({ error: "Unknown action." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The pot could not be reached." });
  }
};

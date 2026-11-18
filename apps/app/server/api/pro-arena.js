// Pro Versus matches and paid Survival runs as the arena server plays them (apps/app/src/arena/pot.vibe; spec/app/bout.md,
// "Story: Fight for the pot"; apps/app/src/arena/run.ts). Only the arena may call: Authorization: Bearer <ARENA_SECRET>,
// set on this project and on the arena.
//   POST {action: "seat",   entry, token}    the match a paid entry plays in, if `token` is its owner's sign-in
//   POST {action: "fight",  match}           the arena has begun the match's fight: no more entries are seated in it
//   POST {action: "result", match, winner}   how it ended: the winner's entry is paid the pot; null holds it for review
//   POST {action: "run",    entry, token}    whether a paid Survival entry is its owner's and still to be played
//   POST {action: "kept",   entry, wave, kos, fighter, name}   how the arena played that run to its end, once
const { neon } = require("@neondatabase/serverless");
const { createHash, timingSafeEqual } = require("node:crypto");
const pro = require("./_pro.js");
const { named } = require("./_names.js");
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
      case "run": {
        const userId = await userIdOfToken(typeof body.token === "string" ? body.token : "");
        return res.status(200).json({ ok: !!userId && (await pro.playable(sql, userId, id(body.entry))) });
      }
      case "kept": {
        const out = await pro.result(sql, id(body.entry), { wave: body.wave, kos: body.kos, fighter: Number.isInteger(body.fighter) ? body.fighter : null, name: named(body.name) || "Player" });
        return res.status(out.error ? 400 : 200).json(out);
      }
      default:
        return res.status(400).json({ error: "Unknown action." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The pot could not be reached." });
  }
};

// Reporting a name on a leaderboard (spec: the store asks that players can report what others put up).
//   POST /api/report  {board: "survival" | "daily", id, reason?}
// One report per standing per person (by a hash of their address, never the address itself). A standing reported by
// three people is hidden from the boards (scores.js, daily.js) until the owner has looked at it in the reports table.
const { db } = require("./_db.js");
const { createHash } = require("node:crypto");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Reports are not set up." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const board = body.board === "daily" ? "daily" : body.board === "survival" ? "survival" : null, ref = Number(body.id);
    if (!board || !Number.isInteger(ref) || ref <= 0) return res.status(400).json({ error: "That cannot be reported." });
    const reason = String(body.reason ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200) || null;
    const address = String(req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "").split(",")[0].trim();
    const reporter = createHash("sha256").update(`five-blades-report:${address}`).digest("hex").slice(0, 32);
    const sql = db();
    await sql`INSERT INTO reports (board, ref, reason, reporter) VALUES (${board}, ${ref}, ${reason}, ${reporter}) ON CONFLICT DO NOTHING`;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The report could not be sent." });
  }
};

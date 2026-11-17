// Pro mode for the operator, and the daily cron (vercel.json). Authorization: Bearer <PRO_ADMIN_TOKEN>; the cron
// comes with Bearer <CRON_SECRET>, which Vercel sends by itself once CRON_SECRET is set on the project.
//   GET  /api/pro-admin                                 cron: the daily work (_pro.js, daily)
//   GET  /api/pro-admin?list=1                          what waits: held payouts and matches, failed or stuck payouts
//   POST {action: "approve", payout}                    a held payout (a Survival day's winner) is sent
//   POST {action: "assign",  payout, entry}             a held Survival payout goes to another run of that day instead
//   POST {action: "award",   match, entry}              a held Versus match is paid to the entrant the operator names
//   POST {action: "refund",  match}                     a held Versus match: every entrant gets their fee back
//   POST {action: "retry",   payout}                    a failed or stuck payout, once its last transaction cannot land
const { neon } = require("@neondatabase/serverless");
const { createHash, timingSafeEqual } = require("node:crypto");
const pro = require("./_pro.js");

const digest = (text) => createHash("sha256").update(String(text)).digest();
const bearer = (req, secret) => !!secret && timingSafeEqual(digest(req.headers.authorization ?? ""), digest(`Bearer ${secret}`));
const id = (value) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const admin = bearer(req, process.env.PRO_ADMIN_TOKEN), cron = bearer(req, process.env.CRON_SECRET);
  if (!admin && !cron) return res.status(401).json({ error: "Not allowed." });
  if (!pro.enabled()) return res.status(503).json({ error: "Pro mode is not set up." });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === "GET" && !req.query?.list) return res.status(200).json(await pro.daily(sql));
    if (!admin) return res.status(401).json({ error: "Not allowed." });
    if (req.method === "GET") {
      const payouts = await sql`SELECT p.*, e.name, e.wave, e.kos, e.paid_at, e.result_at FROM pro_payouts p LEFT JOIN pro_entries e ON e.id = p.entry_id WHERE p.status IN ('held', 'failed', 'sending') ORDER BY p.id`;
      const matches = await sql`SELECT m.*, (SELECT json_agg(json_build_object('entry', e.id, 'wallet', e.wallet, 'winner', e.report_winner, 'none', e.report_none, 'reported', e.reported_at)) FROM pro_entries e WHERE e.match_id = m.id AND e.status = 'paid') AS entrants
        FROM pro_matches m WHERE m.status = 'held' ORDER BY m.id`;
      return res.status(200).json({ payouts, matches });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    switch (body.action) {
      case "approve": {
        const [p] = await sql`UPDATE pro_payouts SET status = 'approved' WHERE id = ${id(body.payout)} AND status = 'held' RETURNING id`;
        return p ? res.status(200).json({ payout: await pro.send(sql, p.id) }) : res.status(400).json({ error: "No held payout by that id." });
      }
      case "assign": {
        const [p] = await sql`UPDATE pro_payouts p SET entry_id = e.id, wallet = e.wallet FROM pro_entries e
          WHERE p.id = ${id(body.payout)} AND p.status = 'held' AND p.kind = 'survival' AND e.id = ${id(body.entry)} AND e.mode = 'survival' AND e.status = 'paid' AND e.day::text = p.ref RETURNING p.*`;
        return p ? res.status(200).json({ payout: p }) : res.status(400).json({ error: "That run is not of this payout's day." });
      }
      case "award": {
        const [winner] = await sql`SELECT e.id, e.wallet FROM pro_entries e JOIN pro_matches m ON m.id = e.match_id WHERE m.id = ${id(body.match)} AND m.status = 'held' AND e.id = ${id(body.entry)} AND e.status = 'paid'`;
        if (!winner) return res.status(400).json({ error: "That entrant is not in a held match." });
        const [{ pot }] = await sql`SELECT coalesce(sum(amount), 0)::text AS pot FROM pro_entries WHERE match_id = ${id(body.match)} AND status = 'paid'`;
        const [p] = await sql`INSERT INTO pro_payouts (kind, ref, entry_id, wallet, amount, status) VALUES ('versus', ${String(id(body.match))}, ${winner.id}, ${winner.wallet}, ${pot}, 'approved') ON CONFLICT (kind, ref) DO NOTHING RETURNING id`;
        if (!p) return res.status(400).json({ error: "This match has already been paid." });
        await sql`UPDATE pro_matches SET status = 'settled', note = coalesce(note, '') || ' / awarded by operator' WHERE id = ${id(body.match)}`;
        return res.status(200).json({ payout: await pro.send(sql, p.id) });
      }
      case "refund": {
        const [m] = await sql`UPDATE pro_matches SET status = 'settled', note = coalesce(note, '') || ' / refunded by operator' WHERE id = ${id(body.match)} AND status = 'held' RETURNING id`;
        if (!m) return res.status(400).json({ error: "No held match by that id." });
        const entrants = await sql`SELECT id FROM pro_entries WHERE match_id = ${m.id} AND status = 'paid'`;
        const refunds = [];
        for (const e of entrants) refunds.push(await pro.refund(sql, e.id));
        return res.status(200).json({ refunds });
      }
      case "retry":
        return res.status(200).json(await pro.retry(sql, id(body.payout)));
      default:
        return res.status(400).json({ error: "Unknown action." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: String(error?.message ?? error) });
  }
};

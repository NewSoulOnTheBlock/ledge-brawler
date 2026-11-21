// The site's functions (api/*.js) on the game's own server (apps/app/arena/README.md, behind Caddy): a request to
// /api/<name> is answered by api/<name>.js, given what a Vercel function is given (req.query, req.body, res.status,
// res.json); files whose names start with an underscore are shared code, never answered. The daily work of pro mode
// (api/pro-admin.js) is asked here at 04:00 UTC, with CRON_SECRET. pro.sql, which only adds what is missing, is laid
// over the database at every start, so a deploy brings the tables it needs.
const http = require("node:http");
const { readdirSync } = require("node:fs");

const PORT = 3000;
/** The most a request may send, as on Vercel. */
const MOST = 4.5 * 1024 * 1024;
const handlers = Object.fromEntries(readdirSync(`${__dirname}/api`).filter((file) => file.endsWith(".js") && !file.startsWith("_"))
  .map((file) => [file.slice(0, -3), require(`./api/${file}`)]));

/** A request's body as a Vercel function reads it: parsed JSON for JSON, text for anything else, undefined for none. */
async function bodyOf(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MOST) throw Object.assign(new Error("Too large."), { status: 413 });
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return undefined;
  if (!/json/i.test(req.headers["content-type"] ?? "")) return text;
  try { return JSON.parse(text); } catch { throw Object.assign(new Error("That is not JSON."), { status: 400 }); }
}

const server = http.createServer(async (req, res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (value) => {
    if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(value));
    return res;
  };
  const url = new URL(req.url ?? "/", "http://site");
  const handler = handlers[/^\/api\/([\w-]+)\/?$/.exec(url.pathname)?.[1] ?? ""];
  if (!handler) return res.status(404).json({ error: "Not found." });
  try {
    req.query = Object.fromEntries(url.searchParams);
    req.body = await bodyOf(req);
    await handler(req, res);
  } catch (error) {
    if (!error.status) console.error(error);
    if (!res.headersSent) res.status(error.status ?? 500).json({ error: error.status ? error.message : "Something went wrong." });
  }
});

/** The daily work, at the next 04:00 UTC and every day after; what it did goes to the log. */
function daily() {
  const next = new Date();
  next.setUTCHours(4, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 1);
  setTimeout(() => {
    fetch(`http://localhost:${PORT}/api/pro-admin`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
      .then((r) => r.text()).then((text) => console.log("daily:", text.slice(0, 500)), (error) => console.error("daily:", error))
      .finally(daily);
  }, next.getTime() - Date.now());
}

server.listen(PORT, () => console.log(`site on :${PORT}: /api/${Object.keys(handlers).join(", /api/")}`));
if (process.env.DATABASE_URL) require("./api/_db.js").db().file(`${__dirname}/pro.sql`).then(() => console.log("site: pro.sql laid"), (error) => console.error("site: pro.sql:", error.message));
if (process.env.CRON_SECRET) daily();
process.on("SIGTERM", () => server.close(() => process.exit(0)));

// The operator's Telegram bot (the `bot` service, apps/app/arena/README.md). In a private chat with TELEGRAM_ADMIN_ID
// (one id, or several with commas) and no one else, it sets what pro mode runs on (pro_settings): api/_pro.js reads
// it at every request, so a change takes at once across the game, for entries, pots and the price on the home screen.
//   /status          the token, the fee, the pot wallet and what it holds, today's Survival pot, money in play
//   /token <mint>    the $BLADES mint, checked on chain; refused while money is in play (_pro.js, inFlight)
//   /fee <tokens>    the entry fee in whole tokens
//   /rpc <url>       the Solana RPC endpoint
//   /confirm         keeps the change asked for last, within five minutes
const web3 = require("@solana/web3.js");
const spl = require("@solana/spl-token");
const pro = require("./api/_pro.js");

const CONFIRM_FOR = 5 * 60_000;
const COMMANDS = [
  { command: "status", description: "Token, fee, pot wallet, today's pot" },
  { command: "token", description: "Set the $BLADES mint: /token <address>" },
  { command: "fee", description: "Set the entry fee in whole tokens: /fee 50000" },
  { command: "rpc", description: "Set the Solana RPC: /rpc <https url>" },
  { command: "confirm", description: "Keep the change asked for last" },
];
const HELP = ["Five Blades pro mode.", ...COMMANDS.map((c) => `/${c.command}: ${c.description}`)].join("\n");

/** The change each operator asked for last, kept until they confirm it. */
const asked = new Map();
const admins = () => new Set(String(process.env.TELEGRAM_ADMIN_ID ?? "").split(/[\s,]+/).filter(Boolean));
const host = (url) => { try { return new URL(url).host; } catch { return "?"; } };
const tokens = (amount, decimals) => (BigInt(amount) / 10n ** BigInt(decimals)).toLocaleString("en-US");

/** What stops the mint from changing: money still in play in the token there is now, or null. */
async function busy(sql) {
  const n = await pro.inFlight(sql);
  if (!(n.entries || n.matches || n.days || n.payouts)) return null;
  return [`Not now: money is still in play in the current token.`,
    `${n.entries} entries confirming, ${n.matches} matches open or held, ${n.days} Survival days not yet paid, ${n.payouts} payouts not sent.`,
    `Try again once they are settled.`].join("\n");
}

async function askToken(sql, from, arg) {
  let mint;
  try { mint = new web3.PublicKey(arg); } catch { return "Send the mint's address: /token <address>"; }
  const stop = await busy(sql);
  if (stop) return stop;
  const connection = new web3.Connection(pro.rpcOf((await pro.configure(sql)).rpc), "confirmed");
  const found = await pro.mintAt(connection, mint);
  if (!found) return `No token mint at ${mint.toBase58()} on Solana mainnet.`;
  const t2022 = found.program.equals(spl.TOKEN_2022_PROGRAM_ID);
  const meta = t2022 ? await spl.getTokenMetadata(connection, mint, "confirmed", found.program).catch(() => null) : null;
  asked.set(from, { key: "mint", value: mint.toBase58(), at: Date.now() });
  return [`$BLADES becomes ${mint.toBase58()}`, `${meta ? `${meta.name} (${meta.symbol}), ` : ""}${t2022 ? "Token-2022" : "SPL token"}, ${found.decimals} decimals.`, "Send /confirm within 5 minutes."].join("\n");
}

async function askFee(sql, from, arg) {
  if (!/^\d{1,12}$/.test(arg) || BigInt(arg) === 0n) return "Send the fee in whole tokens: /fee 50000";
  const { fee } = await pro.configure(sql);
  asked.set(from, { key: "fee", value: String(BigInt(arg)), at: Date.now() });
  return `The entry fee becomes ${BigInt(arg).toLocaleString("en-US")} $BLADES (now ${fee.toLocaleString("en-US")}).\nSend /confirm within 5 minutes.`;
}

async function askRpc(from, arg) {
  if (!/^https:\/\/\S+$/.test(arg)) return "Send the endpoint: /rpc https://…";
  const slot = await new web3.Connection(arg, "confirmed").getSlot().catch(() => null);
  if (slot === null) return `${host(arg)} did not answer as a Solana RPC.`;
  asked.set(from, { key: "rpc", value: arg, at: Date.now() });
  return `The RPC becomes ${host(arg)} (it is at slot ${slot}).\nSend /confirm within 5 minutes.`;
}

async function confirm(sql, from) {
  const change = asked.get(from);
  asked.delete(from);
  if (!change || Date.now() - change.at > CONFIRM_FOR) return "Nothing to confirm.";
  if (change.key === "mint") { const stop = await busy(sql); if (stop) return stop; }
  await sql`INSERT INTO pro_settings (key, value, set_by) VALUES (${change.key}, ${change.value}, ${String(from)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, set_by = EXCLUDED.set_by, set_at = now()`;
  return `Done: the game uses it now.\n\n${await status(sql).catch((error) => `(The status could not be read: ${error.message ?? error})`)}`;
}

async function status(sql) {
  const set = await pro.configure(sql);
  const lines = [
    `Token: ${set.mint ?? "not set"}`,
    `Fee: ${set.fee.toLocaleString("en-US")} $BLADES`,
    `RPC: ${set.rpc ? host(set.rpc) : process.env.SOLANA_RPC ? `${host(process.env.SOLANA_RPC)} (the server's)` : "the public one (rate limited)"}`,
    `Pro mode: ${set.open ? "open" : `closed (${!set.mint ? "no token" : "no pot wallet on the server"})`}`,
  ];
  if (process.env.POT_SECRET) {
    const pot = await pro.potKey(), connection = new web3.Connection(pro.rpcOf(set.rpc), "confirmed");
    lines.push(`Pot wallet: ${pot.publicKey.toBase58()}`, `Pot SOL: ${((await connection.getBalance(pot.publicKey)) / 1e9).toFixed(4)}`);
  }
  if (set.open) {
    const c = await pro.chain(), board = await pro.survivalBoard(sql, c);
    lines.push(`Pot $BLADES: ${tokens(await pro.heldBy(c, c.pot.publicKey.toBase58()), c.decimals)}`, `Today's Survival: ${board.entries} entries, pot ${tokens(board.pot, c.decimals)} $BLADES`);
  }
  const n = await pro.inFlight(sql);
  lines.push(`In play: ${n.entries} entries confirming, ${n.matches} matches open or held, ${n.days} days unpaid, ${n.payouts} payouts unsent`);
  return lines.join("\n");
}

/** How a message `text` from Telegram user `from` is answered. */
async function answer(sql, from, text) {
  if (!admins().has(String(from))) return `This bot is private. Your Telegram id is ${from}.`;
  const [, command = "", arg = ""] = /^(\/\w+)(?:@\w+)?\s*(.*)$/s.exec(text.trim()) ?? [];
  switch (command.toLowerCase()) {
    case "/status": return status(sql);
    case "/token": return askToken(sql, from, arg.trim());
    case "/fee": return askFee(sql, from, arg.trim());
    case "/rpc": return askRpc(from, arg.trim());
    case "/confirm": return confirm(sql, from);
    default: return HELP;
  }
}

/** One call to Telegram's Bot API. */
async function call(method, body, wait = 15_000) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(wait),
  });
  const out = await response.json();
  if (!out.ok) throw new Error(`${method}: ${out.description}`);
  return out.result;
}

/** Asks Telegram for new messages, a long poll at a time, and answers each in its chat; private chats only. */
async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return console.log("bot: no TELEGRAM_BOT_TOKEN, so no bot");
  const sql = require("./api/_db.js").db();
  await call("setMyCommands", { commands: COMMANDS });
  console.log(`bot: answering ${admins().size} operator(s)`);
  for (let offset = 0; ;) {
    try {
      for (const { update_id, message } of await call("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] }, 60_000)) {
        offset = update_id + 1;
        if (!message?.text || message.chat.type !== "private") continue;
        console.log(`bot: ${message.from.id} ${message.text.split(/\s/)[0]}`);
        const reply = await answer(sql, message.from.id, message.text).catch((error) => { console.error(error); return `That did not work: ${error.message ?? error}`; });
        await call("sendMessage", { chat_id: message.chat.id, text: reply, link_preview_options: { is_disabled: true } });
      }
    } catch (error) {
      console.error("bot:", error.message ?? error);
      await new Promise((done) => setTimeout(done, 5000));
    }
  }
}

if (require.main === module) void main();
module.exports = { answer };

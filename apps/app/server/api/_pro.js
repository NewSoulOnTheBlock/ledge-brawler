// Pro mode's money on Robinhood Chain: entry fees in $BLADES paid into the pot contract (contracts/contracts/BladesPot.sol),
// and every pot paid out of it (schema: server/pro.sql). Used by api/pro.js (players), api/pro-arena.js (the arena
// server, which referees every Versus match and plays every paid run) and api/pro-admin.js (the operator and the
// daily cron). Nothing here trusts the page, and the contract trusts this server only so far:
//   - a fee is taken from a player only by their own signature (an EIP-2612 permit for exactly the fee) or an allowance
//     they gave the pot, and only into a pot; this server, the pot's referee, sends the transaction and pays its gas,
//     so a player paying by permit needs no ETH;
//   - a pot is paid out once, by the contract, and only to one of its own entrants; an entry is given back once; so a
//     crash, a retry or a leaked key here can never pay twice, nor pay anyone who did not play in that pot;
//   - every transaction is signed and its hash written down before it is broadcast, so a crash between the two leaves
//     something to look for, and a payout row is claimed by one atomic UPDATE before anything is sent;
//   - a Versus match's winner, and a Survival run's waves and knockouts, are the arena server's word (spec/app/bout.md;
//     apps/app/src/arena/run.ts), never a player's game's, so a day's best run is paid without the operator.
// Set on the Vercel project, never in the code:
//   BLADES_TOKEN       the $BLADES token's address; pro mode is closed while it is unset
//   BLADES_POT         the pot contract's address (contracts/README.md)
//   REFEREE_KEY        the pot's referee's private key (0x…): it seats players, pays pots out, and pays the gas in ETH
//   PRO_SIGNING_KEY    any long random string: signs what is handed out to be signed
//   CHAIN_ID           4663, Robinhood Chain (the default); 46630, its testnet; 11155111, Sepolia, for trying it out
//   CHAIN_RPC          an RPC endpoint, such as Alchemy's (defaults to the chain's public one, which is rate limited)
const { createHmac, randomBytes, timingSafeEqual } = require("node:crypto");
const viem = require("viem");
const { robinhood, robinhoodTestnet, sepolia } = require("viem/chains");
const { privateKeyToAccount } = require("viem/accounts");

const SEATS = 5;
/** How long a paid Survival run may take before its result is no longer taken, and how long after a UTC day ends its pot is decided. */
const RUN_HOURS = 2, GRACE_HOURS = 3;
/** How long a permit handed out lasts, in seconds; how long a transaction is waited for, and given up on, in milliseconds. */
const PERMIT_FOR = 30 * 60, RECEIPT_WAIT = 60_000, LOST_AFTER = 3 * 60_000;
/** How often a call the pot refused, or whose nonce was taken, is tried, and how much longer each wait before it is (ms). */
const ASKS = 5, LAG = 2000;

const POT = viem.parseAbi([
  "function fee() view returns (uint256)",
  "function enter(address player, bytes32 pot, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns (uint256)",
  "function settle(bytes32 pot, uint256 entry)",
  "function refund(uint256 entry)",
  "function pots(bytes32 pot) view returns (uint128 total, uint32 entries, bool settled)",
  "function entries(uint256 entry) view returns (address player, uint96 amount, bytes32 pot, uint64 at, bool refunded)",
  "event Entered(uint256 indexed entry, address indexed player, bytes32 indexed pot, uint256 amount)",
]);
const ERC20 = viem.parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
]);
const PERMIT = { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] };

const enabled = () => !!(process.env.BLADES_TOKEN && process.env.BLADES_POT && process.env.REFEREE_KEY && process.env.PRO_SIGNING_KEY && process.env.DATABASE_URL);

/** A pot's name in the contract: this database's (pro_site), then a Versus match's number, or a Survival day's days
 *  since 1970 (UTC). */
async function potOf(sql, kind, n) {
  const [{ id }] = await sql`SELECT id FROM pro_site`;
  return viem.keccak256(viem.stringToHex(`${id}:${kind}:${n}`));
}

let cached = null;
/** The chain, the referee's account, the token and the pot as they are on chain: the token's decimals, and how it
 *  takes a permit (its EIP-712 domain), or null if it takes none and an allowance must be given instead. */
async function chain() {
  if (cached) return cached;
  const id = Number(process.env.CHAIN_ID ?? robinhood.id), known = [robinhood, robinhoodTestnet, sepolia].find((c) => c.id === id);
  const rpc = process.env.CHAIN_RPC || known?.rpcUrls.default.http[0];
  const network = viem.defineChain({ name: "Local", nativeCurrency: robinhood.nativeCurrency, ...known, id, rpcUrls: { default: { http: [rpc] } } });
  const account = privateKeyToAccount(process.env.REFEREE_KEY.trim());
  const reader = viem.createPublicClient({ chain: network, transport: viem.http(rpc) });
  const writer = viem.createWalletClient({ account, chain: network, transport: viem.http(rpc) });
  const token = viem.getAddress(process.env.BLADES_TOKEN), pot = viem.getAddress(process.env.BLADES_POT);
  const read = (address, abi, functionName, args = []) => reader.readContract({ address, abi, functionName, args });
  cached = { id, reader, writer, token, pot, read, decimals: Number(await read(token, ERC20, "decimals")), domain: await permitDomain(read, token, id) };
  return cached;
}

/** What an entry costs now, in base units: read from the pot each time, since its owner may change it. */
const feeOf = (c) => c.read(c.pot, POT, "fee");

/** How `token` takes an EIP-2612 permit: its EIP-712 domain, read from it (EIP-5267) or checked against its separator. */
async function permitDomain(read, token, chainId) {
  try { await read(token, ERC20, "nonces", [viem.zeroAddress]); } catch { return null; }
  try {
    const [, name, version, id, verifyingContract] = await read(token, ERC20, "eip712Domain");
    return { name, version, chainId: Number(id), verifyingContract };
  } catch { /* no EIP-5267: try the usual version against the token's own separator */ }
  try {
    const domain = { name: await read(token, ERC20, "name"), version: "1", chainId, verifyingContract: token };
    return viem.domainSeparator({ domain }) === (await read(token, ERC20, "DOMAIN_SEPARATOR")) ? domain : null;
  } catch { return null; }
}

/**
 * Has the referee call the pot: refused before anything is sent if the pot would refuse it (it throws), asked again
 * first, a little later, in case the node asked had not yet seen the transaction before (an RPC's nodes lag one
 * another); otherwise signed, its hash given to `keep` to write down, then broadcast, and signed again with a fresh
 * nonce if another of the referee's transactions took that one. Answers the hash, or null if the broadcast failed and
 * nothing went out.
 */
async function transact(c, call, keep) {
  for (let tries = 1; ; tries++) {
    const request = await c.writer.prepareTransactionRequest({ to: c.pot, data: viem.encodeFunctionData({ abi: POT, ...call }) }).catch(async (error) => {
      if (tries >= ASKS) throw error;
      await new Promise((done) => setTimeout(done, LAG * tries));
    });
    if (!request) continue;
    const raw = await c.writer.signTransaction(request), hash = viem.keccak256(raw);
    await keep(hash);
    try {
      await c.reader.sendRawTransaction({ serializedTransaction: raw });
      return hash;
    } catch (error) {
      if (await c.reader.getTransaction({ hash }).catch(() => null)) return hash;
      if (tries < ASKS && /nonce|underpriced|already known/i.test(`${error?.details} ${error?.message}`)) continue;
      console.error(error);
      return null;
    }
  }
}

const sign = (text) => createHmac("sha256", process.env.PRO_SIGNING_KEY).update(text).digest("base64url");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const jsonOf = (value) => JSON.parse(JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

/** How much $BLADES `wallet` holds, in base units. */
const heldBy = async (c, wallet) => (await c.read(c.token, ERC20, "balanceOf", [viem.getAddress(wallet)])).toString();

/**
 * What a player signs to pay `mode`'s fee from `wallet`: a permit for exactly the fee, to the pot; or, for a token
 * that takes no permit and while the pot has no allowance from `wallet`, the approval for `wallet` to send first.
 * Either way a token proving this server handed it out, for `enter`.
 */
async function quote(userId, mode, wallet) {
  const c = await chain(), owner = viem.getAddress(wallet), fee = await feeOf(c);
  if (BigInt(await heldBy(c, owner)) < fee) return { error: `This wallet holds less than ${viem.formatUnits(fee, c.decimals)} $BLADES.` };
  if (!c.domain) {
    if ((await c.read(c.token, ERC20, "allowance", [owner, c.pot])) < fee)
      return { approve: { to: c.token, data: viem.encodeFunctionData({ abi: ERC20, functionName: "approve", args: [c.pot, fee] }), chainId: c.id } };
    const nonce = BigInt(`0x${randomBytes(16).toString("hex")}`).toString();
    return { token: sign(`${userId}|${mode}|${owner}|0|${nonce}`), deadline: "0", nonce, amount: fee.toString() };
  }
  const nonce = await c.read(c.token, ERC20, "nonces", [owner]), deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_FOR);
  const permit = { domain: c.domain, types: PERMIT, primaryType: "Permit", message: { owner, spender: c.pot, value: fee, nonce, deadline } };
  return { permit: jsonOf(permit), token: sign(`${userId}|${mode}|${owner}|${deadline}|${nonce}`), deadline: deadline.toString(), nonce: nonce.toString(), amount: fee.toString() };
}

/**
 * Takes what `quote` handed out, with the player's signature if it was a permit: checks it came from here and the
 * signature is the wallet's, seats the entry (today's Survival pot, or a Versus match with a free seat), and has the
 * pot take the fee. Answers the entry row: paid, or pending while the chain has not said. Sending the same thing again
 * finds the same entry, and sends nothing more.
 */
async function enter(sql, userId, mode, wallet, signature, token, deadline, nonce) {
  const c = await chain(), owner = viem.getAddress(wallet), fee = await feeOf(c);
  if (!same(sign(`${userId}|${mode}|${owner}|${deadline}|${nonce}`), token)) return { error: "That entry was not made here. Try again." };
  let v = 0, r = viem.zeroHash, s = viem.zeroHash;
  if (String(deadline) !== "0") {
    if (BigInt(deadline) * 1000n < BigInt(Date.now())) return { error: "That entry took too long to sign. Try again." };
    const message = { owner, spender: c.pot, value: fee, nonce: BigInt(nonce), deadline: BigInt(deadline) };
    const good = typeof signature === "string" && (await viem.verifyTypedData({ address: owner, domain: c.domain, types: PERMIT, primaryType: "Permit", message, signature }).catch(() => false));
    if (!good) return { error: "The wallet's signature is missing or wrong." };
    ({ v, r, s } = viem.parseSignature(signature));
  }
  // One row for what was handed out, whatever becomes of it: `signature` keys it by the token, which names it alone.
  const key = viem.keccak256(viem.stringToHex(token));
  await sql`INSERT INTO pro_entries (user_id, wallet, mode, signature, amount) VALUES (${userId}, ${owner}, ${mode}, ${key}, ${fee.toString()}) ON CONFLICT (signature) DO NOTHING`;
  // Claimed by one UPDATE: of two requests sending the same entry, one sends it.
  const [claimed] = await sql`UPDATE pro_entries SET tx = '' WHERE signature = ${key} AND status = 'pending' AND tx IS NULL RETURNING *`;
  if (!claimed) {
    const [row] = await sql`SELECT * FROM pro_entries WHERE signature = ${key}`;
    return row.status === "failed" ? { error: "That entry did not go through. Nothing was taken." } : { entry: await recheck(sql, row) };
  }
  const seated = await seat(sql, claimed);
  try {
    const hash = await transact(c, { functionName: "enter", args: [owner, seated.pot, BigInt(deadline), Number(v), r, s] }, (tx) => sql`UPDATE pro_entries SET tx = ${tx} WHERE id = ${seated.id}`);
    if (!hash) { await failEntry(sql, seated); return { error: "The entry could not be sent. Nothing was taken." }; }
    return { entry: await landed(sql, c, { ...seated, tx: hash }, RECEIPT_WAIT) };
  } catch (error) {
    console.error(error);
    await failEntry(sql, seated);
    return { error: "The pot would not take this entry. Nothing was taken." };
  }
}

/** Seats an entry before its fee is taken, and names its pot: today's Survival pot, or a seat in the oldest open
 *  Versus match, taken atomically, or a new match. */
async function seat(sql, row) {
  if (row.mode === "survival") {
    const [{ n }] = await sql`SELECT ((now() AT TIME ZONE 'utc')::date - date '1970-01-01') AS n`;
    const [seated] = await sql`UPDATE pro_entries SET day = date '1970-01-01' + ${n}::int, pot = ${await potOf(sql, "survival", n)} WHERE id = ${row.id} RETURNING *`;
    return seated;
  }
  let [match] = await sql`UPDATE pro_matches SET seats = seats + 1 WHERE id = (
      SELECT id FROM pro_matches WHERE status = 'open' AND seats < ${SEATS} ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`;
  if (!match) [match] = await sql`INSERT INTO pro_matches (seats) VALUES (1) RETURNING id`;
  const [seated] = await sql`UPDATE pro_entries SET match_id = ${match.id}, pot = ${await potOf(sql, "versus", Number(match.id))} WHERE id = ${row.id} RETURNING *`;
  return seated;
}

/** An entry whose fee was never taken: failed, and its seat given up. */
async function failEntry(sql, row) {
  const [failed] = await sql`UPDATE pro_entries SET status = 'failed' WHERE id = ${row.id} AND status = 'pending' RETURNING *`;
  if (failed?.match_id) await sql`UPDATE pro_matches SET seats = greatest(0, seats - 1) WHERE id = ${failed.match_id}`;
  return failed ?? row;
}

/** Waits up to `wait` for an entry's transaction: paid, with the pot's number for it; failed; or still pending. */
async function landed(sql, c, row, wait) {
  const receipt = await c.reader.waitForTransactionReceipt({ hash: row.tx, timeout: wait, pollingInterval: 250 }).catch(() => null);
  if (!receipt) return row;
  if (receipt.status !== "success") return failEntry(sql, row);
  const [entered] = viem.parseEventLogs({ abi: POT, eventName: "Entered", logs: receipt.logs }).filter((log) => viem.isAddressEqual(log.address, c.pot));
  const [paid] = await sql`UPDATE pro_entries SET status = 'paid', paid_at = coalesce(paid_at, now()), chain_entry = ${entered.args.entry.toString()}, amount = ${entered.args.amount.toString()}
    WHERE id = ${row.id} RETURNING *`;
  return paid;
}

/** Looks again at an entry left pending (the page gave up waiting): paid, failed, or still pending; failed once its
 *  transaction is nowhere to be found LOST_AFTER it was made. */
async function recheck(sql, row) {
  if (row.status !== "pending") return row;
  const c = await chain();
  if (row.tx) {
    const after = await landed(sql, c, row, 1);
    if (after.status !== "pending" || (await c.reader.getTransaction({ hash: row.tx }).catch(() => null))) return after;
  }
  return Date.now() - new Date(row.created_at).getTime() > LOST_AFTER ? failEntry(sql, row) : row;
}

const most = (wave) => { let n = 0; for (let w = 1; w <= wave + 1; w++) n += Math.min(w + 1, 8); return n; };

/** Whether a paid Survival entry of `userId`'s may be played now: paid within RUN_HOURS, and not yet played to its end. */
async function playable(sql, userId, entryId) {
  const [row] = await sql`SELECT id FROM pro_entries WHERE id = ${entryId} AND user_id = ${userId} AND mode = 'survival' AND status = 'paid'
    AND result_at IS NULL AND paid_at > now() - make_interval(hours => ${RUN_HOURS})`;
  return !!row;
}

/** Keeps a paid Survival run's result as the arena played it, once, and only within RUN_HOURS of paying. */
async function result(sql, entryId, { wave, kos, fighter, name }) {
  if (!Number.isInteger(wave) || wave < 0 || wave > 999 || !Number.isInteger(kos) || kos < 0 || kos > most(wave)) return { error: "That result is not possible." };
  const [row] = await sql`UPDATE pro_entries SET wave = ${wave}, kos = ${kos}, fighter = ${fighter}, name = ${name}, result_at = now()
    WHERE id = ${entryId} AND mode = 'survival' AND status = 'paid' AND result_at IS NULL AND paid_at > now() - make_interval(hours => ${RUN_HOURS})
    RETURNING id, day, wave, kos`;
  return row ? { kept: row } : { error: "That run has already been counted, or was not paid for." };
}

/** Today's Survival pot, and its best runs. */
async function survivalBoard(sql) {
  const [{ entries, pot }] = await sql`SELECT count(*)::int AS entries, coalesce(sum(amount), 0)::text AS pot FROM pro_entries
    WHERE mode = 'survival' AND status = 'paid' AND day = (now() AT TIME ZONE 'utc')::date`;
  const top = await sql`SELECT id, name, fighter, wave, kos FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = (now() AT TIME ZONE 'utc')::date AND result_at IS NOT NULL
    ORDER BY wave DESC, kos DESC, result_at ASC LIMIT 10`;
  return { entries, pot, top: top.map((r) => ({ ...r, id: Number(r.id) })) };
}

/** The match a paid Versus entry of `userId`'s plays in, while it is still to be fought or being fought. */
async function seatOf(sql, userId, entryId) {
  const [row] = await sql`SELECT e.match_id FROM pro_entries e JOIN pro_matches m ON m.id = e.match_id
    WHERE e.id = ${entryId} AND e.user_id = ${userId} AND e.mode = 'versus' AND e.status = 'paid' AND m.status IN ('open', 'fighting')`;
  return row ? { match: Number(row.match_id) } : { error: "That entry has no match to play." };
}

/** Stops new seats in a match once the arena has begun its fight. */
const lock = (sql, matchId) => sql`UPDATE pro_matches SET status = 'fighting', locked_at = now() WHERE id = ${matchId} AND status = 'open'`;

/**
 * Settles a match as the arena server saw it end: `winner`, an entrant's entry, is paid the whole pot of every paid
 * entry in it; with no winner (no one left standing) or one who is not an entrant, the match is held for the operator.
 * The payout row is written before the match is marked settled, so a crash between the two is mended by the arena
 * telling the result again; telling it after it is settled changes nothing. Answers "paid", "held", or null if the
 * match was settled already.
 */
async function decided(sql, matchId, winner) {
  const entrants = await sql`SELECT id, wallet, amount FROM pro_entries WHERE match_id = ${matchId} AND status = 'paid'`;
  const pot = entrants.reduce((sum, e) => sum + BigInt(e.amount), 0n);
  const won = winner === null ? undefined : entrants.find((e) => Number(e.id) === winner);
  const agreed = !!won && entrants.length >= 2;
  if (agreed) await sql`INSERT INTO pro_payouts (kind, ref, entry_id, wallet, amount, status)
    SELECT 'versus', ${String(matchId)}, ${won.id}, ${won.wallet}, ${pot.toString()}, 'approved' WHERE EXISTS (SELECT 1 FROM pro_matches WHERE id = ${matchId} AND status IN ('open', 'fighting'))
    ON CONFLICT (kind, ref) DO NOTHING`;
  const [claimed] = await sql`UPDATE pro_matches SET status = ${agreed ? "settled" : "held"}, settled_at = now(),
      note = ${agreed ? "won at the arena" : winner === null ? "arena: no one left standing" : `arena named ${winner}, who is not in this match`}
    WHERE id = ${matchId} AND status IN ('open', 'fighting') RETURNING id`;
  const [payout] = agreed ? await sql`SELECT id FROM pro_payouts WHERE kind = 'versus' AND ref = ${String(matchId)} AND status = 'approved'` : [];
  if (payout) await send(sql, payout.id);
  return claimed ? (agreed ? "paid" : "held") : null;
}

/** Gives a lone entrant their fee back, if nobody else has taken a seat in their match. */
async function withdraw(sql, userId, entryId) {
  const [entry] = await sql`SELECT id, match_id FROM pro_entries WHERE id = ${entryId} AND user_id = ${userId} AND mode = 'versus' AND status = 'paid'`;
  if (!entry) return { error: "That seat was not found." };
  const [match] = await sql`UPDATE pro_matches SET status = 'settled', settled_at = now(), note = 'withdrawn alone' WHERE id = ${entry.match_id} AND status = 'open' AND seats = 1 RETURNING id`;
  if (!match) return { error: "Someone else is in this match: it is played to the end." };
  return { refunded: await refund(sql, entry.id) };
}

async function refund(sql, entryId) {
  const [payout] = await sql`INSERT INTO pro_payouts (kind, ref, entry_id, wallet, amount, status)
    SELECT 'refund', ${String(entryId)}, id, wallet, amount, 'approved' FROM pro_entries WHERE id = ${entryId} AND status = 'paid'
    ON CONFLICT (kind, ref) DO NOTHING RETURNING id`;
  return payout ? send(sql, payout.id) : null;
}

/** A payout as the pot is asked for it: a pot paid to its winning entry, or an entry given back; and whether the
 *  contract has done that already. `p` carries its entry's `chain_entry` and `pot`. */
function callOf(c, p) {
  const entry = BigInt(p.chain_entry);
  return p.kind === "refund"
    ? { call: { functionName: "refund", args: [entry] }, done: async () => (await c.read(c.pot, POT, "entries", [entry]))[4] }
    : { call: { functionName: "settle", args: [p.pot, entry] }, done: async () => (await c.read(c.pot, POT, "pots", [p.pot]))[2] };
}

/**
 * Pays an approved payout out of the pot contract: claimed by one UPDATE (so two callers cannot both send), its
 * transaction written down, sent, and waited for. Answers the row as it ends: sent, failed, or still sending if the
 * chain did not say. The contract pays a pot once and gives an entry back once, so nothing sent again pays twice.
 */
async function send(sql, payoutId) {
  const [p] = await sql`UPDATE pro_payouts p SET status = 'sending' FROM pro_entries e WHERE p.id = ${payoutId} AND p.status = 'approved' AND e.id = p.entry_id
    RETURNING p.*, e.chain_entry, e.pot`;
  if (!p) return null;
  const c = await chain();
  const failed = async (error) => (await sql`UPDATE pro_payouts SET status = 'failed', error = ${error.slice(0, 500)} WHERE id = ${p.id} RETURNING *`)[0];
  try {
    const hash = await transact(c, callOf(c, p).call, (tx) => sql`UPDATE pro_payouts SET signature = ${tx} WHERE id = ${p.id}`);
    if (!hash) return failed("not broadcast");
    const receipt = await c.reader.waitForTransactionReceipt({ hash, timeout: RECEIPT_WAIT, pollingInterval: 250 }).catch(() => null);
    if (!receipt) return { ...p, status: "sending", signature: hash };
    if (receipt.status !== "success") return failed("reverted");
    return (await sql`UPDATE pro_payouts SET status = 'sent', sent_at = now() WHERE id = ${p.id} RETURNING *`)[0];
  } catch (error) {
    console.error(error);
    return failed(String(error?.shortMessage ?? error?.message ?? error));
  }
}

/** A failed or stuck payout sent again: found done on chain already, or still to be waited for, or sent afresh. */
async function retry(sql, payoutId) {
  const [p] = await sql`SELECT p.*, e.chain_entry, e.pot FROM pro_payouts p JOIN pro_entries e ON e.id = p.entry_id WHERE p.id = ${payoutId} AND p.status IN ('failed', 'sending')`;
  if (!p) return { error: "Only a failed or stuck payout can be retried." };
  const c = await chain();
  if (await callOf(c, p).done()) return { payout: (await sql`UPDATE pro_payouts SET status = 'sent', sent_at = coalesce(sent_at, now()), error = NULL WHERE id = ${p.id} RETURNING *`)[0] };
  if (p.status === "sending" && p.signature && (await c.reader.getTransaction({ hash: p.signature }).catch(() => null)))
    return { error: "Its last transaction may still land. Try again in a minute." };
  await sql`UPDATE pro_payouts SET status = 'approved', signature = NULL, error = NULL WHERE id = ${p.id} AND status IN ('failed', 'sending')`;
  return { payout: await send(sql, p.id) };
}

/**
 * The daily work (api/pro-admin.js, by Vercel cron): each Survival day past its grace pays its pot to its best run,
 * every result being the arena's; a match nobody else joined in an hour is refunded; a match the arena has not
 * settled in an hour is held.
 */
async function daily(sql) {
  const done = [];
  const days = await sql`SELECT DISTINCT day FROM pro_entries WHERE mode = 'survival' AND status = 'paid'
    AND day + 1 + make_interval(hours => ${GRACE_HOURS}) < (now() AT TIME ZONE 'utc') AND day NOT IN (SELECT day FROM pro_days) ORDER BY day`;
  for (const { day } of days) {
    const ref = new Date(day).toISOString().slice(0, 10);
    const [{ entries, pot }] = await sql`SELECT count(*)::int AS entries, coalesce(sum(amount), 0)::text AS pot FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = ${ref}`;
    const [best] = await sql`SELECT id, wallet FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = ${ref} AND result_at IS NOT NULL ORDER BY wave DESC, kos DESC, result_at ASC LIMIT 1`;
    const [payout] = best ? await sql`INSERT INTO pro_payouts (kind, ref, entry_id, wallet, amount, status) VALUES ('survival', ${ref}, ${best.id}, ${best.wallet}, ${pot}, 'approved') ON CONFLICT (kind, ref) DO NOTHING RETURNING id` : [];
    await sql`INSERT INTO pro_days (day) VALUES (${ref}) ON CONFLICT DO NOTHING`;
    if (payout) await send(sql, payout.id);
    done.push({ day: ref, entries, pot, winner: best ? Number(best.id) : null });
  }
  const alone = await sql`UPDATE pro_matches SET status = 'settled', settled_at = now(), note = 'nobody came' WHERE status = 'open' AND seats = 1 AND created_at < now() - interval '1 hour' RETURNING id`;
  for (const { id } of alone) { const [e] = await sql`SELECT id FROM pro_entries WHERE match_id = ${id} AND status = 'paid'`; if (e) await refund(sql, e.id); }
  const stale = await sql`UPDATE pro_matches SET status = 'held', settled_at = now(), note = 'no result from the arena'
    WHERE status IN ('open', 'fighting') AND seats >= 2 AND created_at < now() - interval '1 hour' RETURNING id`;
  return { days: done, refunded: alone.length, held: stale.length };
}

module.exports = { enabled, chain, feeOf, heldBy, quote, enter, recheck, playable, result, survivalBoard, seatOf, lock, decided, withdraw, refund, send, retry, daily, SEATS };

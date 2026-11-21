// Pro mode's money: entries paid in $BLADES into the pot wallet, and what is paid out of it (schema: server/pro.sql).
// Used by api/pro.js (players), api/pro-arena.js (the arena server, which referees every Versus match) and
// api/pro-admin.js (the operator and the daily cron). Nothing here trusts the page:
//   - an entry is a transaction this server builds (pot wallet pays the network fee), the player only signs it, and
//     the server checks it is the very message it built before adding its own signature and sending it;
//   - a payout row is unique per (kind, ref), is claimed by one atomic UPDATE before anything is sent, and its
//     signature is written down before it is broadcast, so a crash can never pay twice;
//   - a Versus match's winner, and a Survival run's waves and knockouts, are the arena server's word (spec/app/bout.md;
//     apps/app/src/arena/run.ts), never a player's game's, so a day's best run is paid without the operator.
// The $BLADES mint, the fee and the RPC are the operator's, set from Telegram (server/bot.js; pro_settings) and read at
// the start of every request (`configure`). Set in the server's .env (apps/app/arena/README.md), never in the code:
//   POT_SECRET         the pot wallet's secret key (base58, or a JSON byte array)
//   PRO_SIGNING_KEY    any long random string: signs the transactions handed out to be signed
//   SOLANA_RPC         an RPC endpoint, until the operator sets one (else the public mainnet one, which is rate limited)
const { createHmac, timingSafeEqual } = require("node:crypto");
const web3 = require("@solana/web3.js");
const spl = require("@solana/spl-token");

const SEATS = 5;
/** The entry fee in whole tokens until the operator sets one. */
const FEE = 50_000n;
/** How long a paid Survival run may take before its result is no longer taken, and how long after a UTC day ends its pot is decided. */
const RUN_HOURS = 2, GRACE_HOURS = 3;
const MEMO = new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/** What the operator last set (pro_settings), as `configure` read it. */
let settings = { mint: null, fee: FEE, rpc: null };
const enabled = () => !!(settings.mint && process.env.POT_SECRET && process.env.PRO_SIGNING_KEY);
const rpcOf = (rpc) => rpc || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

/** Reads what the operator has set; a changed mint, fee or RPC is taken from here on. Answers whether pro mode is open,
 *  with the settings: the mint, which the page shows the price of even while pro mode is closed, the fee in whole
 *  tokens and the RPC. */
async function configure(sql) {
  const set = Object.fromEntries((await sql`SELECT key, value FROM pro_settings`).map((row) => [row.key, row.value]));
  const now = { mint: set.mint ?? null, fee: BigInt(set.fee ?? FEE), rpc: set.rpc ?? null };
  if (now.mint !== settings.mint || now.fee !== settings.fee || now.rpc !== settings.rpc) cached = null;
  settings = now;
  return { open: enabled(), ...settings };
}

/** The pot wallet, from POT_SECRET (base58, or a JSON byte array). */
async function potKey() {
  const raw = process.env.POT_SECRET.trim();
  return web3.Keypair.fromSecretKey(raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : (await import("bs58")).default.decode(raw));
}

/** A mint as it is on chain, at `rpc`: its token program (classic SPL or Token-2022, whichever owns it) and decimals;
 *  null if no mint is there. */
async function mintAt(connection, mint) {
  const info = await connection.getAccountInfo(mint);
  if (!info || !(info.owner.equals(spl.TOKEN_PROGRAM_ID) || info.owner.equals(spl.TOKEN_2022_PROGRAM_ID))) return null;
  const { decimals } = await spl.getMint(connection, mint, "confirmed", info.owner);
  return { program: info.owner, decimals };
}

let cached = null;
/** The connection, the pot's keypair, and the mint as it is on chain: its token program and decimals. */
async function chain() {
  if (cached) return cached;
  const connection = new web3.Connection(rpcOf(settings.rpc), "confirmed");
  const pot = await potKey();
  const mint = new web3.PublicKey(settings.mint);
  const found = await mintAt(connection, mint);
  if (!found) throw new Error("The $BLADES mint was not found on chain.");
  cached = { connection, pot, mint, ...found, fee: settings.fee * 10n ** BigInt(found.decimals) };
  return cached;
}

/** Money not yet where it ends: an entry not settled, a match or a day whose pot is not paid, a payout not sent. While
 *  there is any, the mint may not change, or a pot taken in one token would be paid in another. */
async function inFlight(sql) {
  const [row] = await sql`SELECT
      (SELECT count(*) FROM pro_entries WHERE status = 'pending')::int AS entries,
      (SELECT count(*) FROM pro_matches WHERE status IN ('open', 'fighting', 'held'))::int AS matches,
      (SELECT count(DISTINCT day) FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day NOT IN (SELECT day FROM pro_days))::int AS days,
      (SELECT count(*) FROM pro_payouts WHERE status IN ('held', 'approved', 'sending', 'failed'))::int AS payouts`;
  return row;
}

const ata = (c, owner) => spl.getAssociatedTokenAddressSync(c.mint, owner, true, c.program);
const sign = (text) => createHmac("sha256", process.env.PRO_SIGNING_KEY).update(text).digest("base64url");
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** How much $BLADES `wallet` holds, in base units: "0" for a wallet with no account for it yet. */
const heldBy = (c, wallet) => c.connection.getTokenAccountBalance(ata(c, new web3.PublicKey(wallet))).then((r) => r.value.amount, () => "0");

/** A transaction moving the entry fee from `wallet` to the pot, for the player to sign, and a token proving this server built it. */
async function quote(userId, mode, wallet) {
  const c = await chain();
  const owner = new web3.PublicKey(wallet);
  const from = ata(c, owner), to = ata(c, c.pot.publicKey);
  if (BigInt(await heldBy(c, wallet)) < c.fee) return { error: `This wallet holds less than ${settings.fee.toLocaleString("en-US")} $BLADES.` };
  const { blockhash, lastValidBlockHeight } = await c.connection.getLatestBlockhash("confirmed");
  const tx = new web3.Transaction({ feePayer: c.pot.publicKey, blockhash, lastValidBlockHeight }).add(
    spl.createAssociatedTokenAccountIdempotentInstruction(c.pot.publicKey, to, c.pot.publicKey, c.mint, c.program),
    spl.createTransferCheckedInstruction(from, c.mint, to, owner, c.fee, c.decimals, [], c.program),
    // Names the entry, and makes every quote's message different even under one blockhash.
    new web3.TransactionInstruction({ programId: MEMO, keys: [{ pubkey: owner, isSigner: true, isWritable: false }], data: Buffer.from(`five-blades pro ${mode} ${Date.now()}`) }),
  );
  const message = tx.serializeMessage().toString("base64");
  return {
    tx: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    token: sign(`${userId}|${mode}|${wallet}|${lastValidBlockHeight}|${message}`),
    lastValid: lastValidBlockHeight,
    amount: c.fee.toString(),
  };
}

/**
 * Takes the transaction `quote` handed out, now signed by the player: checks it is unchanged and the player's
 * signature is good, adds the pot's, writes the entry down as pending under its signature, sends it and waits for it.
 * Answers the entry row: paid, or pending while the network has not said (`recheck` looks again). Sending the same
 * signed transaction twice finds the entry already there.
 */
async function enter(sql, userId, mode, wallet, signedBase64, token, lastValid) {
  const c = await chain();
  const tx = web3.Transaction.from(Buffer.from(signedBase64, "base64"));
  const message = tx.serializeMessage().toString("base64");
  if (!same(sign(`${userId}|${mode}|${wallet}|${lastValid}|${message}`), token)) return { error: "That entry was not made here. Try again." };
  const player = new web3.PublicKey(wallet);
  const theirs = tx.signatures.find((s) => s.publicKey.equals(player));
  if (!theirs?.signature || !tx.verifySignatures(false)) return { error: "The wallet's signature is missing or wrong." };
  tx.partialSign(c.pot);
  const signature = (await import("bs58")).default.encode(tx.signature);
  const [row] = await sql`INSERT INTO pro_entries (user_id, wallet, mode, signature, amount) VALUES (${userId}, ${wallet}, ${mode}, ${signature}, ${c.fee.toString()})
    ON CONFLICT (signature) DO UPDATE SET signature = EXCLUDED.signature RETURNING *`;
  if (row.status === "paid") return { entry: row };
  try {
    await c.connection.sendRawTransaction(tx.serialize(), { preflightCommitment: "confirmed" });
  } catch (error) {
    // Already sent once: wait for it below. Anything else (no funds, expired blockhash) means it never landed.
    if (!/already been processed/i.test(String(error?.message))) {
      await sql`UPDATE pro_entries SET status = 'failed' WHERE id = ${row.id} AND status = 'pending'`;
      return { error: "The entry could not be sent. Nothing was taken." };
    }
  }
  const landed = await landedOk(c, signature, Number(lastValid));
  if (landed === false) { await sql`UPDATE pro_entries SET status = 'failed' WHERE id = ${row.id} AND status = 'pending'`; return { error: "The entry did not go through. Nothing was taken." }; }
  if (landed === null) return { entry: row };
  return { entry: await markPaid(sql, row.id, mode) };
}

/** Whether a signature landed without error: true, false (failed, or expired unseen), or null while it is still undecided. */
async function landedOk(c, signature, lastValid) {
  for (let i = 0; i < 40; i++) {
    const { value: [status] } = await c.connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return status.err ? false : true;
    if (!status && (await c.connection.getBlockHeight("confirmed")) > lastValid) return false;
    await new Promise((done) => setTimeout(done, 1000));
  }
  return null;
}

/** Marks an entry paid and puts it where it plays: today's Survival pot, or a Versus match with a free seat. */
async function markPaid(sql, id, mode) {
  if (mode === "survival") {
    const [row] = await sql`UPDATE pro_entries SET status = 'paid', paid_at = coalesce(paid_at, now()), day = coalesce(day, (now() AT TIME ZONE 'utc')::date) WHERE id = ${id} RETURNING *`;
    return row;
  }
  const [already] = await sql`UPDATE pro_entries SET status = 'paid', paid_at = coalesce(paid_at, now()) WHERE id = ${id} RETURNING *`;
  if (already.match_id) return already;
  // A seat in the oldest open match, taken atomically; or a new match.
  let [match] = await sql`UPDATE pro_matches SET seats = seats + 1 WHERE id = (
      SELECT id FROM pro_matches WHERE status = 'open' AND seats < ${SEATS} ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`;
  if (!match) [match] = await sql`INSERT INTO pro_matches (seats) VALUES (1) RETURNING id`;
  const [row] = await sql`UPDATE pro_entries SET match_id = ${match.id} WHERE id = ${id} RETURNING *`;
  return row;
}

/** Looks again at an entry left pending (the page gave up waiting): paid, failed, or still pending. */
async function recheck(sql, row) {
  if (row.status !== "pending") return row;
  const c = await chain();
  const { value: [status] } = await c.connection.getSignatureStatuses([row.signature], { searchTransactionHistory: true });
  if (status?.confirmationStatus && !status.err) return markPaid(sql, row.id, row.mode);
  if (status?.err || Date.now() - new Date(row.created_at).getTime() > 3 * 60_000) {
    const [failed] = await sql`UPDATE pro_entries SET status = 'failed' WHERE id = ${row.id} AND status = 'pending' RETURNING *`;
    return failed ?? row;
  }
  return row;
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
async function survivalBoard(sql, c) {
  const [{ entries }] = await sql`SELECT count(*)::int AS entries FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = (now() AT TIME ZONE 'utc')::date`;
  const top = await sql`SELECT id, name, fighter, wave, kos FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = (now() AT TIME ZONE 'utc')::date AND result_at IS NOT NULL
    ORDER BY wave DESC, kos DESC, result_at ASC LIMIT 10`;
  return { entries, pot: (c.fee * BigInt(entries)).toString(), top: top.map((r) => ({ ...r, id: Number(r.id) })) };
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

/**
 * Pays an approved payout from the pot: claimed by one UPDATE (so two callers cannot both send), signed, its signature
 * written down, then sent. Answers the row as it ends: sent, failed, or still sending if the network did not say.
 */
async function send(sql, payoutId) {
  const [p] = await sql`UPDATE pro_payouts SET status = 'sending' WHERE id = ${payoutId} AND status = 'approved' RETURNING *`;
  if (!p) return null;
  const c = await chain();
  try {
    const owner = new web3.PublicKey(p.wallet), to = ata(c, owner);
    const { blockhash, lastValidBlockHeight } = await c.connection.getLatestBlockhash("confirmed");
    const tx = new web3.Transaction({ feePayer: c.pot.publicKey, blockhash, lastValidBlockHeight }).add(
      spl.createAssociatedTokenAccountIdempotentInstruction(c.pot.publicKey, to, owner, c.mint, c.program),
      spl.createTransferCheckedInstruction(ata(c, c.pot.publicKey), c.mint, to, c.pot.publicKey, BigInt(p.amount), c.decimals, [], c.program),
    );
    tx.sign(c.pot);
    const signature = (await import("bs58")).default.encode(tx.signature);
    await sql`UPDATE pro_payouts SET signature = ${signature}, last_valid = ${lastValidBlockHeight} WHERE id = ${p.id}`;
    await c.connection.sendRawTransaction(tx.serialize(), { preflightCommitment: "confirmed" });
    const landed = await landedOk(c, signature, lastValidBlockHeight);
    if (landed === null) return { ...p, status: "sending", signature };
    const [done] = landed
      ? await sql`UPDATE pro_payouts SET status = 'sent', sent_at = now() WHERE id = ${p.id} RETURNING *`
      : await sql`UPDATE pro_payouts SET status = 'failed', error = 'did not land' WHERE id = ${p.id} RETURNING *`;
    return done;
  } catch (error) {
    console.error(error);
    // Failed before or while sending: whether it landed is decided later by `retry`, from its signature.
    const [failed] = await sql`UPDATE pro_payouts SET status = 'failed', error = ${String(error?.message ?? error).slice(0, 500)} WHERE id = ${p.id} RETURNING *`;
    return failed;
  }
}

/** A failed or stuck payout sent again, only once its last transaction is certain never to land. */
async function retry(sql, payoutId) {
  const [p] = await sql`SELECT * FROM pro_payouts WHERE id = ${payoutId} AND status IN ('failed', 'sending')`;
  if (!p) return { error: "Only a failed or stuck payout can be retried." };
  if (p.signature) {
    const c = await chain();
    const landed = await landedOk(c, p.signature, Number(p.last_valid));
    if (landed === true) { const [sent] = await sql`UPDATE pro_payouts SET status = 'sent', sent_at = now(), error = NULL WHERE id = ${p.id} RETURNING *`; return { payout: sent }; }
    if (landed === null) return { error: "Its last transaction may still land. Try again in a minute." };
  }
  await sql`UPDATE pro_payouts SET status = 'approved', signature = NULL, error = NULL WHERE id = ${p.id} AND status IN ('failed', 'sending')`;
  return { payout: await send(sql, p.id) };
}

/**
 * The daily work (api/pro-admin.js, asked daily by server/serve.js): each Survival day past its grace pays its pot to its best run,
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

module.exports = { configure, enabled, rpcOf, mintAt, potKey, inFlight, chain, heldBy, quote, enter, recheck, playable, result, survivalBoard, seatOf, lock, decided, withdraw, refund, send, retry, daily, SEATS };

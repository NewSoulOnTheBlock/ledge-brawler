// Pro mode's money: entries paid in $BLADES into the pot wallet, and what is paid out of it (schema: server/pro.sql).
// Used by api/pro.js (players) and api/pro-admin.js (the operator and the daily cron). Nothing here trusts the page:
//   - an entry is a transaction this server builds (pot wallet pays the network fee), the player only signs it, and
//     the server checks it is the very message it built before adding its own signature and sending it;
//   - a payout row is unique per (kind, ref), is claimed by one atomic UPDATE before anything is sent, and its
//     signature is written down before it is broadcast, so a crash can never pay twice.
// Set on the Vercel project, never in the code:
//   BLADES_MINT        the $BLADES mint; pro mode is closed while it is unset
//   POT_SECRET         the pot wallet's secret key (base58, or a JSON byte array)
//   PRO_SIGNING_KEY    any long random string: signs the transactions handed out to be signed
//   SOLANA_RPC         an RPC endpoint (defaults to the public mainnet one, which is rate limited)
//   PRO_FEE            the entry fee in whole tokens (default 50000)
const { createHmac, timingSafeEqual } = require("node:crypto");
const web3 = require("@solana/web3.js");
const spl = require("@solana/spl-token");

const FEE_TOKENS = BigInt(process.env.PRO_FEE ?? "50000");
const SEATS = 5;
/** How long a paid Survival run may take before its result is no longer taken, and how long after a UTC day ends its pot is decided. */
const RUN_HOURS = 2, GRACE_HOURS = 3;
const MEMO = new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const enabled = () => !!(process.env.BLADES_MINT && process.env.POT_SECRET && process.env.PRO_SIGNING_KEY && process.env.DATABASE_URL);

let cached = null;
/** The connection, the pot's keypair, and the mint as it is on chain: its token program and decimals. */
async function chain() {
  if (cached) return cached;
  const connection = new web3.Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
  const raw = process.env.POT_SECRET.trim();
  const secret = raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : (await import("bs58")).default.decode(raw);
  const pot = web3.Keypair.fromSecretKey(secret);
  const mint = new web3.PublicKey(process.env.BLADES_MINT);
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error("The $BLADES mint was not found on chain.");
  // Classic SPL or Token-2022, whichever owns the mint.
  const program = info.owner;
  const { decimals } = await spl.getMint(connection, mint, "confirmed", program);
  const fee = FEE_TOKENS * 10n ** BigInt(decimals);
  cached = { connection, pot, mint, program, decimals, fee };
  return cached;
}

const ata = (c, owner) => spl.getAssociatedTokenAddressSync(c.mint, owner, true, c.program);
const sign = (text) => createHmac("sha256", process.env.PRO_SIGNING_KEY).update(text).digest("base64url");
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** A transaction moving the entry fee from `wallet` to the pot, for the player to sign, and a token proving this server built it. */
async function quote(userId, mode, wallet) {
  const c = await chain();
  const owner = new web3.PublicKey(wallet);
  const from = ata(c, owner), to = ata(c, c.pot.publicKey);
  const held = await c.connection.getTokenAccountBalance(from).then((r) => BigInt(r.value.amount), () => 0n);
  if (held < c.fee) return { error: `This wallet holds less than ${FEE_TOKENS.toLocaleString("en-US")} $BLADES.` };
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
 * Answers the entry row once paid. Sending the same signed transaction twice finds the entry already there.
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
  if (landed === null) return { pending: true, signature };
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

/** Keeps a paid Survival run's result, once, and only within RUN_HOURS of paying. */
async function result(sql, userId, entryId, { wave, kos, fighter, name }) {
  if (!Number.isInteger(wave) || wave < 0 || wave > 999 || !Number.isInteger(kos) || kos < 0 || kos > most(wave)) return { error: "That result is not possible." };
  const [row] = await sql`UPDATE pro_entries SET wave = ${wave}, kos = ${kos}, fighter = ${fighter}, name = ${name}, result_at = now()
    WHERE id = ${entryId} AND user_id = ${userId} AND mode = 'survival' AND status = 'paid' AND result_at IS NULL AND paid_at > now() - make_interval(hours => ${RUN_HOURS})
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

/** Stops new seats in a match once its fight is on (two or more in it). */
const lock = (sql, matchId) => sql`UPDATE pro_matches SET status = 'fighting', locked_at = now() WHERE id = ${matchId} AND status = 'open' AND seats >= 2`;

/**
 * Takes what one entrant's game says of a match's end, and settles the match when it can: every entrant has said,
 * and all name the same winner among them, so the winner is paid the whole pot. Any disagreement holds the match for
 * the operator.
 */
async function report(sql, userId, entryId, winner) {
  const [row] = await sql`UPDATE pro_entries SET report_winner = ${winner}, report_none = ${winner === null}, reported_at = now()
    WHERE id = ${entryId} AND user_id = ${userId} AND mode = 'versus' AND status = 'paid' AND reported_at IS NULL RETURNING match_id`;
  if (!row) return { error: "That seat has already reported, or was not paid for." };
  await lock(sql, row.match_id);
  return { settled: await settleMatch(sql, row.match_id, false) };
}

/** Settles a match if its reports allow: "paid", "held", or null while reports are still to come. `late`: no more are coming. */
async function settleMatch(sql, matchId, late) {
  const entrants = await sql`SELECT id, wallet, amount, report_winner, report_none, reported_at FROM pro_entries WHERE match_id = ${matchId} AND status = 'paid'`;
  const reports = entrants.filter((e) => e.reported_at);
  if (reports.length < entrants.length && !late) return null;
  const pot = entrants.reduce((sum, e) => sum + BigInt(e.amount), 0n);
  const named = new Set(reports.map((e) => (e.report_none ? "none" : String(e.report_winner))));
  const winner = named.size === 1 ? entrants.find((e) => String(e.id) === [...named][0]) : undefined;
  const agreed = winner && entrants.length >= 2 && reports.length === entrants.length;
  const [claimed] = await sql`UPDATE pro_matches SET status = ${agreed ? "settled" : "held"}, settled_at = now(),
      note = ${agreed ? null : `reports ${reports.length}/${entrants.length}: ${[...named].join(", ") || "none"}`}
    WHERE id = ${matchId} AND status IN ('open', 'fighting') RETURNING id`;
  if (!claimed) return null;
  if (!agreed) return "held";
  const [payout] = await sql`INSERT INTO pro_payouts (kind, ref, entry_id, wallet, amount, status) VALUES ('versus', ${String(matchId)}, ${winner.id}, ${winner.wallet}, ${pot.toString()}, 'approved')
    ON CONFLICT (kind, ref) DO NOTHING RETURNING id`;
  if (payout) await send(sql, payout.id);
  return "paid";
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
 * The daily work (api/pro-admin.js, by Vercel cron): each Survival day past its grace gets its winner, held for the
 * operator to approve; a match nobody else joined in an hour is refunded; a fight with reports missing after an hour
 * is held.
 */
async function daily(sql) {
  const done = [];
  const days = await sql`SELECT DISTINCT day FROM pro_entries WHERE mode = 'survival' AND status = 'paid'
    AND day + 1 + make_interval(hours => ${GRACE_HOURS}) < (now() AT TIME ZONE 'utc') AND day NOT IN (SELECT day FROM pro_days) ORDER BY day`;
  for (const { day } of days) {
    const ref = new Date(day).toISOString().slice(0, 10);
    const [{ entries, pot }] = await sql`SELECT count(*)::int AS entries, coalesce(sum(amount), 0)::text AS pot FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = ${ref}`;
    const [best] = await sql`SELECT id, wallet FROM pro_entries WHERE mode = 'survival' AND status = 'paid' AND day = ${ref} AND result_at IS NOT NULL ORDER BY wave DESC, kos DESC, result_at ASC LIMIT 1`;
    if (best) await sql`INSERT INTO pro_payouts (kind, ref, entry_id, wallet, amount, status) VALUES ('survival', ${ref}, ${best.id}, ${best.wallet}, ${pot}, 'held') ON CONFLICT (kind, ref) DO NOTHING`;
    await sql`INSERT INTO pro_days (day) VALUES (${ref}) ON CONFLICT DO NOTHING`;
    done.push({ day: ref, entries, pot, winner: best ? Number(best.id) : null });
  }
  const alone = await sql`UPDATE pro_matches SET status = 'settled', settled_at = now(), note = 'nobody came' WHERE status = 'open' AND seats = 1 AND created_at < now() - interval '1 hour' RETURNING id`;
  for (const { id } of alone) { const [e] = await sql`SELECT id FROM pro_entries WHERE match_id = ${id} AND status = 'paid'`; if (e) await refund(sql, e.id); }
  const stale = await sql`SELECT id FROM pro_matches WHERE status IN ('open', 'fighting') AND seats >= 2 AND created_at < now() - interval '1 hour'`;
  for (const { id } of stale) await settleMatch(sql, id, true);
  return { days: done, refunded: alone.length, held: stale.length };
}

module.exports = { enabled, chain, quote, enter, recheck, result, survivalBoard, lock, report, settleMatch, withdraw, refund, send, retry, daily, FEE_TOKENS, SEATS };

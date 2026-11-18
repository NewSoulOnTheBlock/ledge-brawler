-- Pro mode: paid entries in $BLADES on Robinhood Chain, the pots they make and what is paid out of them (api/_pro.js;
-- the money itself is held by the pot contract, contracts/contracts/BladesPot.sol).
-- Additive only; safe to run more than once against the "five-blades" Neon database.

-- A pro Versus match: one table of the arena server (`pro<id>`), up to five paid seats.
--   open      taking entrants
--   fighting  the arena has begun the fight: no more are seated
--   settled   paid out (or refunded), see pro_payouts
--   held      the arena saw no one left standing, or said nothing within the hour: waits for the operator (api/pro-admin.js)
CREATE TABLE IF NOT EXISTS pro_matches (
  id          bigserial PRIMARY KEY,
  status      text NOT NULL DEFAULT 'open',
  seats       int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  locked_at   timestamptz,
  settled_at  timestamptz,
  note        text
);

-- One paid entry: a Survival run, or a seat in a Versus match. `signature` keys it by what the site handed out to be
-- signed (a hash of its token), so the same entry sent twice is one row.
CREATE TABLE IF NOT EXISTS pro_entries (
  id             bigserial PRIMARY KEY,
  user_id        text   NOT NULL,
  wallet         text   NOT NULL,
  mode           text   NOT NULL CHECK (mode IN ('survival', 'versus')),
  signature      text   NOT NULL UNIQUE,
  amount         bigint NOT NULL,
  status         text   NOT NULL DEFAULT 'pending',   -- pending | paid | failed
  day            date,                                 -- Survival: the UTC day whose pot it is in
  match_id       bigint REFERENCES pro_matches(id),    -- Versus
  created_at     timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz,
  -- Survival: the run's result, posted once.
  name           text,
  fighter        int,
  wave           int,
  kos            int,
  result_at      timestamptz,
  -- No longer written: what entrants' games said of a match's end, before the arena refereed it.
  report_winner  bigint,
  report_none    boolean,
  reported_at    timestamptz
);
CREATE INDEX IF NOT EXISTS pro_entries_day   ON pro_entries (day)      WHERE mode = 'survival';
CREATE INDEX IF NOT EXISTS pro_entries_match ON pro_entries (match_id) WHERE mode = 'versus';

-- Everything paid out of the pot contract. (kind, ref) is unique, so nothing is asked twice (and the contract pays a
-- pot once and gives an entry back once, whatever is asked). `signature` is the payout transaction's hash:
--   survival  ref = the day (YYYY-MM-DD)     versus  ref = the match id     refund  ref = the entry id
--   status    held -> approved -> sending -> sent      (or failed; or void when the operator cancels)
CREATE TABLE IF NOT EXISTS pro_payouts (
  id          bigserial PRIMARY KEY,
  kind        text   NOT NULL,
  ref         text   NOT NULL,
  entry_id    bigint REFERENCES pro_entries(id),
  wallet      text   NOT NULL,
  amount      bigint NOT NULL,
  status      text   NOT NULL,
  signature   text,
  last_valid  bigint,                                  -- no longer written: a Solana transaction's
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  UNIQUE (kind, ref)
);

-- On Robinhood Chain: an entry's transaction, the contract's name for its pot and its number for the entry; and
-- amounts in the token's base units, which with 18 decimals outgrow a bigint.
ALTER TABLE pro_entries ADD COLUMN IF NOT EXISTS tx text;
ALTER TABLE pro_entries ADD COLUMN IF NOT EXISTS pot text;
ALTER TABLE pro_entries ADD COLUMN IF NOT EXISTS chain_entry numeric(78, 0);
ALTER TABLE pro_entries ALTER COLUMN amount TYPE numeric(78, 0);
ALTER TABLE pro_payouts ALTER COLUMN amount TYPE numeric(78, 0);

-- This database's name for itself in the pot contract, made once: every pot it opens is named with it, so a pot of a
-- reset database, or of a preview sharing the contract, is never one this database already opened or paid.
CREATE TABLE IF NOT EXISTS pro_site (
  one  boolean PRIMARY KEY DEFAULT true CHECK (one),
  id   text NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text)
);
INSERT INTO pro_site DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Survival days whose pot has been decided.
CREATE TABLE IF NOT EXISTS pro_days (
  day         date PRIMARY KEY,
  settled_at  timestamptz NOT NULL DEFAULT now()
);

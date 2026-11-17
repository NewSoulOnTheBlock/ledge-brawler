-- Pro mode: paid entries in $BLADES, the pots they make and what is paid out of them (api/_pro.js).
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

-- One paid entry: a Survival run, or a seat in a Versus match. `signature` is the entry transaction's.
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

-- Everything paid out of the pot wallet. (kind, ref) is unique, so nothing can be paid twice:
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
  last_valid  bigint,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  UNIQUE (kind, ref)
);

-- Survival days whose pot has been decided.
CREATE TABLE IF NOT EXISTS pro_days (
  day         date PRIMARY KEY,
  settled_at  timestamptz NOT NULL DEFAULT now()
);

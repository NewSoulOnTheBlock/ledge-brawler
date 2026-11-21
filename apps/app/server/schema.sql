-- The game's own tables: the Survival and daily leaderboards, saved progress, play events (api/track.js) and reports
-- of names. Laid out when the server's database is first made (apps/app/arena/compose.yaml), as they were on Neon
-- before the move; pro mode's tables are in pro.sql.

CREATE TABLE public.daily_scores (
    id integer NOT NULL,
    day date NOT NULL,
    name text NOT NULL,
    wave integer NOT NULL,
    kos integer NOT NULL,
    fighter integer NOT NULL,
    user_id text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE public.daily_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.daily_scores_id_seq OWNED BY public.daily_scores.id;

CREATE TABLE public.events (
    id bigint NOT NULL,
    player text NOT NULL,
    user_id text,
    kind text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;

CREATE TABLE public.game_saves (
    user_id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reports (
    id bigint NOT NULL,
    board text NOT NULL,
    ref bigint NOT NULL,
    reason text,
    reporter text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;

CREATE TABLE public.scores (
    id bigint NOT NULL,
    name text NOT NULL,
    wave integer NOT NULL,
    kos integer NOT NULL,
    fighter smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text,
    CONSTRAINT scores_fighter_check CHECK (((fighter >= 0) AND (fighter <= 4))),
    CONSTRAINT scores_kos_check CHECK (((kos >= 0) AND (kos <= 99999))),
    CONSTRAINT scores_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 16))),
    CONSTRAINT scores_wave_check CHECK (((wave >= 0) AND (wave <= 999)))
);

CREATE SEQUENCE public.scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.scores_id_seq OWNED BY public.scores.id;

ALTER TABLE ONLY public.daily_scores ALTER COLUMN id SET DEFAULT nextval('public.daily_scores_id_seq'::regclass);

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);

ALTER TABLE ONLY public.scores ALTER COLUMN id SET DEFAULT nextval('public.scores_id_seq'::regclass);

ALTER TABLE ONLY public.daily_scores
    ADD CONSTRAINT daily_scores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.game_saves
    ADD CONSTRAINT game_saves_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_board_ref_reporter_key UNIQUE (board, ref, reporter);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);

CREATE INDEX events_at ON public.events USING btree (created_at DESC);

CREATE INDEX events_player_at ON public.events USING btree (player, created_at);

CREATE INDEX idx_daily_scores_day ON public.daily_scores USING btree (day);

CREATE INDEX idx_scores_user_id ON public.scores USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX scores_standing ON public.scores USING btree (wave DESC, kos DESC, created_at);

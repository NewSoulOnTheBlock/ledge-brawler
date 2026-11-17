// spec/app/lobby.md, "Story: Find a match"; spec/app/bout.md, "Story: Fight for the pot"
// The arena server's state: who is connected, the lobby that seats them (spec/app/lobby.md), and at each duel's
// table the bout it referees (spec/app/bout.md). Every change to either goes through the rules' own `enabled` and
// `step`. It does no I/O of its own: serve.ts feeds it what each socket says and the passing of time, and sends what
// it answers; main.vibe gives it the pot (`Pro`). So it runs the same in a test as on the server.
import { healthOf } from "../../gen/app.ts";
import { type Bout, type Event as BoutEvent, alive, enabled as boutAllows, fighterOf, initial as noBout, over, step as boutStep } from "../../gen/app__bout.ts";
import { type Event as LobbyEvent, type Kind as TableKind, type Lobby, enabled as lobbyAllows, hasRoom, initial as noLobby, kindAt, seatsAt, step as lobbyStep } from "../../gen/app__lobby.ts";
import { type BoutWord, type Fields, type FromGame, type Kind, type ToGame, fromGame } from "./protocol.ts";

/** The pot of a pro match, kept by the site (server/api/pro-arena.js). */
export interface Pro {
  /** The pro match a paid entry plays in, once `token` shows it is its owner's; null if it may not play. */
  seat(entry: number, token: string): Promise<{ match: number } | null>;
  /** The match's fight has begun: no more entries are seated in it. */
  fight(match: number): Promise<void>;
  /** How it ended: the winner's entry, or null when no one was left standing. */
  result(match: number, winner: number | null): Promise<void>;
}

export interface Options {
  pro?: Pro;
  /** Milliseconds, for timers; Date.now by default. */
  now?: () => number;
}

/** One socket's way in: what it says, and that it has closed. */
export interface Connection { receive(raw: string): void; closed(): void }

/** How long, in milliseconds: a seat is kept for a player whose connection dropped; the gathering before a first round
 *  and the pause after one; the wait before a pro match's only round, for every paid seat to arrive; and how long a
 *  knocked-out fighter is down (the game's own two seconds, sim.ts). */
const AWAY = 10_000, GATHER = 3_000, BETWEEN = 6_000, PRO_GATHER = 15_000, DOWN = 2_000;
/** How often everyone's fields are told at most, and how many words a player may send in a second. */
const STATE_EVERY = 50, WORDS_PER_SECOND = 120;
/** What a player may land at most, whatever its game says (versus.ts): blows in a second, damage in a second, and how far
 *  from its target it may be seen (the widest special, and the lag between the two pictures). */
const BLOWS = { perSecond: 30, damagePerSecond: 300, reach: 2600 };
/** The game's guard (sim.ts): what it takes before it breaks, how much of a blow still gets through, how fast it mends
 *  (0.15 a step), and how long a broken one is down. */
const GUARD = { most: 40, through: 0.2, mendPerMs: 0.15 * 60 / 1000, broken: 3_000 };
/** A special makes its fighter untouchable while it lasts: never more than this long at once (the longest is under two seconds). */
const SPECIAL_MOST = 2_500;
/** Trained health a game may claim at most (spec/app/index.md, "A fighter can be trained for up to 50 more health, on the select screen"). */
const TRAINED_MOST = 50;

interface Player {
  num: number; id: string; key: string; name: string;
  send: (word: ToGame) => void;
  table: Table | null;
  fields: Fields;
  /** When its connection dropped, while its seat is kept. */
  away: number | null;
  /** A pro seat's paid entry. */
  entry: number | null;
  /** Its fighter as its game last said: where, guarding, in a special or a move, and since when. */
  at: { x: number; y: number; guard: boolean; special: boolean; attacking: number; specialSince: number | null; guardLeft: number; guardBroken: number; heard: number } | null;
  /** When its recent blows landed, and how much each did, for the limits per second. */
  blows: { at: number; dmg: number }[];
  words: number[];
  /** The last blow number its game gave (versus.ts numbers them), so that none is taken twice. */
  lastBlow: number;
}

interface Table {
  num: number; code: string; kind: Kind;
  /** The pro match it is, if it is one. */
  pro: number | null;
  bout: Bout;
  /** When the next round begins, if one is coming. */
  next: number | null;
  /** When each fighter was knocked out, while it is down. */
  down: Map<number, number>;
  /** Fields changed since they were last told, and when they were. */
  changed: boolean; told: number;
  /** The round whose end has been dealt with (the lobby told, the pot settled). */
  ended: number;
  fought: boolean;
}

const kindOf = (kind: Kind): TableKind => (kind === "duel" ? "Duel" : "Group");
const word = (raw: unknown) => (typeof raw === "string" ? raw.split(",") : []);

export function createArena(options: Options = {}) {
  const now = options.now ?? Date.now;
  let lobby: Lobby = noLobby;
  let nextPlayer = 1;
  const players = new Map<number, Player>(), tables = new Map<number, Table>(), codes = new Map<string, number>();

  /** The lobby after `event` from `by`, or false where its rules refuse it. */
  function inLobby(event: LobbyEvent, by: number): boolean {
    if (!lobbyAllows(lobby, event, by)) return false;
    lobby = lobbyStep(lobby, event, by);
    return true;
  }
  /** The table's bout after `event` from `by`, or false where its rules refuse it. */
  function inBout(table: Table, event: BoutEvent, by: number): boolean {
    if (!boutAllows(table.bout, event, by)) return false;
    table.bout = boutStep(table.bout, event, by);
    return true;
  }

  const seatedAt = (table: Table) => seatsAt(table.num, lobby).map((num) => players.get(num)!).filter(Boolean);
  const tell = (table: Table, said: ToGame, but?: Player) => { for (const p of seatedAt(table)) if (p !== but && p.away === null) p.send(said); };
  const newCode = () => { for (;;) { const code = Math.random().toString(36).slice(2, 8); if (!codes.has(code)) return code; } };

  function boutWord(table: Table): BoutWord {
    const b = table.bout, t = now(), fighters: BoutWord["fighters"] = {};
    for (const num of b.seated) { const f = fighterOf(num, b); fighters[String(num)] = { hp: f.hp, most: f.most, lives: f.lives, kos: f.kos }; }
    const ended = over(b), left = b.seated.find((num) => alive(num, b));
    return { round: b.round, fighting: b.fighting && !ended, over: ended, winner: ended && left !== undefined ? String(left) : null, next: table.next === null ? null : Math.max(0, table.next - t), fighters };
  }
  const tellBout = (table: Table) => { if (table.kind === "duel") tell(table, { t: "bout", bout: boutWord(table) }); };

  /** Seats `p` at `table`, which the lobby has just seated it at. */
  function sitDown(p: Player, table: Table, most: number) {
    p.table = table;
    if (table.kind === "duel") inBout(table, { type: "sit", id: p.num, most }, p.num);
    p.send({ t: "seated", id: p.id, key: p.key, code: table.code, kind: table.kind, pro: table.pro !== null });
    p.send({ t: "state", players: everyone(table) });
    table.changed = true;
    tellBout(table);
  }
  function openTable(kind: Kind, code: string, pro: number | null): Table {
    const table: Table = { num: lobby.next - 1, code, kind, pro, bout: noBout, next: null, down: new Map(), changed: true, told: 0, ended: 0, fought: false };
    tables.set(table.num, table); codes.set(code, table.num);
    return table;
  }
  const everyone = (table: Table) => Object.fromEntries(seatedAt(table).map((p) => [p.id, p.fields]));

  /** Takes `p` from its table for good: from the lobby, and from the bout, where leaving may end the round. */
  function standUp(p: Player) {
    const table = p.table;
    p.table = null; players.delete(p.num);
    if (!table) return;
    inLobby({ type: "leave", table: table.num }, p.num);
    if (table.kind === "duel") { inBout(table, { type: "stand", id: p.num }, p.num); table.down.delete(p.num); }
    tell(table, { t: "left", id: p.id });
    if (!lobby.tables.includes(table.num)) { tables.delete(table.num); codes.delete(table.code); return; }
    table.changed = true;
    settle(table);
    tellBout(table);
  }

  // spec/app/lobby.md, "A player looking for a match sits at an open table of that kind with a free seat, or, only when there is none, opens a new one"
  /** The open table of `kind` matchmaking puts a player at: the fullest with a seat free, so that a round starts soonest. */
  function matched(kind: Kind): number {
    const free = lobby.open.filter((t) => kindAt(t, lobby) === kindOf(kind) && hasRoom(t, lobby));
    return free.sort((a, b) => seatsAt(b, lobby).length - seatsAt(a, lobby).length || a - b)[0] ?? lobby.next;
  }

  async function seek(p: Player, ask: Extract<FromGame, { t: "seek" }>) {
    if (p.table) return;
    // Trained health counts, up to what training can give; a fighter that is not one of the five is the first.
    const most = healthOf(ask.fighter >= 0 && ask.fighter <= 4 ? ask.fighter : 0) + Math.max(0, Math.min(TRAINED_MOST, ask.vigor));
    p.name = ask.name;
    if (ask.pro) {
      if (ask.kind !== "duel" || !options.pro) return p.send({ t: "refused", why: "pro", message: "Pro matches are not open." });
      if ([...players.values()].some((other) => other.entry === ask.pro!.entry)) return p.send({ t: "refused", why: "pro", message: "That entry is already seated." });
      const seat = await options.pro.seat(ask.pro.entry, ask.pro.token).catch(() => null);
      if (!players.has(p.num) || p.table) return;
      // Asked twice at once for the same entry: the first to come back takes the seat.
      if ([...players.values()].some((other) => other.entry === ask.pro!.entry)) return p.send({ t: "refused", why: "pro", message: "That entry is already seated." });
      if (!seat) return p.send({ t: "refused", why: "pro", message: "That entry cannot play: it is not paid, not yours, or its match is over." });
      p.entry = ask.pro.entry;
      return atCode(p, `pro${seat.match}`, "duel", most, seat.match);
    }
    // A pro match's table is reached only by paying for a seat at it.
    if (ask.code?.startsWith("pro")) return p.send({ t: "refused", why: "pro", message: "A pro match is entered by paying for it." });
    if (ask.code) return atCode(p, ask.code, ask.kind, most, null);
    const table = matched(ask.kind);
    if (!inLobby({ type: "seek", kind: kindOf(ask.kind), table }, p.num)) return p.send({ t: "refused", why: "bad", message: "No seat could be found." });
    sitDown(p, tables.get(table) ?? openTable(ask.kind, newCode(), null), most);
  }
  // spec/app/lobby.md, "A player with an invitation opens a private table, or sits at the table it names while it has a free seat"
  function atCode(p: Player, code: string, kind: Kind, most: number, pro: number | null) {
    const at = codes.get(code);
    if (at === undefined) {
      if (!inLobby({ type: "host", kind: kindOf(kind) }, p.num)) return p.send({ t: "refused", why: "bad", message: "No seat could be found." });
      return sitDown(p, openTable(kind, code, pro), most);
    }
    const table = tables.get(at)!;
    if (table.kind !== kind) return p.send({ t: "refused", why: "bad", message: "That code is another kind of table." });
    if (!inLobby({ type: "invite", table: at }, p.num)) return p.send({ t: "refused", why: "full", message: "That table is full." });
    sitDown(p, table, most);
  }

  /** Gives `p`'s connection the seat `id`, if `key` is its key: a connection that dropped, or one that has not yet
   *  been seen to drop, whose words from then on go nowhere. */
  function resume(p: Player, id: string, key: string) {
    const was = players.get(Number(id));
    if (!was || was === p || was.key !== key || !was.table) return false;
    was.send = p.send; was.away = null;
    players.delete(p.num);
    Object.assign(p, was);
    players.set(was.num, p);
    p.send({ t: "seated", id: p.id, key: p.key, code: p.table!.code, kind: p.table!.kind, pro: p.table!.pro !== null });
    p.send({ t: "state", players: everyone(p.table!) });
    tellBout(p.table!);
    return true;
  }

  /** What a player's fields say of its fighter, for the referee: its packed state (versus.ts), read as far as needed. */
  function heard(p: Player, f: Fields) {
    if (typeof f.s !== "string") return;
    const v = word(f.s), t = now(), was = p.at;
    const x = Number(v[0]), y = Number(v[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const special = !!v[14], attacking = v[12]?.startsWith("m:") || special ? t : was?.attacking ?? 0;
    const guard = v[9] === "1";
    // The guard mends while it is not held, at the game's pace, and gives way only to what it takes (`strike`).
    const guardLeft = was ? Math.min(GUARD.most, was.guardLeft + (guard ? 0 : (t - was.heard) * GUARD.mendPerMs)) : GUARD.most;
    p.at = { x, y, guard, special, attacking, specialSince: special ? was?.specialSince ?? t : null, guardLeft, guardBroken: was?.guardBroken ?? 0, heard: t };
  }

  // spec/app/bout.md, "A blow lands only between two different fighters who are both standing, in a round that is not over, and does from 1 to 60"
  // spec/app/bout.md, "A blow that takes the last health knocks its fighter out: a life is lost, and the striker scores a knockout"
  /** A blow `by`'s game says it landed. Landed here only if it could have been: then its target's game is told. */
  function strike(by: Player, data: unknown) {
    const table = by.table;
    if (!table || table.kind !== "duel" || typeof data !== "object" || data === null) return;
    const d = data as Record<string, unknown>, t = now();
    const target = players.get(Number(d.to));
    if (!target || target.table !== table || target === by || d.round !== table.bout.round) return;
    if (typeof d.n === "number") { if (d.n <= by.lastBlow) return; by.lastBlow = d.n; }
    const a = by.at, b = target.at;
    // Seen within reach of each other, and the striker in a move, a special or just after one.
    if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) > BLOWS.reach || t - a.attacking > 2_000) return;
    // A special makes its fighter untouchable, for as long as one can last.
    if (b.special && b.specialSince !== null && t - b.specialSince < SPECIAL_MOST) return;
    by.blows = by.blows.filter((blow) => t - blow.at < 1000);
    const raw = typeof d.dmg === "number" && Number.isFinite(d.dmg) ? d.dmg : 0;
    let dmg = Math.round(Math.max(1, Math.min(60, raw)));
    if (by.blows.length >= BLOWS.perSecond || by.blows.reduce((sum, blow) => sum + blow.dmg, 0) + dmg > BLOWS.damagePerSecond) return;
    // A held guard takes most of a blow, until it has taken too much and breaks, taking nothing of the blow that breaks it.
    if (b.guard && t >= b.guardBroken) {
      b.guardLeft -= dmg;
      if (b.guardLeft <= 0) { b.guardLeft = GUARD.most; b.guardBroken = t + GUARD.broken; return; }
      dmg = Math.max(1, Math.round(dmg * GUARD.through));
    }
    if (!inBout(table, { type: "strike", target: target.num, dmg }, by.num)) return;
    by.blows.push({ at: t, dmg });
    if (fighterOf(target.num, table.bout).hp === 0) table.down.set(target.num, t);
    // The target's game takes the push, and the health the server took: never more, so that it is never below the
    // server's, and the bout it is told next brings it to the server's (versus.ts).
    target.send({ t: "said", type: "hit", from: by.id, data: { ...d, dmg } });
    settle(table);
    tellBout(table);
  }

  // spec/app/bout.md, "A fall off the islands costs a standing fighter 25 health, and may knock it out, with no knockout scored"
  function fell(p: Player) {
    const table = p.table;
    if (!table || table.kind !== "duel" || !inBout(table, { type: "plunge", id: p.num }, p.num)) return;
    if (fighterOf(p.num, table.bout).hp === 0) table.down.set(p.num, now());
    settle(table);
    tellBout(table);
  }

  // spec/app/bout.md, "A round is over when at most one fighter has lives left"
  /** What follows the end of a round, once: the table takes players again, and a pro match's pot is settled. */
  function settle(table: Table) {
    if (table.kind !== "duel" || !over(table.bout) || table.ended === table.bout.round) return;
    table.ended = table.bout.round;
    table.down.clear();
    if (table.pro === null) {
      if (lobby.listed.includes(table.num)) inLobby({ type: "reopen", table: table.num }, -1);
      return;
    }
    const left = table.bout.seated.find((num) => alive(num, table.bout));
    void options.pro?.result(table.pro, left === undefined ? null : players.get(left)?.entry ?? null).catch(() => undefined);
  }

  function receive(p: Player, raw: string) {
    const t = now();
    p.words = p.words.filter((at) => t - at < 1000);
    if (p.words.length >= WORDS_PER_SECOND || raw.length > 8192) return;
    p.words.push(t);
    const said = fromGame(raw);
    if (!said) return;
    if (said.t === "seek") {
      if (said.resume && resume(p, said.resume.id, said.resume.key)) return;
      void seek(p, said);
      return;
    }
    const table = p.table;
    if (!table) return;
    switch (said.t) {
      case "set":
        Object.assign(p.fields, said.f);
        heard(p, said.f);
        table.changed = true;
        return;
      case "say":
        // At a duel's table the server lands every blow, and counts every knockout itself.
        if (table.kind === "duel" && said.type === "hit") return strike(p, said.data);
        if (table.kind === "duel" && said.type === "ko") return;
        if (table.kind === "duel" && said.type === "orb" && p.at) p.at.attacking = t;
        return tell(table, { t: "said", type: said.type, from: p.id, data: said.data }, p);
      case "fell": return fell(p);
      case "again":
        if (table.kind === "duel" && table.pro === null && over(table.bout) && table.next !== null) table.next = Math.min(table.next, t + 1000);
        return;
      case "leave": return standUp(p);
    }
  }

  /** Once every few milliseconds: seats given up, rounds begun, fighters back on their feet, and fields told. */
  function tick() {
    const t = now();
    for (const p of [...players.values()]) if (p.away !== null && t - p.away > AWAY) standUp(p);
    for (const table of tables.values()) {
      if (table.kind === "duel") rounds(table, t);
      else gathering(table);
      if (table.changed && t - table.told >= STATE_EVERY) { table.changed = false; table.told = t; tell(table, { t: "state", players: everyone(table) }); }
    }
  }
  // spec/app/bout.md, "A round begins between two or more, when no round is being fought, and gives everyone full health and three lives"
  // spec/app/bout.md, "A knocked-out fighter with lives left comes back with its most health"
  function rounds(table: Table, t: number) {
    const b = table.bout, idle = !b.fighting || over(b);
    // A pro match is one round, for its pot.
    if (idle && (table.pro === null || !table.fought) && b.seated.length >= 2) {
      if (table.next === null) { table.next = t + (table.pro !== null ? PRO_GATHER : b.round ? BETWEEN : GATHER); tellBout(table); }
      else if (t >= table.next && inBout(table, { type: "begin" }, -1)) {
        table.next = null; table.fought = true;
        if (lobby.open.includes(table.num)) inLobby({ type: "close", table: table.num }, -1);
        for (const p of seatedAt(table)) if (p.at) Object.assign(p.at, { guardLeft: GUARD.most, guardBroken: 0, specialSince: null });
        if (table.pro !== null) void options.pro?.fight(table.pro).catch(() => undefined);
        tellBout(table);
      }
    } else if (idle && table.next !== null) { table.next = null; tellBout(table); }
    for (const [num, since] of table.down) {
      if (t - since < DOWN) continue;
      table.down.delete(num);
      if (inBout(table, { type: "rise", id: num }, num)) tellBout(table);
    }
  }
  /** A co-op table stops taking players from matchmaking while its group plays a level, and takes them again after. */
  function gathering(table: Table) {
    if (!lobby.listed.includes(table.num)) return;
    const playing = seatedAt(table).some((p) => typeof p.fields.E === "number" && p.fields.E > 0), open = lobby.open.includes(table.num);
    if (playing && open) inLobby({ type: "close", table: table.num }, -1);
    else if (!playing && !open) inLobby({ type: "reopen", table: table.num }, -1);
  }

  return {
    /** A new socket: `send` is how to answer it. */
    connect(send: (said: ToGame) => void): Connection {
      const num = nextPlayer++;
      const p: Player = { num, id: String(num), key: crypto.randomUUID(), name: "Player", send, table: null, fields: {}, away: null, entry: null, at: null, blows: [], words: [], lastBlow: -1 };
      players.set(num, p);
      return {
        receive: (raw) => { const current = players.get(p.num); if (current) receive(current, raw); },
        closed: () => {
          const current = players.get(p.num);
          if (!current || current.send !== send) return;
          if (current.table) current.away = now(); else players.delete(current.num);
        },
      };
    },
    tick,
    /** How many are connected and seated, and at how many tables: for the health check. */
    stats: () => ({ players: players.size, tables: tables.size, seated: lobby.seated.length }),
  };
}
export type Arena = ReturnType<typeof createArena>;

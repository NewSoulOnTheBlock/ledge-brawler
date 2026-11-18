// spec/app/index.md, "Story: Fight other players"; spec/app/bout.md, "Story: Fight for the pot"; spec/app/lobby.md, "Story: Find a match"
// The other players of a duel, at a table of the arena server (arena/arena.ts, reached through arena/link.ts). Every
// player's game runs its own fighter and says where it is twenty times a second. A blow is found by the game of the
// one who threw it and sent to the server, which keeps everyone's health, lives and knockouts (spec/app/bout.md): it
// lands the blow only if it could have landed, tells the game of the one it landed on, which takes the push, and says
// who has won. Rounds begin when the server says, every few seconds while two or more are at the table.
import { CHARS } from "./game/data.ts";
import { outfitOf } from "./game/relics.ts";
import { type Level, VERSUS_STAGES } from "./game/levels.ts";
import type { Game, Hurt, Peer, Rules, Shot, Sprite } from "./game/sim.ts";
import { SKY_IDS, type SkyId } from "./game/sky.ts";
import { type Room, Refused, joinArena } from "./arena/link.ts";
import type { BoutWord, ProSeat } from "./arena/protocol.ts";
import { type Word, pack, unpack, wordOf } from "./arena/word.ts";

/** How often a fighter says where it is; and how far into the past the others are drawn, at least and at most: as far
 *  as the jitter on the way needs, so that there is always a place heard of on each side of the moment drawn. */
const SAY_EVERY = 50, STILL_EVERY = 200, BEHIND_LEAST = 60, BEHIND_MOST = 260;
/** How long a fighter may be drawn going on as it was going once nothing newer has come, and how long a correction takes to fade. */
const GUESS_MOST = 150, MEND = 90;
/** A player not heard from for this long is shown as lagging, and for this long is taken to be gone. */
const QUIET = 2500, GONE = 8000;
/** How often each game asks the others how long a word takes there and back. */
const PING_EVERY = 2000;
/** How long a fighter out of lives lies down in a duel's practice, before it starts again. */
const OUT_FOR = 2000;
/** What a blow told of by a co-op host's game may be at most, whatever it says (a duel's are the server's to judge):
 *  no move in the game does more, throws harder, or stuns longer; how far from the one it lands on its thrower may be
 *  seen; and how many may land in a second. */
const BLOW = { dmg: 60, push: 30, stun: 150, reach: 2600, perSecond: 25 };
/** How many fight at one table: one for each of the five blades. */
export const SEATS = 5;

/** A player at the table, for the list on screen. In a duel its lives, knockouts and whether it stands are the
 *  server's (spec/app/bout.md): lives count down from three, and none left is out. */
export interface Rival { id: string; name: string; fighter: number; lives: number; alive: boolean; kos: number; me: boolean;
  /** How long a word takes to them and back, in milliseconds, once it has been measured; and whether they have gone quiet. */
  ping?: number; quiet?: boolean }
export interface Standing {
  rivals: Rival[];
  /** `starting`: two or more are at the table and the next round begins in `startsIn` milliseconds; `waiting`: this
   *  player sat down during a round, and fights from the next. */
  status: "joining" | "alone" | "starting" | "waiting" | "fighting" | "over" | "reconnecting" | "offline" | "full";
  winner?: string; startsIn?: number }
export interface Versus {
  /** The table's code, which an invitation carries. */
  code: string;
  /** Once a frame, before the game's own: places the others, says where this fighter is, and starts the rounds the server begins. */
  tick(): void;
  strike(to: string, blow: Hurt): void; shot(orb: Shot): void;
  /** The fighter has fallen off the islands: the server takes its fall. */
  fell(): void;
  /** Tells the others of an effect that played here. */
  fx(sprite: Omit<Sprite, "age">): void;
  /** Asks for the next round as soon as it can begin, once this one has been won. */
  again(): void;
  leave(): void;
}

/** The room code in the page's address, or the open room. */
export const roomCode = () => (new URLSearchParams(location.search).get("room") ?? "open").replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase() || "open";
/**
 * The sky of a room's round. Every player's game works it out for itself from the room, the round and the time to
 * the nearest ten minutes, so they agree without anything being sent; a new round, or the same room later, has another.
 */
export function skyFor(code: string, round: number): SkyId {
  let hash = Math.floor(Date.now() / 600000) + round * 7919;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SKY_IDS[hash % SKY_IDS.length];
}
/** The place of `code`'s round, under its sky: chosen from the room and the round alone (never the clock), so that
 *  every player in the room fights in the same one, and the next round, in the next. */
export function stageFor(code: string, round: number): Level {
  let hash = round * 7919;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { ...VERSUS_STAGES[(hash + round) % VERSUS_STAGES.length], sky: skyFor(code, round) };
}

/** A link that brings whoever opens it to `code`'s room. */
export const inviteLink = (code: string) => `${location.origin}${location.pathname}?room=${code}`;

/** What a co-op group (together.ts) adds to a room: its own words, heard and said each frame, and which of its levels is
 *  being played, which stands for a duel's round (a fighter is drawn only by those playing the same one). */
export interface RoomLink {
  attach(room: Room, me: string): void;
  tick(room: Room, me: string, now: number): void;
  /** The number of the level the group is playing, from 1; 0 while it is choosing one. */
  epoch(): number;
}

/** Takes a seat as `name`, for the duel `rules` has just started in `game` (`staged`: in one of the duel's places,
 *  stageFor): at the table `code`, or, for "open" (or none), wherever matchmaking finds room. With `pro`, it is a pro match's seat (pro.ts), whose table only paid
 *  entries reach. With `link`, it is a co-op group's table (together.ts): no rounds and no winner, and fighters are
 *  said only while a level is played. Fails with "full" when the table named is full. */
export async function joinVersus(code: string | undefined, name: string, staged: boolean, game: Game, rules: Rules, onStanding: (standing: Standing) => void, pro?: ProSeat, link?: RoomLink): Promise<Versus> {
  let fighter = rules.get().fighter;
  const room: Room = await joinArena({ kind: link ? "group" : "duel", name, fighter, vigor: rules.get().vigor, code: code === "open" ? undefined : code, pro })
    .catch((error: unknown) => { throw error instanceof Refused && error.why === "full" ? new Error("full") : error; });
  /** This game's id at the table; a seat lost and taken afresh has another. */
  let me = room.sessionId;
  /** Everyone at the table who has said where they are, by their id. */
  let words = new Map<string, Word & { name: string; fighter: number; outfit?: string }>();
  /** Each of the others as it has been heard of: what it said, by its own clock, for the last second and a half; how
   *  much later than it was said each word came, from which the gap between the clocks and the jitter are found; how
   *  far in the past it is drawn just now; and what is left of the last correction to where it is drawn. */
  const track = new Map<string, { words: Word[]; late: number[]; behind: number; mend: { x: number; y: number }; drawn: number }>();
  /** When each player last said something new, by this game's clock; and how long a word takes to each and back. */
  const heardAt = new Map<string, number>(), pings = new Map<string, number>();
  let pinged = 0;
  /** Whether a player is still to be counted: heard from lately, or this game's own. */
  const here = (id: string, now: number) => id === me || now - (heardAt.get(id) ?? now) < GONE;
  /** The round this game is fighting: a duel's is the server's, a co-op group's its level's. */
  let round = 0, said = 0, told = 0, online = true, lost = false, gone = false, spare = 20, spent = performance.now();
  /** When this fighter was last seen out of lives with no round of the server's being fought here, or 0. */
  let outSince = 0;
  /** How the server last said the bout stands, at a duel's table, and when this game heard it. */
  let bout: BoutWord | null = null, boutAt = 0;
  /** What was last said of this fighter, without its time. */
  let lastSaid = "";

  const blows = new Map<string, { last: number; recent: number[] }>();
  /** How many blows this game has told of, so that each can be told apart. */
  let thrown = 0;
  /** Listens to `room`: what it holds, who leaves it, what the others tell, and the connection coming and going. */
  function attach() {
    room.me.set({ n: name, f: fighter, o: outfitOf(fighter).id });
    room.onState((state) => {
      // The first word from a table that nobody has written to has no players in it yet.
      const now = performance.now(), next = new Map<string, Word & { name: string; fighter: number; outfit?: string }>();
      for (const [id, p] of Object.entries(state.entities?.players ?? {})) {
        const w = unpack(p);
        if (!w) continue;
        next.set(id, { ...w, name: String(p.n ?? "?"), fighter: Number(p.f ?? 0), outfit: typeof p.o === "string" ? p.o : undefined });
        if (id === me) continue;
        const sent = w.sent ?? now;
        let t = track.get(id);
        if (!t) track.set(id, t = { words: [], late: [], behind: 120, mend: { x: 0, y: 0 }, drawn: now });
        const newest = t.words[t.words.length - 1];
        if (newest && sent <= (newest.sent ?? 0)) continue;
        // A word that comes while the fighter is being drawn going on past the last one moves where it is drawn: the
        // difference is kept, to fade, so that it slides into place and does not jump.
        const before = newest ? place(t, now) : null;
        t.words.push({ ...w, sent });
        heardAt.set(id, now);
        t.late.push(now - sent);
        while (t.words.length > 2 && sent - (t.words[0].sent ?? 0) > 1500) t.words.shift();
        if (t.late.length > 60) t.late.shift();
        if (before) {
          const after = place(t, now), dx = before.x - after.x, dy = before.y - after.y;
          // A fighter that has come back to life somewhere else is shown there at once.
          if (Math.hypot(dx, dy) < 300) { t.mend.x += dx; t.mend.y += dy; } else t.mend = { x: 0, y: 0 };
        }
      }
      words = next;
      for (const id of track.keys()) if (!words.has(id)) track.delete(id);
    });
    // A blow on this fighter. At a duel's table the server has judged it already (spec/app/bout.md, "A blow lands only
    // between two different fighters who are both standing, in a round that is not over, and does from 1 to 60"); at a
    // co-op table it is the host's game's, and taken unless it cannot be right: told twice, from someone gone, from
    // much too far away, or one of too many.
    room.on("hit", (data: Hurt & { to: string; n?: number; round?: number }, from) => {
      if (data.to !== me) return;
      const now = performance.now(), by = blows.get(from) ?? { last: -1, recent: [] }, thrower = words.get(from), hero = game.scene.hero;
      blows.set(from, by);
      if (data.n !== undefined) { if (data.n <= by.last) return; by.last = data.n; }
      if (link) {
        if (!here(from, now) || (data.round !== undefined && data.round !== round)) return;
        if (thrower && hero && Math.hypot(thrower.x - hero.body.position.x, thrower.y - hero.body.position.y) > BLOW.reach) return;
        by.recent = by.recent.filter((t) => now - t < 1000);
        if (by.recent.length >= BLOW.perSecond) return;
        by.recent.push(now);
      }
      const within = (v: unknown, most: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-most, Math.min(most, v)) : 0);
      game.struck(from, { dmg: Math.max(0, within(data.dmg, BLOW.dmg)), kx: within(data.kx, BLOW.push), ky: within(data.ky, BLOW.push), stun: data.stun === undefined ? undefined : Math.max(0, within(data.stun, BLOW.stun)),
        heavy: !!data.heavy, float: !!data.float, from: within(data.from, 1) });
    });
    room.on("orb", (data: Shot & { round?: number }) => { if (data.round === undefined || data.round === round) game.shot(data); });
    room.on("fx", (data: Omit<Sprite, "age">) => game.fx(data));
    // spec/app/bout.md, "A round is over when at most one fighter has lives left"
    // The bout as the server keeps it: this fighter's health is held to the server's.
    room.onBout((word) => {
      bout = word; boutAt = performance.now();
      const mine = word.fighters[me];
      if (mine && word.fighting && word.round === round) game.heldTo(mine.hp);
    });
    // Someone who leaves is gone at once, from the fight and from the list.
    room.onLeave((id) => { words.delete(id); track.delete(id); heardAt.delete(id); pings.delete(id); });
    room.on("ping", (data: { t: number }, from) => room.send("pong", { to: from, t: data.t }));
    room.on("pong", (data: { to: string; t: number }, from) => {
      if (data.to !== me) return;
      const took = performance.now() - data.t, was = pings.get(from);
      pings.set(from, was === undefined ? took : was * 0.7 + took * 0.3);
    });
    room.onDisconnect(() => { online = false; });
    // Back at the table, in the same seat or, if it was given up, a new one: say where this fighter is at once.
    room.onReconnect(() => { online = true; me = room.sessionId; said = 0; });
    // The seat could not be taken back: this game fights the stand-in alone from now on.
    room.onLost(() => { online = false; lost = true; words = new Map(); track.clear(); });
    link?.attach(room, me);
  }
  attach();
  const bye = () => { void leave(); };
  globalThis.addEventListener?.("pagehide", bye);

  function leave() {
    if (gone) return;
    gone = true;
    globalThis.removeEventListener?.("pagehide", bye);
    game.peers([]);
    return room.leave();
  }

  /** Where a fighter is to be drawn at `now`, and what it was saying then: `behind` in the past by its own clock,
   *  between the two words on either side of that moment, along the curve their speeds make; or, past the last
   *  word, going on as it was for a little while, and then standing. */
  function place(t: { words: Word[]; late: number[]; behind: number }, now: number) {
    const gap = Math.min(...t.late), when = now - gap - t.behind, all = t.words;
    let i = all.length - 1;
    while (i > 0 && (all[i].sent ?? 0) > when) i--;
    const a = all[i], b = all[i + 1], step = 1000 / 60;
    if (!b) {
      const ahead = Math.max(0, Math.min(GUESS_MOST, when - (a.sent ?? 0)));
      return { x: a.x + (a.vx / step) * ahead, y: a.y + (a.vy / step) * ahead, w: a };
    }
    const span = Math.max(1, (b.sent ?? 0) - (a.sent ?? 0)), k = Math.max(0, Math.min(1, (when - (a.sent ?? 0)) / span));
    // Hermite: the two places, and the speeds at each, in pixels across the span.
    const h = (p0: number, p1: number, v0: number, v1: number) => {
      const k2 = k * k, k3 = k2 * k, m0 = (v0 / step) * span, m1 = (v1 / step) * span;
      return (2 * k3 - 3 * k2 + 1) * p0 + (k3 - 2 * k2 + k) * m0 + (-2 * k3 + 3 * k2) * p1 + (k3 - k2) * m1;
    };
    return { x: h(a.x, b.x, a.vx, b.vx), y: h(a.y, b.y, a.vy, b.vy), w: k < 0.5 ? a : b };
  }

  /** The server's round, being fought or just over; 0 before the first. */
  const serverRound = () => (bout && (bout.fighting || bout.over) ? bout.round : 0);
  /** Whether this game sat down during the server's round, or was not ready when it began, and waits for the next. */
  const benched = () => !link && serverRound() > round;
  function others(now: number): Peer[] {
    const list: Peer[] = [];
    // spec/app/bout.md, "A fighter sits down once, while there is a seat, with its most health"
    // A round is fought by those in it: a game waiting for the next sees none of them, and fights the stand-in
    // meanwhile; and none of them sees it, so nobody goes for a fighter no blow can reach.
    if (lost || benched()) return list;
    for (const [id, w] of words) {
      const t = track.get(id);
      if (id === me || !t?.words.length || !here(id, now) || w.round !== (link ? round : serverRound())) continue;
      // How far in the past to draw it: enough to cover how unevenly its words come, eased towards that so that time
      // never jumps for it.
      const sorted = [...t.late].sort((p, q) => p - q), spread = sorted[Math.floor(sorted.length * 0.9)] - sorted[0];
      const want = Math.max(BEHIND_LEAST, Math.min(BEHIND_MOST, spread + SAY_EVERY * 0.6));
      const dt = Math.min(100, now - t.drawn); t.drawn = now;
      t.behind += (want - t.behind) * Math.min(1, dt / 1500);
      const fade = Math.exp(-dt / MEND); t.mend.x *= fade; t.mend.y *= fade;
      const p = place(t, now), then = p.w;
      list.push({ id, name: w.name, fighter: w.fighter, outfit: w.outfit, x: p.x + t.mend.x, y: p.y + t.mend.y, vx: then.vx, vy: then.vy, facing: then.facing, hp: w.hp, lives: w.lives, alive: w.alive, glow: then.glow, guard: then.guard, at: then.at, over: w.over, special: then.special });
    }
    return list;
  }

  return {
    get code() { return room.code; },
    tick() {
      if (gone) return;
      const now = performance.now(), match = rules.get(), hero = game.scene.hero;
      if (link) round = link.epoch();
      // spec/app/bout.md, "A round begins between two or more, when no round is being fought, and gives everyone full health and three lives"
      // A round the server has begun: every game at the table starts it afresh, under the round's sky; one that sat
      // down after it began waits for the next (spec/app/bout.md, "A fighter sits down once, while there is a seat, with its most health").
      // A game that cannot start it this moment (its pause is open) starts it as soon as it can.
      else if (bout && bout.fighting && bout.round > round && (bout.fighters[me]?.lives ?? 0) > 0 && (!staged || rules.send({ type: "rematch" }))) {
        round = bout.round; said = 0;
        if (staged) game.begin(stageFor(room.code, round));
      }
      // With no round of the server's fought here (alone, before one, or waiting for the next) the duel is practice
      // against the stand-in: a fighter out of lives lies down a moment, then it starts again, never down for good.
      const practice = !link && !(round > 0 && serverRound() === round);
      if (staged && practice && !match.alive && match.lives === 1) {
        outSince ||= now;
        if (now - outSince > OUT_FOR && rules.send({ type: "rematch" })) { outSince = 0; game.begin(stageFor(room.code, round)); }
      } else outSince = 0;
      game.peers(others(now));
      // In co-op a fighter is said only while its level is played.
      if (hero && (!link || (round > 0 && match.screen === "Play")) && now - said >= SAY_EVERY) {
        if (match.fighter !== fighter) { fighter = match.fighter; room.me.set({ f: fighter, o: outfitOf(fighter).id }); }
        const word = wordOf(game, match, round, bout?.fighters[me]?.kos ?? 0);
        // A fighter that has not changed is said again only five times a second, to show it is still there: what
        // changes, blows and effects, needs the connection more.
        const same = pack(word);
        if (same !== lastSaid || now - said >= STILL_EVERY) { said = now; lastSaid = same; room.me.set({ s: pack({ ...word, sent: now }) }); }
      }
      if (now - pinged > PING_EVERY) { pinged = now; room.send("ping", { t: now }); }
      link?.tick(room, me, now);
      if (now - told > 250) {
        told = now;
        // In a duel who stands, with how many lives and knockouts, is the server's; the names and the signal are each game's.
        const seated = [...words].filter(([id]) => here(id, now) && (link || !bout || id in bout.fighters));
        const rivals = seated.map(([id, w]) => {
          const kept = link ? undefined : bout?.fighters[id];
          return { id, name: w.name, fighter: w.fighter, lives: kept ? kept.lives : w.lives, alive: kept ? kept.hp > 0 : w.alive, kos: kept ? kept.kos : w.kos, me: id === me,
            ping: pings.has(id) ? Math.round(pings.get(id)!) : undefined, quiet: id !== me && now - (heardAt.get(id) ?? now) > QUIET };
        });
        const ended = !link && !!bout?.over, startsIn = bout?.next === null || bout?.next === undefined ? undefined : Math.max(0, bout.next - (now - boutAt));
        // A game waiting for the next round is not told how this one ended: it was not in it.
        onStanding({
          rivals, startsIn,
          status: lost ? "offline" : !online ? "reconnecting" : benched() ? "waiting" : ended ? "over" : rivals.length < 2 ? "alone" : link || bout?.fighting ? "fighting" : "starting",
          winner: ended && bout?.winner ? words.get(bout.winner)?.name ?? "?" : undefined,
        });
      }
    },
    strike: (to, blow) => room.send("hit", { to, n: ++thrown, round, dmg: Math.round(blow.dmg * 10) / 10, kx: blow.kx, ky: blow.ky, stun: blow.stun, heavy: blow.heavy, float: blow.float, from: blow.from }),
    shot: (orb) => room.send("orb", { ...orb, round }),
    fell: () => room.fell(),
    // No more than twenty a second: where the fighter is comes first.
    fx: (sprite) => { const now = performance.now(); spare = Math.min(20, spare + (now - spent) * 0.02); spent = now; if (spare >= 1) { spare--; room.send("fx", sprite); } },
    again: () => room.again(),
    leave: () => { void leave(); },
  };
}

/** A name for a player who has not been asked for one: the fighter's, and three digits to tell two of them apart. */
export const nameFor = (fighter: number) => `${CHARS[fighter].name}-${100 + Math.floor(Math.random() * 900)}`;

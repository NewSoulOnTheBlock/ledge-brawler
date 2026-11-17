// spec/app/index.md, "Story: Fight other players"
// The other players of a duel, over Multiplayer Agent's relay rooms (https://multiplayeragent.com). Every player's
// game runs its own fighter and says where it is twenty times a second; a blow is found by the game of the one
// who threw it and told to the game of the one it landed on, which takes the health. Nothing here is checked by a
// server: it is for playing with people, not against cheats.
// The room is one of the "OVERCAST — Rig 7" game's (the account has no free game left for a key of its own).
import { CHARS } from "./game/data.ts";
import { outfitOf } from "./game/relics.ts";
import { type Frame, frameOf } from "./game/figure.ts";
import { type Level, VERSUS_STAGES } from "./game/levels.ts";
import type { Game, Hurt, Peer, Rules, Shot, Sprite } from "./game/sim.ts";
import { SKY_IDS, type SkyId } from "./game/sky.ts";

const KEY = "pk_live_d848cb8f1f6178512862c04638fdc8b2a8fde91367c9ff48";
const ENDPOINT = "wss://live.multiplayeragent.com", API = "https://api.multiplayeragent.com", SDK = "https://cdn.multiplayeragent.com/sdk/mp.global.js";
/** How often a fighter says where it is; and how far into the past the others are drawn, at least and at most: as far
 *  as the jitter on the way needs, so that there is always a place heard of on each side of the moment drawn. */
const SAY_EVERY = 50, STILL_EVERY = 200, BEHIND_LEAST = 60, BEHIND_MOST = 260;
/** How long a fighter may be drawn going on as it was going once nothing newer has come, and how long a correction takes to fade. */
const GUESS_MOST = 150, MEND = 90;
/** A player not heard from for this long is shown as lagging, and for this long is taken to be gone: the relay holds a
 *  dropped player's seat for half a minute, and a ghost must not stand in the fight or keep a match from ending. */
const QUIET = 2500, GONE = 8000;
/** How often each game asks the others how long a word takes there and back. */
const PING_EVERY = 2000;
/** What a blow told of by another game may be at most, whatever it says: no move in the game does more, throws
 *  harder, or stuns longer; how far from the one it lands on its thrower may be seen (the widest special, and the lag
 *  between the two pictures); and how many a player may land in a second. */
const BLOW = { dmg: 60, push: 30, stun: 150, reach: 2600, perSecond: 25 };
/** How many fight in one room: one for each of the five blades. */
export const SEATS = 5;

export type Fields = Record<string, number | string | undefined>;
export interface Room {
  sessionId: string;
  state?: { entities?: { players?: Record<string, Fields> } };
  me: { set(fields: Fields): void };
  send(type: string, data: unknown): void;
  on(type: string, handler: (data: never, from: string) => void): void;
  onState(handler: (state: { entities?: { players?: Record<string, Fields> } }) => void): void;
  onDisconnect(handler: () => void): void; onReconnect(handler: () => void): void;
  onLeave(handler: (id: string) => void): void;
  leave(): Promise<void>;
}
declare global { interface Window { MP?: { join(options: { key: string; room: string; endpoint: string; apiUrl: string }): Promise<Room> } } }

/** How long a join may take before it is tried again, how many times, and how long the connection may be lost
 *  before the seat is taken to be gone and the room joined afresh: the relay holds a seat for about thirty seconds. */
const JOIN_WAIT = 8000, JOIN_TRIES = 3, REJOIN_AFTER = 25000;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Joins the room `name`, trying again a little later if it fails or does not answer, and comes back once the room
 *  has said what is in it, or after a second and a half if it says nothing. */
async function enter(name: string, wait = JOIN_WAIT, tries = JOIN_TRIES): Promise<Room> {
  for (let attempt = 1; ; attempt++) {
    try {
      const joining = window.MP!.join({ key: KEY, room: name, endpoint: ENDPOINT, apiUrl: API });
      const room = await Promise.race([joining, sleep(wait).then(() => null)]);
      // One that answers after it was given up on is left at once.
      if (!room) { void joining.then((late) => late.leave(), () => undefined); throw new Error("The multiplayer service did not answer."); }
      for (const t = performance.now(); !room.state && performance.now() - t < 1500;) await sleep(50);
      return room;
    } catch (error) {
      if (attempt >= tries) throw error;
      await sleep(500 * 3 ** (attempt - 1));
    }
  }
}

let sdk: Promise<void> | undefined;
const loadSdk = () => (sdk ??= new Promise<void>((resolve, reject) => {
  const script = document.createElement("script");
  script.src = SDK; script.onload = () => resolve(); script.onerror = () => { sdk = undefined; reject(new Error("The multiplayer service could not be reached.")); };
  document.head.append(script);
}));

const say = (at: Frame) => ("move" in at ? `m:${at.move}:${Math.floor(at.frame)}` : `a:${at.anim}:${Math.floor(at.frame)}`);
function heard(text: string): Frame {
  const [kind, name, frame] = text.split(":");
  return kind === "m" ? { move: name, frame: Number(frame) } : { anim: name as never, frame: Number(frame) };
}

/** A player of the room, for the list on screen. */
export interface Rival { id: string; name: string; fighter: number; lives: number; alive: boolean; kos: number; me: boolean;
  /** A pro match's paid seat (pro.ts): the entry this player paid. */
  entry?: number;
  /** How long a word takes to them and back, in milliseconds, once it has been measured; and whether they have gone quiet. */
  ping?: number; quiet?: boolean }
export interface Standing { rivals: Rival[]; status: "joining" | "alone" | "fighting" | "over" | "reconnecting" | "offline" | "full"; winner?: string;
  /** In a pro match, the winner's paid entry, or null when no one was left standing. */
  winnerEntry?: number | null }
export interface Versus {
  /** Once a frame, before the game's own: places the others, says where this fighter is, and ends and restarts rounds. */
  tick(): void;
  strike(to: string, blow: Hurt): void; shot(orb: Shot): void; downed(by: string | null): void;
  /** Tells the others of an effect that played here. */
  fx(sprite: Omit<Sprite, "age">): void;
  /** Starts the next match, for everyone in the room, once this one has been won. */
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

/** What a player's game says of its fighter, twenty times a second. */
interface Word { x: number; y: number; vx: number; vy: number; facing: number; hp: number; lives: number; alive: boolean; glow: boolean; guard: boolean; round: number; kos: number; at: Frame; over: boolean; special: Peer["special"];
  /** When it was said, by the sayer's own clock, in milliseconds; an older game does not say, and it is taken as heard. */
  sent?: number }
// The room allows a player sixty messages a second and drops the rest without a word, and every field set is a
// message of its own. So a fighter's whole state goes as ONE field, a line of text, and its name and fighter, which
// do not change, as two more, once.
const pack = (w: Word) => [Math.round(w.x), Math.round(w.y), Math.round(w.vx * 10) / 10, Math.round(w.vy * 10) / 10, w.facing, w.hp, w.lives, +w.alive, +w.glow, +w.guard, w.round, w.kos, say(w.at), +w.over,
  // A special: which, how far in, its aim in hundredths of a radian, and its centre.
  w.special ? [w.special.slot, Math.round(w.special.t), w.special.ang === undefined ? "" : Math.round(w.special.ang * 100), w.special.c ? Math.round(w.special.c.x) : "", w.special.c ? Math.round(w.special.c.y) : ""].join(":") : "",
  Math.round(w.sent ?? 0)].join(",");
/** A special as it was packed, or none: an older game says nothing of them. */
function special(text: string | undefined): Peer["special"] {
  if (!text) return null;
  const [slot, t, ang, cx, cy] = text.split(":");
  return { slot: Number(slot), t: Number(t), ang: ang === "" ? undefined : Number(ang) / 100, c: cx === "" ? undefined : { x: Number(cx), y: Number(cy) } };
}
function unpack(p: Fields): Word | null {
  if (typeof p.s !== "string") return null;
  const v = p.s.split(","), n = (i: number) => Number(v[i]);
  if (v.length < 13) return null;
  return { x: n(0), y: n(1), vx: n(2), vy: n(3), facing: n(4), hp: n(5), lives: n(6), alive: v[7] === "1", glow: v[8] === "1", guard: v[9] === "1", round: n(10), kos: n(11), at: heard(v[12]), over: v[13] === "1", special: special(v[14]), sent: v[15] ? n(15) : undefined };
}

/** What a co-op group (coop.ts) adds to a room: its own words, heard and said each frame, and which of its levels is
 *  being played, which stands for a duel's round (a fighter is drawn only by those playing the same one). */
export interface RoomLink {
  attach(room: Room, me: string): void;
  tick(room: Room, me: string, now: number): void;
  /** The number of the level the group is playing, from 1; 0 while it is choosing one. */
  epoch(): number;
}

/** Joins the room `code` as `name`, for the duel `rules` has just started in `game`. With `entry`, it is a pro match
 *  (pro.ts): this seat says which entry it paid, and players who have not paid one are not fought. With `link`, it
 *  is a co-op group's room (coop.ts): no rounds and no winner, and fighters are said only while a level is played. */
export async function joinVersus(code: string, name: string, staged: boolean, game: Game, rules: Rules, onStanding: (standing: Standing) => void, entry?: number, link?: RoomLink): Promise<Versus> {
  await loadSdk();
  // A room seats five. The open room, once full, has another behind it, and another behind that; a private room
  // that is full is full, and whoever was sent its link is told so.
  let seat: Room | undefined, where = "";
  for (let overflow = 0; !seat; overflow++) {
    where = `${link ? "ledge-coop" : "ledge-brawl"}-${code}${overflow ? `-${overflow + 1}` : ""}`;
    const joined = await enter(where);
    // A co-op group counts everyone there, at its table or in its level.
    const seated = Object.entries(joined.state?.entities?.players ?? {}).filter(([id, p]) => id !== joined.sessionId && (link ? true : typeof p.s === "string")).length;
    if (seated < SEATS) seat = joined;
    else { await joined.leave(); if (code !== "open" || overflow >= 8) throw new Error("full"); }
  }
  // The room and this game's id in it change if the connection is lost for longer than the relay holds a seat, and
  // the game joins again (`tick`).
  let room = seat, me = room.sessionId;
  /** Everyone in the room who has said where they are, by their id. */
  let words = new Map<string, Word & { name: string; fighter: number; outfit?: string; entry?: number }>();
  /** Each of the others as it has been heard of: what it said, by its own clock, for the last second and a half; how
   *  much later than it was said each word came, from which the gap between the clocks and the jitter are found; how
   *  far in the past it is drawn just now; and what is left of the last correction to where it is drawn. */
  const track = new Map<string, { words: Word[]; late: number[]; behind: number; mend: { x: number; y: number }; drawn: number }>();
  /** When each player last said something new, by this game's clock; and how long a word takes to each and back. */
  const heardAt = new Map<string, number>(), pings = new Map<string, number>();
  let pinged = 0;
  /** Whether a player is still to be counted: heard from lately, or this game's own. */
  const here = (id: string, now: number) => id === me || now - (heardAt.get(id) ?? now) < GONE;
  let round = -1, kos = 0, said = 0, told = 0, over = 0, winner: string | undefined, winnerEntry: number | null | undefined, online = true, gone = false, next = false, spare = 20, spent = performance.now(), fighter = rules.get().fighter;
  /** When the connection was lost, if it is; and whether the game is joining again. */
  let offlineSince = 0, rejoining = false;
  /** What was last said of this fighter, without its time. */
  let lastSaid = "";

  const blows = new Map<string, { last: number; recent: number[] }>();
  /** How many blows this game has told of, so that each can be told apart. */
  let thrown = 0;
  /** Listens to `room`: what it holds, who leaves it, what the others tell, and the connection coming and going. */
  function attach() {
    room.me.set({ n: name, f: fighter, o: outfitOf(fighter).id, e: entry });
    room.onState((state) => {
      // The first word from a room that nobody has written to has no players in it yet.
      const now = performance.now(), next = new Map<string, Word & { name: string; fighter: number; outfit?: string; entry?: number }>();
      for (const [id, p] of Object.entries(state.entities?.players ?? {})) {
        const w = unpack(p);
        if (!w || (entry !== undefined && typeof p.e !== "number")) continue;
        next.set(id, { ...w, name: String(p.n ?? "?"), fighter: Number(p.f ?? 0), outfit: typeof p.o === "string" ? p.o : undefined, entry: typeof p.e === "number" ? p.e : undefined });
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
      // Whoever arrives joins the round the room is in.
      if (round < 0 && !link) {
        round = Math.max(0, ...[...words.values()].map((w) => w.round));
        // Under the sky of this room and round: the game began under the sky of the room in the address, which an
        // inviter has since left, and a round may be under way.
        if (game.scene.level) game.scene.level.sky = skyFor(code, round);
      }
    });
    // A blow told of by another game. Its game decided it landed, and this one takes it, unless it cannot be right:
    // told twice, from another round, from someone gone or down, from much too far away, or one of too many.
    room.on("hit", (data: Hurt & { to: string; n?: number; round?: number }, from) => {
      if (data.to !== me || !here(from, performance.now())) return;
      const now = performance.now(), by = blows.get(from) ?? { last: -1, recent: [] }, thrower = words.get(from), hero = game.scene.hero;
      blows.set(from, by);
      if (data.n !== undefined) { if (data.n <= by.last) return; by.last = data.n; }
      if (data.round !== undefined && data.round !== round) return;
      // In co-op the host's game tells of its enemies' blows, which land whether its own fighter is up or not.
      if (thrower && !thrower.alive && !link) return;
      if (thrower && hero && Math.hypot(thrower.x - hero.body.position.x, thrower.y - hero.body.position.y) > BLOW.reach) return;
      by.recent = by.recent.filter((t) => now - t < 1000);
      if (by.recent.length >= BLOW.perSecond) return;
      by.recent.push(now);
      const within = (v: unknown, most: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-most, Math.min(most, v)) : 0);
      game.struck(from, { dmg: Math.max(0, within(data.dmg, BLOW.dmg)), kx: within(data.kx, BLOW.push), ky: within(data.ky, BLOW.push), stun: data.stun === undefined ? undefined : Math.max(0, within(data.stun, BLOW.stun)),
        heavy: !!data.heavy, float: !!data.float, from: within(data.from, 1) });
    });
    room.on("orb", (data: Shot & { round?: number }) => { if (data.round === undefined || data.round === round) game.shot(data); });
    room.on("fx", (data: Omit<Sprite, "age">) => game.fx(data));
    room.on("ko", (data: { by: string | null; round?: number }) => { if (data.by === me && (data.round === undefined || data.round === round)) kos++; });
    // Someone who leaves is gone at once, from the fight and from the list.
    room.onLeave((id) => { words.delete(id); track.delete(id); heardAt.delete(id); pings.delete(id); });
    room.on("ping", (data: { t: number }, from) => room.send("pong", { to: from, t: data.t }));
    room.on("pong", (data: { to: string; t: number }, from) => {
      if (data.to !== me) return;
      const took = performance.now() - data.t, was = pings.get(from);
      pings.set(from, was === undefined ? took : was * 0.7 + took * 0.3);
    });
    // Told again at each failed try to get back in: the outage is timed from the first.
    room.onDisconnect(() => { if (online) offlineSince = performance.now(); online = false; });
    room.onReconnect(() => {
      online = true; offlineSince = 0;
      // Back in the same seat: say again who this is, and where, at once.
      room.me.set({ n: name, f: fighter, o: outfitOf(fighter).id, e: entry }); said = 0;
    });
    link?.attach(room, me);
  }
  attach();
  const bye = () => { void leave(); };
  addEventListener("pagehide", bye);

  function leave() {
    if (gone) return;
    gone = true;
    removeEventListener("pagehide", bye);
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

  function others(now: number): Peer[] {
    const list: Peer[] = [];
    for (const [id, w] of words) {
      const t = track.get(id);
      if (id === me || !t?.words.length || !here(id, now) || (link && w.round !== round)) continue;
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
    tick() {
      if (gone) return;
      const now = performance.now(), match = rules.get(), hero = game.scene.hero;
      // Lost for longer than the relay holds a seat: the seat is gone, so the game joins the room again as someone new.
      if (!online && offlineSince && now - offlineSince > REJOIN_AFTER && !rejoining) {
        rejoining = true;
        // The lost room is let go first: while it is still trying to get back in, a new join waits behind it. Then
        // short tries, one after another, so that the moment the way is open again the game is back in.
        const lost = room;
        void Promise.race([lost.leave().catch(() => undefined), sleep(1000)]).then(() => enter(where, 4000, 1)).then((fresh) => {
          if (gone) { void fresh.leave(); return; }
          room = fresh; me = fresh.sessionId; online = true; offlineSince = 0; said = 0;
          attach();
        // Still no way through: tried again in a second.
        }, () => { offlineSince = performance.now() - REJOIN_AFTER + 1000; }).finally(() => { rejoining = false; });
      }
      if (link) round = link.epoch();
      game.peers(others(now));
      // In co-op a fighter is said only while its level is played.
      if (hero && round >= 0 && (!link || (round > 0 && match.screen === "Play")) && now - said >= SAY_EVERY) {
        if (match.fighter !== fighter) { fighter = match.fighter; room.me.set({ f: fighter, o: outfitOf(fighter).id }); }
        const at = hero.body.position, v = hero.body.velocity;
        const word: Word = { x: at.x, y: at.y, vx: v.x, vy: v.y, facing: hero.facing, hp: match.hp, lives: match.lives, alive: match.alive, glow: match.overdrive > 0 || hero.charging, guard: game.scene.guard > 0, round, kos, at: frameOf(hero, game.scene.time), over: match.overdrive > 0,
          special: hero.special ? { slot: CHARS.flatMap((c) => c.specials).indexOf(hero.special.def), t: hero.special.t, ang: hero.special.ang, c: hero.special.c } : null };
        // A fighter that has not changed is said again only five times a second, to show it is still there: the room
        // takes sixty messages a second from a player, and what changes, blows and effects, needs the room.
        const same = pack(word);
        if (same !== lastSaid || now - said >= STILL_EVERY) { said = now; lastSaid = same; room.me.set({ s: pack({ ...word, sent: now }) }); }
      }
      // A match is over when two or more are in it and all but one have been knocked out three times: the one left
      // has won. It stays over, the winner named, until someone asks for another (`again`); a game that sees a later
      // match has been started joins it.
      if (now - pinged > PING_EVERY) { pinged = now; room.send("ping", { t: now }); }
      link?.tick(room, me, now);
      const all = [...words].filter(([id]) => here(id, now)).map(([, w]) => w), inRound = all.filter((w) => w.round === round);
      const standing = inRound.filter((w) => w.alive || w.lives > 1);
      const ahead = all.some((w) => w.round > round);
      if (!link && !over && inRound.length >= 2 && standing.length <= 1) { over = now; winner = standing[0]?.name; winnerEntry = standing[0] ? standing[0].entry ?? null : null; }
      if (!link && (next || (ahead && round >= 0))) {
        round = ahead ? Math.max(...all.map((w) => w.round)) : round + 1;
        next = false;
        over = 0; winner = undefined; winnerEntry = undefined; said = 0;
        if (staged && rules.send({ type: "rematch" })) game.begin(stageFor(code, round));
      }
      if (now - told > 250) {
        told = now;
        const rivals = [...words].filter(([id]) => here(id, now)).map(([id, w]) => ({ id, name: w.name, fighter: w.fighter, lives: w.lives, alive: w.alive, kos: w.kos, me: id === me, entry: w.entry,
          ping: pings.has(id) ? Math.round(pings.get(id)!) : undefined, quiet: id !== me && now - (heardAt.get(id) ?? now) > QUIET }));
        onStanding({ rivals, status: !online ? "reconnecting" : over ? "over" : rivals.length < 2 ? "alone" : "fighting", winner, winnerEntry });
      }
    },
    strike: (to, blow) => room.send("hit", { to, n: ++thrown, round, dmg: Math.round(blow.dmg * 10) / 10, kx: blow.kx, ky: blow.ky, stun: blow.stun, heavy: blow.heavy, float: blow.float, from: blow.from }),
    shot: (orb) => room.send("orb", { ...orb, round }),
    downed: (by) => room.send("ko", { by, round }),
    // No more than twenty a second: the room drops what a player sends past sixty, and where the fighter is comes first.
    fx: (sprite) => { const now = performance.now(); spare = Math.min(20, spare + (now - spent) * 0.02); spent = now; if (spare >= 1) { spare--; room.send("fx", sprite); } },
    again: () => { if (over) next = true; },
    leave: () => { void leave(); },
  };
}

/** A name for a player who has not been asked for one: the fighter's, and three digits to tell two of them apart. */
export const nameFor = (fighter: number) => `${CHARS[fighter].name}-${100 + Math.floor(Math.random() * 900)}`;

/** Join a room as a read-only spectator. Receives standings but sends nothing. */
export async function spectateRoom(code: string, onStanding: (standing: Standing) => void): Promise<{ leave: () => void }> {
  await loadSdk();
  const room = await window.MP!.join({ key: KEY, room: `ledge-brawl-${code}`, endpoint: ENDPOINT, apiUrl: API });
  let gone = false, told = 0;
  room.onState((state) => {
    const now = performance.now();
    if (now - told < 300) return;
    told = now;
    const rivals: Rival[] = [];
    for (const [id, p] of Object.entries(state.entities?.players ?? {})) {
      const w = unpack(p);
      if (!w) continue;
      rivals.push({ id, name: String(p.n ?? "?"), fighter: Number(p.f ?? 0), lives: w.lives, alive: w.alive, kos: w.kos, me: false });
    }
    const alive = rivals.filter((r) => r.alive || r.lives > 1);
    const over = rivals.length >= 2 && alive.length <= 1;
    onStanding({ rivals, status: over ? "over" : rivals.length < 2 ? "alone" : "fighting", winner: over ? alive[0]?.name : undefined });
  });
  room.onDisconnect(() => onStanding({ rivals: [], status: "offline" }));
  const bye = () => { void leave(); };
  addEventListener("pagehide", bye);
  function leave() { if (gone) return; gone = true; removeEventListener("pagehide", bye); return room.leave(); }
  return { leave: () => { void leave(); } };
}

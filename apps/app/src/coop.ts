// spec/app/index.md, "Story: Play a level of a campaign"
// Co-op (docs/coop-plan.md): up to five play one campaign chapter together, over the same relay rooms as a duel
// (versus.ts, which keeps every fighter where its game says). At the table each takes one of the five protagonists, no
// two the same, and the host (whoever has sat longest) chooses a chapter of their own campaign and starts it. In the
// level the host's game runs the enemies and everything the level does, and tells the others twelve times a second
// (`world`); the others' blows on those enemies go to the host's game, a few at a time (`foe`). Whatever happens to
// the whole group (an ambush, a piece of the key, the way out) is told to all (`lvl`), and so is the host's guide's
// talk (`talk`). If the host goes, whoever has sat longest after them takes the level over.
import type { Hero } from "./story/canon.ts";
import type { Game, Hurt, Rules, Shared, World } from "./game/sim.ts";
import { type Fields, joinVersus, type Room, type Standing, type Versus } from "./versus.ts";

/** One of the group at the table. */
export interface Seat { id: string; name: string; hero: Hero | null; ready: boolean; host: boolean; me: boolean; playing: boolean }
/** The table as it stands: who sits at it, which chapter the host has chosen, and whether a level is under way. */
export interface Table { code: string; seats: Seat[]; host: boolean; pick: string | null; playing: number; status: "open" | "reconnecting" }
/** What the host's guide says, told to the others to be shown as it is said: its lines, how far in, and whose. */
export interface TalkWord { lines: string[]; at: number; who?: string; end?: string; voice?: string; choices?: string[] }

export interface Together {
  /** Takes one of the five, or gives it up; says whether this player is ready. */
  seat(hero: Hero | null): void; ready(on: boolean): void;
  /** The host: the chapter to play, then starts it for everyone at the table. */
  choose(level: string): void; start(): void;
  /** This game's own part in a level being played: its blows on the host's enemies, what happens to everyone, the guide. */
  foeHit(uid: number, blow: Hurt): void; share(event: Shared): void; say(talk: TalkWord | null): void;
  /** Back at the table after a level. */
  back(): void;
  /** The room, for what a duel's room does in a level too: fighters, blows, shots and effects (versus.ts). */
  versus: Versus;
  host(): boolean;
  leave(): void;
}

export interface TogetherEvents {
  table(table: Table): void;
  /** A level has been started for the group: this game is to set out on `level`, as host or not. */
  start(level: string, host: boolean): void;
  /** The host has changed while a level is played: this game has become it, or is no longer. */
  host(host: boolean): void;
  /** The host's guide's words, or null when it has stopped talking. */
  talk(talk: TalkWord | null): void;
  /** The fighters in the level, with their lives and how well each is heard (versus.ts). */
  standing(standing: Standing): void;
}

/** How often each game says it is still there; and how long one can be silent before it is taken to have gone. The
 *  relay keeps a seat for half a minute after its player has gone, and a host that has gone must be replaced at once. */
const BEAT_EVERY = 1000, SILENT = 5000;
/** How often the host's game tells of the world, and the others send their blows, in milliseconds. */
const WORLD_EVERY = 66, FOE_EVERY = 80;
/** What a blow told of by a teammate may be at most (as in versus.ts), and how many a teammate may land in a second. */
const BLOW = { dmg: 80, push: 30, stun: 150, perSecond: 40 };
/** How many sit at a table: one for each of the five. */
export const TABLE = 5;

/** Sits down at the table `code` as `name`. */
export async function joinTogether(code: string, name: string, game: Game, rules: Rules, on: TogetherEvents): Promise<Together> {
  let room: Room | null = null, me = "";
  /** When this player sat down, by the wall clock: the longest seated is the host. */
  const sat = Date.now();
  let hero: Hero | null = null, ready = false, pick: string | null = null;
  /** The level being played by this game (counted from 1), or 0 at the table; and the host's, as last heard. */
  let epoch = 0, wasHost = false, lastWorld = 0, lastFoe = 0, toldTable = "";
  const hits: number[][] = [];
  const blows = new Map<string, number[]>();
  /** When each of the others was last heard from, by this game's clock: someone first seen is given the time it takes to be heard. */
  const heardAt = new Map<string, number>();
  let beat = 0;
  const hear = (from: string) => heardAt.set(from, performance.now());

  /** Everyone at the table who is still there: this game, and the others heard from lately. */
  const players = (): [string, Fields][] => {
    const now = performance.now();
    return Object.entries(room?.state?.entities?.players ?? {}).filter(([id]) => {
      if (id === me) return true;
      if (!heardAt.has(id)) heardAt.set(id, now);
      return now - heardAt.get(id)! < SILENT;
    });
  };
  /** Who hosts: of everyone present, whoever sat down first (and of two at once, the lower id). */
  function hostId(): string {
    const all = players().map(([id, p]) => ({ id, j: typeof p.j === "number" ? p.j : Number.MAX_SAFE_INTEGER }));
    if (!all.some((each) => each.id === me)) all.push({ id: me, j: sat });
    all.sort((a, b) => a.j - b.j || (a.id < b.id ? -1 : 1));
    return all[0].id;
  }
  const isHost = () => !!me && hostId() === me;
  const say = (fields: Fields) => room?.me.set(fields);

  function table(): Table {
    const host = hostId(), seats: Seat[] = players().map(([id, p]) => ({
      id, name: String(p.n ?? "?"), hero: (typeof p.h === "string" && p.h ? p.h : null) as Hero | null, ready: p.r === 1, host: id === host, me: id === me, playing: typeof p.E === "number" && p.E > 0,
    }));
    if (!seats.some((s) => s.me)) seats.push({ id: me, name, hero, ready, host: host === me, me: true, playing: epoch > 0 });
    // A protagonist taken by two: whoever sat down first keeps it.
    const by = new Map(players().map(([id, p]) => [id, typeof p.j === "number" ? p.j : 0]));
    for (const s of seats) {
      if (!s.hero) continue;
      const first = seats.filter((o) => o.hero === s.hero).sort((a, b) => (by.get(a.id) ?? 0) - (by.get(b.id) ?? 0))[0];
      if (first.id !== s.id) s.hero = null;
    }
    const hostPick = players().find(([id]) => id === host)?.[1].L;
    return { code, seats: seats.sort((a, b) => (by.get(a.id) ?? sat) - (by.get(b.id) ?? sat)), host: host === me, pick: typeof hostPick === "string" && hostPick ? hostPick : pick, playing: epoch, status: "open" };
  }

  const link = {
    attach(r: Room, id: string) {
      room = r; me = id;
      say({ j: sat, h: hero ?? "", r: ready ? 1 : 0, L: pick ?? "", E: epoch });
      r.on("hb", (_: unknown, from) => hear(from));
      r.on("go", (data: { epoch: number; level: string }, from) => {
        hear(from);
        if (from !== hostId() || data.epoch <= epoch || !hero) return;
        epoch = data.epoch; say({ E: epoch });
        on.start(data.level, false);
      });
      r.on("world", (data: { ep: number; w: World }, from) => {
        hear(from);
        if (data.ep !== epoch || from !== hostId() || isHost()) return;
        game.heardWorld(data.w, performance.now());
      });
      r.on("foe", (data: { ep: number; to: string; h: number[][] }, from) => {
        if (data.ep !== epoch || data.to !== me || !isHost() || !Array.isArray(data.h)) return;
        const now = performance.now(), recent = (blows.get(from) ?? []).filter((t) => now - t < 1000);
        blows.set(from, recent);
        const within = (v: unknown, most: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(-most, Math.min(most, v)) : 0);
        for (const [uid, dmg, kx, ky, stun, heavy, float, dir] of data.h.slice(0, 20)) {
          if (recent.length >= BLOW.perSecond) break;
          recent.push(now);
          game.hitFoe(uid, { dmg: Math.max(0, within(dmg, BLOW.dmg)), kx: within(kx, BLOW.push), ky: within(ky, BLOW.push), stun: stun < 0 ? undefined : Math.max(0, within(stun, BLOW.stun)), heavy: heavy === 1, float: float === 1, from: within(dir, 1) });
        }
      });
      r.on("lvl", (data: Shared & { ep: number }, from) => { if (data.ep === epoch && epoch > 0) game.shared(data, from); });
      r.on("talk", (data: { ep: number; t: TalkWord | null }, from) => { if (data.ep === epoch && from === hostId() && !isHost()) on.talk(data.t); });
    },
    tick(r: Room, id: string, now: number) {
      room = r; me = id;
      if (now - beat >= BEAT_EVERY) { beat = now; r.send("hb", 0); }
      const host = isHost();
      if (epoch > 0 && host !== wasHost) on.host(host);
      wasHost = host;
      if (epoch > 0 && host && rules.get().screen === "Play" && now - lastWorld >= WORLD_EVERY) { lastWorld = now; r.send("world", { ep: epoch, w: game.world() }); }
      if (epoch > 0 && !host && hits.length && now - lastFoe >= FOE_EVERY) { lastFoe = now; r.send("foe", { ep: epoch, to: hostId(), h: hits.splice(0, 20) }); }
      const t = table(), said = JSON.stringify(t);
      if (said !== toldTable) { toldTable = said; on.table(t); }
    },
    epoch: () => epoch,
  };

  const versus = await joinVersus(code, name, null, game, rules, on.standing, undefined, link);

  return {
    versus,
    seat(next) { hero = next; ready = false; say({ h: hero ?? "", r: 0 }); },
    ready(onOff) { ready = onOff && !!hero; say({ r: ready ? 1 : 0 }); },
    choose(level) { pick = level; say({ L: level }); },
    start() {
      if (!isHost() || !pick || !hero || !room) return;
      // Its number: past any level anyone at the table is in, so that every game sees it as new.
      const seen = Math.max(epoch, ...players().map(([, p]) => (typeof p.E === "number" ? p.E : 0)));
      epoch = seen + 1;
      room.send("go", { epoch, level: pick });
      say({ E: epoch });
      on.start(pick, true);
    },
    foeHit(uid, blow) { if (hits.length < 60) hits.push([uid, Math.round(blow.dmg * 10) / 10, blow.kx, blow.ky, blow.stun ?? -1, blow.heavy ? 1 : 0, blow.float ? 1 : 0, blow.from ?? 0]); },
    share(event) { if (epoch > 0) room?.send("lvl", { ...event, ep: epoch }); },
    say(talk) { if (epoch > 0 && isHost()) room?.send("talk", { ep: epoch, t: talk }); },
    back() { epoch = 0; ready = false; hits.length = 0; say({ E: 0, r: 0 }); },
    host: isHost,
    leave() { versus.leave(); },
  };
}

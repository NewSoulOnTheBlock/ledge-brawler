// spec/app/lobby.md, "Story: Find a match"; spec/app/bout.md, "Story: Fight for the pot"
// A game's seat at the arena server (arena.ts), over one WebSocket: the room versus.ts and together.ts play in, as
// they once played in the relay's. A dropped connection is joined again at once, into the same seat while the server
// keeps it (ten seconds), so a moment's loss of signal costs nothing.
import type { BoutWord, Fields, Kind, ProSeat, ToGame } from "./protocol.ts";
import type { RunWord } from "./run.ts";

/** Where the arena server listens: set for a build by VITE_ARENA_URL (apps/app/arena/README.md), or this machine's. */
const arena = () => (import.meta.env?.VITE_ARENA_URL as string | undefined) ?? "ws://localhost:8787/play";

/** How long a seat may take to be given, and how long to wait between tries to get back in. */
const SEAT_WAIT = 8_000, BACK_AFTER = [250, 500, 1_000, 2_000, 2_000];

type Players = Record<string, Fields>;

/** A seat at a table of the arena. */
export interface Room {
  /** This player's id at the table; it changes only if the seat was lost and taken afresh. */
  sessionId: string;
  /** The table's code: what an invitation carries. */
  code: string;
  kind: Kind; pro: boolean;
  state?: { entities?: { players?: Players } };
  me: { set(fields: Fields): void };
  send(type: string, data: unknown): void;
  on(type: string, handler: (data: never, from: string) => void): void;
  onState(handler: (state: { entities?: { players?: Players } }) => void): void;
  /** A duel's table: how the server says the bout stands. */
  onBout(handler: (bout: BoutWord) => void): void;
  /** A paid run's table: how the server says the run stands. */
  onRun(handler: (run: RunWord) => void): void;
  onDisconnect(handler: () => void): void; onReconnect(handler: () => void): void;
  onLeave(handler: (id: string) => void): void;
  /** This fighter has fallen off the islands. */
  fell(): void;
  /** The next round, as soon as it can begin. */
  again(): void;
  leave(): Promise<void>;
}

/** No seat was given: `why` says whether the table was full, the pro entry refused, or the server out of reach. */
export class Refused extends Error {
  constructor(readonly why: "full" | "pro" | "bad" | "offline", message: string) { super(message); }
}

export interface Seek { kind: Kind; name: string; fighter: number; vigor: number; code?: string; pro?: ProSeat }

/** Takes a seat at the arena at `url`: the table `seek.code` names, or one matchmaking finds. */
export function joinArena(seek: Seek, url = arena()): Promise<Room> {
  const handlers = new Map<string, ((data: never, from: string) => void)[]>();
  const stateHandlers: ((state: { entities?: { players?: Players } }) => void)[] = [], boutHandlers: ((bout: BoutWord) => void)[] = [], runHandlers: ((run: RunWord) => void)[] = [];
  const down: (() => void)[] = [], up: (() => void)[] = [], gone: ((id: string) => void)[] = [];
  let socket: WebSocket, key = "", left = false, tries = 0, online = false;
  /** The last of the bout and the run the server told, for a handler that comes after them: the words that follow a
   *  seat may all be heard before the game that asked for it has had a moment to listen. */
  let lastBout: BoutWord | null = null, lastRun: RunWord | null = null;
  const say = (word: object) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(word)); };
  /** What this player shows, kept so that a new connection can show it again at once. */
  const mine: Fields = {};

  const room: Room = {
    sessionId: "", code: "", kind: seek.kind, pro: !!seek.pro,
    me: { set: (fields) => { Object.assign(mine, fields); say({ t: "set", f: fields }); } },
    send: (type, data) => say({ t: "say", type, data }),
    on: (type, handler) => { handlers.set(type, [...(handlers.get(type) ?? []), handler]); },
    onState: (handler) => { stateHandlers.push(handler); if (room.state) handler(room.state); },
    onBout: (handler) => { boutHandlers.push(handler); if (lastBout) handler(lastBout); },
    onRun: (handler) => { runHandlers.push(handler); if (lastRun) handler(lastRun); },
    onDisconnect: (handler) => { down.push(handler); }, onReconnect: (handler) => { up.push(handler); },
    onLeave: (handler) => { gone.push(handler); },
    fell: () => say({ t: "fell" }),
    again: () => say({ t: "again" }),
    leave: () => { left = true; say({ t: "leave" }); socket.close(); return Promise.resolve(); },
  };

  return new Promise<Room>((resolve, reject) => {
    let seated = false;
    const timer = setTimeout(() => { if (!seated) { left = true; socket.close(); reject(new Refused("offline", "The arena did not answer.")); } }, SEAT_WAIT);
    function hear(said: ToGame) {
      switch (said.t) {
        case "seated": {
          const again = seated;
          Object.assign(room, { sessionId: said.id, code: said.code, kind: said.kind, pro: said.pro });
          key = said.key; tries = 0; online = true;
          if (Object.keys(mine).length) say({ t: "set", f: mine });
          if (!again) { seated = true; clearTimeout(timer); resolve(room); } else up.forEach((handler) => handler());
          return;
        }
        case "refused":
          if (!seated) { left = true; clearTimeout(timer); socket.close(); reject(new Refused(said.why, said.message)); }
          return;
        case "state":
          room.state = { entities: { players: said.players } };
          stateHandlers.forEach((handler) => handler(room.state!));
          return;
        case "said": for (const handler of handlers.get(said.type) ?? []) handler(said.data as never, said.from); return;
        case "left": gone.forEach((handler) => handler(said.id)); return;
        case "bout": lastBout = said.bout; boutHandlers.forEach((handler) => handler(said.bout)); return;
        case "run": lastRun = said.run; runHandlers.forEach((handler) => handler(said.run)); return;
      }
    }
    function open() {
      socket = new WebSocket(url);
      // Back to the same table: by its code, if the seat itself has been given up.
      socket.onopen = () => say({ t: "seek", ...seek, ...(room.sessionId ? { code: seek.pro ? undefined : room.code, resume: { id: room.sessionId, key } } : {}) });
      socket.onmessage = (event) => { try { hear(JSON.parse(String(event.data)) as ToGame); } catch { /* not a word of the arena's */ } };
      socket.onclose = () => {
        if (left) return;
        if (!seated) { if (tries >= BACK_AFTER.length) { clearTimeout(timer); reject(new Refused("offline", "The arena could not be reached.")); return; } }
        else if (online) { online = false; down.forEach((handler) => handler()); }
        setTimeout(open, BACK_AFTER[Math.min(tries++, BACK_AFTER.length - 1)]);
      };
    }
    open();
  });
}

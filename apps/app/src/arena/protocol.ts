// spec/app/lobby.md, "Story: Find a match"; spec/app/bout.md, "Story: Fight for the pot"; spec/app/index.md, "Story: Fight the waves"
// What the arena server (arena.ts) and the games (link.ts) say to each other over one WebSocket, as JSON. A game
// asks for a seat; once seated it sets the fields others see of it and sends words to everyone at its table, as it
// did over the old relay. At a duel's table the server keeps the bout (spec/app/bout.md): a blow goes to the server,
// which lands it or not, and tells everyone how the bout stands. At a paid run's table the server plays the run
// (run.ts) and tells its player the world and how the run stands.
import type { RunWord } from "./run.ts";

/** What a player shows the others: a few short fields (versus.ts packs a fighter's whole state into one). */
export type Fields = Record<string, number | string | undefined>;
export type Kind = "duel" | "group" | "run";

/** A seat in a pro match: the paid entry, and the player's sign-in to prove it is theirs (server/api/pro-arena.js). */
export interface ProSeat { entry: number; token: string }

export type FromGame =
  /** A seat: at the table `code`, or, without one, wherever matchmaking finds room. `resume` takes back a seat this
   *  game lost a moment ago, with the key it was given. */
  | { t: "seek"; kind: Kind; name: string; fighter: number; vigor: number; code?: string; pro?: ProSeat; resume?: { id: string; key: string } }
  /** Changes to what this player shows. */
  | { t: "set"; f: Fields }
  /** A word for everyone else at the table. At a duel's table a `hit` goes to the server instead. */
  | { t: "say"; type: string; data: unknown }
  /** The fighter has fallen off the islands (spec/app/bout.md, "A fall off the islands costs a standing fighter 25 health, and may knock it out, with no knockout scored"). */
  | { t: "fell" }
  /** The next round, as soon as it can begin. */
  | { t: "again" }
  | { t: "leave" };

/** How a duel's table stands, as the server keeps it. */
export interface BoutWord {
  round: number; fighting: boolean; over: boolean;
  /** Who won the round, once it is over: the one left with lives, or null if no one was. */
  winner: string | null;
  /** When the next round begins, in milliseconds from now, if it is coming. */
  next: number | null;
  fighters: Record<string, { hp: number; most: number; lives: number; kos: number }>;
}

export type ToGame =
  | { t: "seated"; id: string; key: string; code: string; kind: Kind; pro: boolean }
  /** No seat: the table is full, the pro entry was refused, or the request made no sense. */
  | { t: "refused"; why: "full" | "pro" | "bad"; message: string }
  /** Everyone's fields, whenever any have changed. */
  | { t: "state"; players: Record<string, Fields> }
  | { t: "said"; type: string; from: string; data: unknown }
  | { t: "left"; id: string }
  | { t: "bout"; bout: BoutWord }
  | { t: "run"; run: RunWord };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, most: number) => (typeof v === "string" ? v.slice(0, most) : undefined);
/** A table's code: what a link carries, letters and digits only. */
export const codeOf = (v: unknown) => (typeof v === "string" ? v.replace(/[^a-z0-9]/gi, "").slice(0, 16).toLowerCase() : "");

/** Fields as a player may set them: at most 16, short names, numbers and short text. */
function fields(v: unknown): Fields | undefined {
  if (!isRecord(v)) return undefined;
  const out: Fields = {};
  for (const [key, value] of Object.entries(v).slice(0, 16)) {
    if (key.length > 8) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, 400);
  }
  return out;
}

/** What a game sent, if it is anything the server understands: everything from a game is untrusted. */
export function fromGame(raw: string): FromGame | undefined {
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return undefined; }
  if (!isRecord(v)) return undefined;
  switch (v.t) {
    case "seek": {
      if (v.kind !== "duel" && v.kind !== "group" && v.kind !== "run") return undefined;
      const pro = isRecord(v.pro) && Number.isSafeInteger(v.pro.entry) && typeof v.pro.token === "string" ? { entry: v.pro.entry as number, token: v.pro.token.slice(0, 4096) } : undefined;
      const resume = isRecord(v.resume) && typeof v.resume.id === "string" && typeof v.resume.key === "string" ? { id: v.resume.id.slice(0, 32), key: v.resume.key.slice(0, 64) } : undefined;
      const whole = (n: unknown) => (typeof n === "number" && Number.isSafeInteger(n) ? n : 0);
      return { t: "seek", kind: v.kind, name: (text(v.name, 24) ?? "").trim() || "Player", fighter: whole(v.fighter), vigor: whole(v.vigor), code: codeOf(v.code) || undefined, pro, resume };
    }
    case "set": { const f = fields(v.f); return f && { t: "set", f }; }
    case "say": return typeof v.type === "string" && v.type.length <= 16 ? { t: "say", type: v.type, data: v.data } : undefined;
    case "fell": case "again": case "leave": return { t: v.t };
    default: return undefined;
  }
}

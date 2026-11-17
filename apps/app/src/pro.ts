// Pro mode: Survival and Versus for an entry fee in $BLADES, paid from the player's Privy wallet (server/api/pro.js).
// The page only signs what the server builds. A Versus match and a Survival run are played at the arena server, which
// says how they ended and has the pots paid (spec/app/bout.md, "Story: Fight for the pot"; arena/run.ts).
import type { ProSeat } from "./arena/protocol.ts";
import { authHeaders, SITE } from "./scores.ts";

export type ProMode = "survival" | "versus";
/** A paid entry: one Survival run, or one seat in a Versus match (`match`, whose room is `pro<match>`). */
export interface Entry { id: number; mode: ProMode; status: "pending" | "paid" | "failed"; match: number | null; day: string | null }
export interface ProInfo {
  open: boolean; fee: string; mint?: string; decimals?: number; pot?: string;
  survival?: { entries: number; pot: string; top: { id: number; name: string; fighter: number; wave: number; kos: number }[] };
}

const API = `${SITE}/api/pro`;
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify(body) });
  const out = await response.json().catch(() => null);
  if (!response.ok || out?.error) throw new Error(out?.error ?? "Pro mode could not be reached.");
  return out as T;
}

export async function proInfo(): Promise<ProInfo> {
  const response = await fetch(API);
  if (!response.ok) throw new Error("Pro mode could not be reached.");
  return response.json();
}

/** Whole tokens from the server's base units (`decimals` from the mint): "50,000". */
export const tokens = (amount: string, decimals = 0) => (BigInt(amount) / 10n ** BigInt(decimals)).toLocaleString("en-US");

const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const base64 = (data: Uint8Array) => btoa(String.fromCharCode(...data));

/**
 * Pays the fee for `mode` from `wallet`: the server builds the transaction, `sign` (the wallet) signs it, the server
 * sends it. Answers the entry once paid; one the network has not settled yet is asked about again for a while.
 */
export async function payEntry(mode: ProMode, wallet: string, sign: (tx: Uint8Array) => Promise<Uint8Array>): Promise<Entry> {
  const quote = await call<{ tx: string; token: string; lastValid: number }>({ action: "quote", mode, wallet });
  const signed = await sign(bytes(quote.tx));
  const out = await call<{ entry?: Entry; pending?: boolean }>({ action: "enter", mode, wallet, tx: base64(signed), token: quote.token, lastValid: quote.lastValid });
  if (out.entry?.status === "paid") return out.entry;
  throw new Error("The entry is still being confirmed. Check your wallet, then try again in a minute.");
}

export const proWithdraw = (entry: number) => call({ action: "withdraw", entry });
/** A paid seat or run as the arena server takes it: the entry, and the sign-in that shows it is this player's. */
export async function proSeat(entry: Entry): Promise<ProSeat> {
  return { entry: entry.id, token: (await authHeaders()).Authorization?.slice("Bearer ".length) ?? "" };
}

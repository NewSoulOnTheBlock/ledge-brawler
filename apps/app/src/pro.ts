// Pro mode: Survival and Versus for an entry fee in $BLADES on Robinhood Chain, paid from the player's Privy wallet
// (server/api/pro.js). The page only signs what the server hands out: a permit for the pot contract to take the fee,
// which the server sends, paying the gas. A Versus match and a Survival run are played at the arena server, which
// says how they ended and has the pots paid (spec/app/bout.md, "Story: Fight for the pot"; arena/run.ts).
import type { ProSeat } from "./arena/protocol.ts";
import { authHeaders, SITE } from "./scores.ts";

export type ProMode = "survival" | "versus";
/** A paid entry: one Survival run, or one seat in a Versus match (`match`, whose room is `pro<match>`). */
export interface Entry { id: number; mode: ProMode; status: "pending" | "paid" | "failed"; match: number | null; day: string | null }
export interface ProInfo {
  open: boolean; fee?: string; decimals?: number; token?: string; pot?: string; chainId?: number;
  /** What the wallet asked about holds, in base units. */
  held?: string;
  survival?: { entries: number; pot: string; top: { id: number; name: string; fighter: number; wave: number; kos: number }[] };
}

const API = `${SITE}/api/pro`;
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify(body) });
  const out = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok || out?.error) throw new Error(out?.error ?? "Pro mode could not be reached.");
  return out as T;
}

export async function proInfo(wallet?: string): Promise<ProInfo> {
  const response = await fetch(wallet ? `${API}?wallet=${wallet}` : API);
  if (!response.ok) throw new Error("Pro mode could not be reached.");
  return (await response.json()) as ProInfo;
}

/** Whole tokens from the server's base units (`decimals` from the token): "50,000". */
export const tokens = (amount: string, decimals = 0) => (BigInt(amount) / 10n ** BigInt(decimals)).toLocaleString("en-US");

/** What the wallet is asked for: EIP-712 typed data to sign, or a transaction to send. */
export interface Permit { domain: Record<string, unknown>; types: Record<string, { name: string; type: string }[]>; primaryType: string; message: Record<string, unknown> }
export interface Approval { to: string; data: string; chainId: number }
interface Quote { permit?: Permit; approve?: Approval; token: string; deadline: string; nonce: string }

/**
 * Pays the fee for `mode` from `wallet`: the wallet signs the server's permit (`sign`), and the server has the pot take
 * the fee. For a token without permits, the wallet first sends the approval the server asks for (`send`). Answers the
 * entry once paid; one the chain has not settled yet is asked about again for a while.
 */
export async function payEntry(mode: ProMode, wallet: string, sign: (permit: Permit) => Promise<string>, send: (tx: Approval) => Promise<unknown>): Promise<Entry> {
  let quote = await call<Quote>({ action: "quote", mode, wallet });
  if (quote.approve) {
    await send(quote.approve);
    quote = await call<Quote>({ action: "quote", mode, wallet });
  }
  const signature = quote.permit ? await sign(quote.permit) : undefined;
  let { entry } = await call<{ entry: Entry }>({ action: "enter", mode, wallet, signature, token: quote.token, deadline: quote.deadline, nonce: quote.nonce });
  for (let tries = 0; entry.status === "pending" && tries < 20; tries++) {
    await new Promise((done) => setTimeout(done, 3000));
    ({ entry } = await call<{ entry: Entry }>({ action: "check", entry: entry.id }));
  }
  if (entry.status === "paid") return entry;
  throw new Error(entry.status === "failed" ? "The entry did not go through. Nothing was taken." : "The entry is still being confirmed. Try again in a minute.");
}

export const proWithdraw = (entry: number) => call({ action: "withdraw", entry });
/** A paid seat or run as the arena server takes it: the entry, and the sign-in that shows it is this player's. */
export async function proSeat(entry: Entry): Promise<ProSeat> {
  return { entry: entry.id, token: (await authHeaders()).Authorization?.slice("Bearer ".length) ?? "" };
}

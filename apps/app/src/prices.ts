// Prices shown on the home screen (screens.tsx, Prices), read from DexScreener's public API, which prices each token
// from its pools on chain. A token with no address yet (not launched) has no price.
import { proInfo } from "./pro.ts";

/** A token priced; `address` null is $BLADES, whose mint is the one the operator set (server/bot.js), as /api/pro says. */
export interface Ticker { symbol: string; where: string; chain: string; address: string | null }
export interface Quote { usd: number; change: number | null; url: string }

export const TICKERS: Ticker[] = [
  { symbol: "$BLADES", where: "Solana", chain: "solana", address: null },
];

interface Pair { chainId: string; url: string; priceUsd?: string; baseToken: { address: string }; liquidity?: { usd?: number }; priceChange?: { h24?: number } }

/** The token's price in its deepest pool where it is the thing priced, or null when it has none. */
export async function quoteOf(ticker: Ticker): Promise<Quote | null> {
  const { chain } = ticker, address = ticker.address ?? (await proInfo()).mint;
  if (!address) return null;
  const response = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${address}`);
  if (!response.ok) throw new Error(`DexScreener ${response.status}`);
  const pairs = ((await response.json()) as Pair[]).filter((p) => p.chainId === chain && p.priceUsd && p.baseToken.address.toLowerCase() === address.toLowerCase());
  const deepest = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return deepest ? { usd: Number(deepest.priceUsd), change: deepest.priceChange?.h24 ?? null, url: deepest.url } : null;
}

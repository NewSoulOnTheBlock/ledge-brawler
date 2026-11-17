// Token-gated cosmetics: check if the player's wallet holds a specific token.
// The token address and RPC are configurable. When no token is configured, the gate is open.

const RPC = "https://api.mainnet-beta.solana.com";

export interface GateResult {
  held: boolean;
  balance: number;
}

/** Check if `wallet` holds any amount of the SPL token at `mint`. Returns { held, balance }. */
export async function checkTokenGate(wallet: string, mint?: string): Promise<GateResult> {
  if (!mint || !wallet) return { held: false, balance: 0 };
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner",
        params: [wallet, { mint }, { encoding: "jsonParsed" }],
      }),
    });
    const json = await res.json();
    const accounts = json?.result?.value ?? [];
    let total = 0;
    for (const acct of accounts) {
      const amount = acct?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      total += amount;
    }
    return { held: total > 0, balance: total };
  } catch {
    return { held: false, balance: 0 };
  }
}

/** Check if `wallet` has any SOL balance (simpler gate). */
export async function checkSolGate(wallet: string): Promise<GateResult> {
  if (!wallet) return { held: false, balance: 0 };
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getBalance",
        params: [wallet],
      }),
    });
    const json = await res.json();
    const lamports = json?.result?.value ?? 0;
    const sol = lamports / 1e9;
    return { held: sol > 0, balance: sol };
  } catch {
    return { held: false, balance: 0 };
  }
}

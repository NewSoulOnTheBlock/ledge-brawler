// Pro mode's way in: the rules of the pot, the fee, and paying it from the player's Privy wallet (pro.ts).
import { useEffect, useState } from "react";
import { useCreateWallet, useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { cn } from "@repo/ui";
import { useAuth } from "./auth.tsx";
import { type Entry, type ProInfo, type ProMode, payEntry, proInfo, tokens } from "./pro.ts";
import { BigButton, SmallButton } from "./screens.tsx";
import { checkTokenGate } from "./token-gate.ts";

const RULES: Record<ProMode, string[]> = {
  survival: [
    "One entry is one run. Your best wave, then knockouts, is your score. Quitting a run before it ends forfeits it.",
    "When the UTC day ends, the highest run takes every fee paid that day.",
    "Winning runs are checked before the pot is paid out.",
  ],
  versus: [
    "Up to five paid seats per match. Last one standing takes the whole pot.",
    "The arena server referees the match and pays the pot to whoever it sees left standing, the moment it ends.",
    "Nobody else joins? Leave the match and your fee comes back.",
  ],
};

const card = "grid w-full max-w-[460px] gap-3 border-2 border-foreground bg-card px-6 py-5 shadow-[6px_6px_0_var(--foreground)]";

/** Over the select screen: what a pro entry is, and paying for one. `onPaid` gets the entry to play it with. */
export function ProEntry({ mode, onPaid, onCancel }: { mode: ProMode; onPaid: (entry: Entry) => void; onCancel: () => void }) {
  const { configured, authenticated, login } = useAuth();
  const [info, setInfo] = useState<ProInfo | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => { proInfo().then(setInfo, () => setFailed(true)); }, []);
  return (
    <div className="absolute inset-0 z-40 grid [place-items:safe_center] bg-background/80 px-4 py-4">
      <section aria-labelledby="proTitle" className={card}>
        <p className="text-xs tracking-[0.2em] text-destructive uppercase">Pro · entry {info ? tokens(info.fee) : "50,000"} $BLADES</p>
        <h2 id="proTitle" className="font-sans text-2xl font-bold tracking-[0.1em] uppercase">Pro {mode === "survival" ? "Survival" : "Versus"}</h2>
        <ul className="grid list-disc gap-1 pl-5 text-[13px] leading-snug">{RULES[mode].map((line) => <li key={line}>{line}</li>)}</ul>
        {mode === "survival" && info?.survival && (
          <p className="text-[13px]">Today's pot: <b className="tabular-nums">{tokens(info.survival.pot, info.decimals)} $BLADES</b> from {info.survival.entries} {info.survival.entries === 1 ? "entry" : "entries"}.</p>
        )}
        {failed ? <p role="alert" className="text-[13px] text-destructive">Pro mode could not be reached.</p>
          : !info ? <p className="text-[13px] text-muted-foreground">Loading…</p>
          : !info.open ? <p className="text-[13px] text-muted-foreground">Pro mode opens when $BLADES launches. Play Casual for now.</p>
          : !configured ? <p className="text-[13px] text-muted-foreground">Sign-in is not available on this build.</p>
          : !authenticated ? <BigButton onClick={login}>Sign in to enter</BigButton>
          : <Pay mode={mode} info={info} onPaid={onPaid} />}
        <SmallButton className="justify-self-start" onClick={onCancel}>Back</SmallButton>
      </section>
    </div>
  );
}

/** The signed-in player's Solana wallet, what it holds, and the button that pays. Only rendered under PrivyProvider. */
function Pay({ mode, info, onPaid }: { mode: ProMode; info: ProInfo; onPaid: (entry: Entry) => void }) {
  const { ready, wallets } = useWallets(), { createWallet } = useCreateWallet(), { signTransaction } = useSignTransaction();
  const wallet = wallets[0];
  const [held, setHeld] = useState<number | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (wallet) void checkTokenGate(wallet.address, info.mint).then((gate) => setHeld(gate.balance)); }, [wallet, info.mint]);
  const fee = Number(info.fee), short = held !== null && held < fee;
  if (!ready) return <p className="text-[13px] text-muted-foreground">Loading your wallet…</p>;
  if (!wallet) return <BigButton onClick={() => void createWallet().catch((e: unknown) => setError(String((e as Error)?.message ?? e)))}>Create my wallet</BigButton>;
  const pay = async () => {
    setBusy(true); setError("");
    try {
      onPaid(await payEntry(mode, wallet.address, async (transaction) => (await signTransaction({ transaction, wallet })).signedTransaction));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid gap-2 text-[13px]">
      <p>Paying from <span className="font-mono select-all" title={wallet.address}>{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span>
        {held !== null && <> · holds <b className="tabular-nums">{Math.floor(held).toLocaleString("en-US")}</b> $BLADES</>}</p>
      {short && <p className="text-destructive">This wallet needs {fee.toLocaleString("en-US")} $BLADES. Send some to the address above first.</p>}
      <BigButton disabled={busy || short} className={cn(busy && "opacity-60")} onClick={() => void pay()}>{busy ? "Paying…" : `Pay ${fee.toLocaleString("en-US")} $BLADES and enter`}</BigButton>
      <p className="text-[11px] text-muted-foreground">The game pays the network fee. Entry fees are not refunded once your run or match has started.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}

import { cn } from "@repo/ui";
import { useEffect, useState } from "react";

export interface WalletAddressProps {
  /** The full address; it is shown shortened and copied whole. */
  address: string;
  className?: string;
}

/** A wallet address as one button: a tap copies the whole address, and the button says so for a moment. */
export function WalletAddress({ address, className }: WalletAddressProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      title={address}
      aria-label={copied ? "Wallet address copied" : `Copy wallet address ${address}`}
      onClick={() => void navigator.clipboard?.writeText(address).then(() => setCopied(true), () => undefined)}
      className={cn("inline-flex min-h-8 cursor-pointer items-center gap-1.5 border border-current/30 px-2 py-1 font-mono hover:border-current/70 active:scale-[0.97]", className)}
    >
      <span>{copied ? "Copied" : `${address.slice(0, 6)}…${address.slice(-4)}`}</span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
        {copied ? <path d="M3 8.5l3 3 7-7" /> : <><rect x="5.5" y="5.5" width="8" height="8" /><path d="M10.5 3.5v-1h-8v8h1" /></>}
      </svg>
    </button>
  );
}

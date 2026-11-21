import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { AuthGate } from "./auth.tsx";
import { App } from "./App.tsx";
import "./main.css";
import { runtimeOn } from "./runtime.ts";
import { Safe } from "./Safe.tsx";

const runtime = runtimeOn(KeyValueStore.layerStorage(() => localStorage));
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

// The operator's dashboard (Admin.tsx) has its own address and is loaded only there.
const Admin = lazy(() => import("./Admin.tsx").then((m) => ({ default: m.Admin })));
const game = location.pathname.replace(/\/$/, "") === "/admin"
  ? <Safe><Suspense fallback={null}><Admin /></Suspense></Safe>
  : <Safe><App runtime={runtime} /></Safe>;

const root = (
  <StrictMode>
    {privyAppId ? (
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ["email", "google", "twitter"],
          // No outside wallets on the sign-in screen: listing any makes Privy fetch WalletConnect's 1.2 MB directory on every visit.
          appearance: { theme: "dark", accentColor: "#d63c28", walletList: [] },
          // A Solana wallet for everyone who signs in: pro entries are paid from it (pro.ts).
          embeddedWallets: { solana: { createOnLogin: "all-users" }, showWalletUIs: false },
          // Players sign in by email or a social account and pay from the embedded wallet; no outside wallet is linked,
          // so WalletConnect is not started either.
          externalWallets: { walletConnect: { enabled: false } },
        }}
      >
        <AuthGate>{game}</AuthGate>
      </PrivyProvider>
    ) : (
      game
    )}
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(root);

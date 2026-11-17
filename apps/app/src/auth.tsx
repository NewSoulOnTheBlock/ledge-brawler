import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  wallet?: string;
}

interface AuthState {
  /** Whether sign-in is set up at all (VITE_PRIVY_APP_ID): Privy's own hooks may only be used when it is. */
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const noAuth: AuthState = {
  configured: false,
  ready: true,
  authenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
  getAccessToken: async () => null,
};

const AuthContext = createContext<AuthState>(noAuth);

export function AuthGate({ children }: { children: ReactNode }) {
  const privy = usePrivy();

  const user: AuthUser | null = useMemo(() => {
    if (!privy.authenticated || !privy.user) return null;
    // The address signed in with: by email, or the one a Google account brings.
    const email = privy.user.email?.address ?? privy.user.google?.email;
    const wallet = privy.user.wallet?.address;
    return { id: privy.user.id, email, wallet, name: email?.split("@")[0] };
  }, [privy.authenticated, privy.user]);

  const getAccessToken = useCallback(async () => {
    try { return await privy.getAccessToken(); } catch { return null; }
  }, [privy]);

  const value: AuthState = useMemo(() => ({
    configured: true,
    ready: privy.ready,
    authenticated: privy.authenticated,
    user,
    login: privy.login,
    logout: privy.logout,
    getAccessToken,
  }), [privy.ready, privy.authenticated, user, privy.login, privy.logout, getAccessToken]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AUTH_LOGOUT_EVENT } from "@/lib/api";
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  type AdminUser,
} from "./auth.api";

export type AuthStatus = "loading" | "authed" | "anon";

export interface AuthContextValue {
  user: AdminUser | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  /**
   * On mount, ask the API who we are. If the access cookie has expired but the
   * refresh cookie is still valid, the axios interceptor silently refreshes and
   * replays this call -- so a returning user lands straight in the app.
   */
  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authed");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("anon");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The interceptor fires this when a refresh attempt fails for good.
  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null);
      setStatus("anon");
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const me = await loginRequest(email, password);
    setUser(me);
    setStatus("authed");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // Clear locally even if the request failed -- the user asked to leave.
      setUser(null);
      setStatus("anon");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut }),
    [user, status, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

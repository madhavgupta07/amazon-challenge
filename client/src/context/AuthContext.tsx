import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, getToken, setToken } from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const { user: current } = await api.me();
      setUser(current);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setInitializing(false));
  }, [refresh]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const { user: current, token } = await api.login(input);
    setToken(token);
    setUser(current);
  }, []);

  const register = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const { user: current, token } = await api.register(input);
      setToken(token);
      setUser(current);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, refresh, setUser }),
    [user, initializing, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

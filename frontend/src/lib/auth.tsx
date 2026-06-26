import { createContext, useContext, useState, type ReactNode } from "react";
import { clearToken, getToken, setToken } from "@/lib/api";

const USER_KEY = "tr_username";

interface AuthContextValue {
  token: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  login: (token: string, userName: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [userName, setUserNameState] = useState<string | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) return stored;
    // Fallback: decode JWT to get 'name' claim (handles pre-existing sessions)
    const t = getToken();
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload["name"] ?? payload["email"] ?? null;
    } catch {
      return null;
    }
  });

  const login = (newToken: string, newUserName: string) => {
    setToken(newToken);
    setTokenState(newToken);
    localStorage.setItem(USER_KEY, newUserName);
    setUserNameState(newUserName);
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUserNameState(null);
  };

  return (
    <AuthContext.Provider value={{ token, userName, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

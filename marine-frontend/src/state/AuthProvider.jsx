import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";

const STORAGE_KEY = "samudra-auth";

// Demo-prototype auth: there is no backend auth API (see Login.jsx), so a
// "session" is just role + id, kept in sessionStorage so a refresh doesn't
// log the user out but closing the tab does. This is enough to gate the
// dashboard/authority views behind an actual login screen instead of
// letting anyone type the URL and skip it.
function readStoredSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.role === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const login = useCallback((role, id, secondary) => {
    const next = { role, id, secondary, loggedInAt: new Date().toISOString() };
    setSession(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage unavailable (e.g. private mode) — session still
      // works for this render tree, it just won't survive a refresh.
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures; in-memory session still clears.
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      role: session?.role || null,
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

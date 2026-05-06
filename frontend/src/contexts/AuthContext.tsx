import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { UserProfile } from '../lib/types';

export type Session = {
  token: string;
  profile: UserProfile;
};

type AuthContextValue = {
  clearSession: () => void;
  restoredSessionToken: string | null;
  session: Session | null;
  setSession: (session: Session | null) => void;
};

const storageKey = 'hospital-system.session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [restoredSessionToken] = useState<string | null>(
    () => readStoredValue<Session>(storageKey)?.token ?? null,
  );
  const [sessionState, setSessionState] = useState<Session | null>(() =>
    readStoredValue<Session>(storageKey),
  );

  const setSession = useCallback((nextSession: Session | null) => {
    setSessionState(nextSession);

    if (nextSession) {
      localStorage.setItem(storageKey, JSON.stringify(nextSession));
      return;
    }

    localStorage.removeItem(storageKey);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
  }, [setSession]);

  const value = useMemo(
    () => ({
      clearSession,
      restoredSessionToken,
      session: sessionState,
      setSession,
    }),
    [clearSession, restoredSessionToken, sessionState, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}

function readStoredValue<T>(key: string) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

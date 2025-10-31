import { AxiosError } from 'axios';
import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from './api';
import { StoredAuth, createEmptyAuth, loadStoredAuth, persistAuth } from './authStorage';

export type AuthUser = NonNullable<StoredAuth['user']>;

interface Credentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: StoredAuth['user'];
  accessToken: string | null;
  refreshToken: string | null;
  login: (credentials: Credentials) => Promise<AuthUser>;
  logout: () => void;
  setAuthState: (payload: StoredAuth) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

type LoginResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<StoredAuth>(() => loadStoredAuth() ?? createEmptyAuth());

  const setAuthState = useCallback((payload: StoredAuth) => {
    setState(payload);
    persistAuth(payload);
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials);
      const nextState: StoredAuth = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      setAuthState(nextState);
      return data.user;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error;
      }
      throw new Error('Unable to complete login');
    }
  }, [setAuthState]);

  const logout = useCallback(() => {
    const emptyState = createEmptyAuth();
    setState(emptyState);
    persistAuth(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    login,
    logout,
    setAuthState,
  }), [state, login, logout, setAuthState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

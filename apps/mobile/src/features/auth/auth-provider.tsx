import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import type { LoginDto, RegisterDto, UpdateUserDto } from '@nexa/types';
import { apiUrl } from '../../config/env';
import { AuthService, type AuthSession } from './auth-service';
import { sessionStorage } from './session-storage';
import { authErrorMessage } from './auth-errors';

const service = new AuthService(apiUrl, sessionStorage);
interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  restorationError: string | null;
  retryRestore(): Promise<void>;
  login(values: LoginDto, remember: boolean): Promise<void>;
  register(values: RegisterDto): Promise<void>;
  updateProfile(values: UpdateUserDto): Promise<void>;
  logout(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [restorationError, setRestorationError] = useState<string | null>(null);
  const retryRestore = useCallback(async () => {
    setLoading(true);
    setRestorationError(null);
    try {
      setSession(await service.restore());
    } catch (error) {
      setRestorationError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void service
      .restore()
      .then((restored) => {
        if (active) setSession(restored);
      })
      .catch((error: unknown) => {
        if (active) setRestorationError(authErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        restorationError,
        retryRestore,
        login: async (values, remember) => {
          setSession(await service.login(values, remember));
          setRestorationError(null);
        },
        register: async (values) => {
          setSession(await service.register(values));
          setRestorationError(null);
        },
        updateProfile: async (values) => {
          setSession(await service.updateProfile(values));
        },
        logout: async () => {
          try {
            await service.logout();
          } finally {
            setSession(null);
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

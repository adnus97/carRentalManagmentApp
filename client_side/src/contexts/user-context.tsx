// src/contexts/user-context.tsx
import { Loader } from '@/components/loader';
import type { User } from '@/types/user'; // ✅ Import from types
import { getCurrentUser } from '@/api/auth';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from 'react';

export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void; // ✅ Change to function signature
  is_authenticated: boolean;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

const AUTH_KEY = 'authUser';

const useAuthProvider = (): UserContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false); // ✅ Add this
  const is_authenticated = !!user;

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();

      if (userData) {
        setUser(userData);
        localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      localStorage.removeItem(AUTH_KEY);
    } finally {
      setLoading(false);
      setInitialized(true); // ✅ Mark as initialized after first fetch
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      // ✅ Don't load from localStorage first - go straight to fresh data
      await refreshUser();
    };

    initializeUser();
  }, []);

  return {
    user,
    setUser,
    is_authenticated,
    refreshUser,
  };
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const auth = useAuthProvider();
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => {
      setMounted(true);
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // ✅ Show loader while auth is initializing
  if (!mounted) {
    return <Loader />;
  }

  return <UserContext.Provider value={auth}>{children}</UserContext.Provider>;
};

// src/contexts/user-context.tsx
import { Loader } from '@/components/loader';
import type { User } from '@/types/user';
import { authClient } from '@/lib/auth-client';
import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from 'react';

export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => Promise<void>;
  is_authenticated: boolean;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { data: session, isPending, error } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  const user = (session?.user as User) || null;
  const is_authenticated = !!user;

  // No-op refresh: useSession will update on auth changes
  const refreshUser = async () => {
    // Optional: force getSession once, but not necessary
    await authClient.getSession();
  };

  // setUser wrapper to keep interface compatible
  const setUser = async (newUser: User | null) => {
    if (!newUser) {
      await authClient.signOut();
    } else {
      // Typically you don’t set user manually when using useSession
      await refreshUser();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || isPending) return <Loader />;

  if (error) {
    console.error('Session error:', error);
  }

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        is_authenticated,
        refreshUser,
        isLoading: isPending,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

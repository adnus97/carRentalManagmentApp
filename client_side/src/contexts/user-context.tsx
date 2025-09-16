import { Loader } from '@/components/loader';
import type { User } from '../types/user';
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
  // IMPORTANT: make this a React state setter type
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  is_authenticated: boolean;
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
  const is_authenticated = !!user;

  useEffect(() => {
    const localUser = localStorage.getItem(AUTH_KEY);
    if (!user && localUser) {
      const parsedUser = JSON.parse(localUser) as User;
      setUser(parsedUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    setUser,
    is_authenticated,
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

  return (
    <UserContext.Provider value={auth}>
      {mounted ? children : <Loader />}
    </UserContext.Provider>
  );
};

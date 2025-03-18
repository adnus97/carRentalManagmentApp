import { Loader } from '@/components/loader';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from 'react';

// 1. Define the user type
interface User {
  id: string;
  email: string;
  name: string;
  image: string | null | undefined;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// 2. Define the context type
export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  is_authenticated: boolean;
}
// 3. Create the context with a default value (undefined initially)
export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

// 4. Custom hook for easier access
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// 5. Provider component
interface UserProviderProps {
  children: ReactNode; // Accepts children elements
}
// Define a constant for the localStorage key
const AUTH_KEY = 'authUser';

// 6. Create the provider
const useAuthProvider = (): UserContextType => {
  const [user, setUser] = useState<User | null>(null);
  const is_authenticated = !!user;

  useEffect(() => {
    const localUser = localStorage.getItem(AUTH_KEY);
    console.log(localUser);

    if (!user && localUser) {
      const parsedUser = JSON.parse(localUser) as User;
      setUser(parsedUser);
    }
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

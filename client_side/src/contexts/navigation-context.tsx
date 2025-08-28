'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type NavigationContextType = {
  entityName: string | null;
  entityHref: string | null;
  setEntity: (name: string | null, href?: string | null) => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [entityName, setEntityName] = useState<string | null>(null);
  const [entityHref, setEntityHref] = useState<string | null>(null);

  const setEntity = (name: string | null, href: string | null = null) => {
    setEntityName(name);
    setEntityHref(href);
  };

  return (
    <NavigationContext.Provider value={{ entityName, entityHref, setEntity }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error(
      'useNavigationContext must be used inside NavigationProvider',
    );
  }
  return ctx;
}

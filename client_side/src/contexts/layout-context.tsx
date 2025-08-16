// src/context/LayoutContext.tsx
import { createContext, useContext } from 'react';

type LayoutContextType = {
  headerHeight: number;
};

export const LayoutContext = createContext<LayoutContextType>({
  headerHeight: 0,
});

export const useLayoutContext = () => useContext(LayoutContext);

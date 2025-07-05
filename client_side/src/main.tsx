import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import { UserProvider, useUser } from './contexts/user-context';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme/theme-provider';

//import { Toaster } from './components/ui/toaster';
import { Toaster } from 'sonner';
import { ModeToggle } from './components/mode-toggle';

const router = createRouter({
  routeTree,
  context: { auth: undefined! },
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
const queryClient = new QueryClient();

function InnerApp() {
  const auth = useUser();
  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  return (
    <UserProvider>
      <InnerApp />
    </UserProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <div className="w-full h-full flex justify-center items-center">
            <div className="absolute p-3 top-0 right-0 z-[40] w-fit h-fit">
              <ModeToggle />
            </div>
            <App />
            <Toaster />
          </div>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  </StrictMode>,
);

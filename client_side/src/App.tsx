import { LoginForm } from './components/Auth/Login-form';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { ThemeProvider } from './components/theme-provider';
import { ModeToggle } from './components/mode-toggle';

const router = createRouter({ routeTree });

const queryClient = new QueryClient();

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  // const [count, setCount] = useState(5);

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <div className="sticky p-4 justify-self-end z-[100] w-fit">
            <ModeToggle />
          </div>
          <div className="w-full h-full flex justify-center items-center">
            <RouterProvider router={router} />
          </div>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}

export default App;

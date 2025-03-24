import { UserContextType, useUser } from '@/contexts/user-context';
import {
  createRootRoute,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_REACT_API_URL;
axios.defaults.withCredentials = true;

type RouterContext = {
  auth: UserContextType;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

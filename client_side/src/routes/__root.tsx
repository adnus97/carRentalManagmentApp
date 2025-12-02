import { UserContextType } from '@/contexts/user-context';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
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

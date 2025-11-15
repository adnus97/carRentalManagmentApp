import {
  CarProfile,
  UserList,
  ChartDonut,
  Gear,
  BuildingOffice,
  Key,
  Bell,
  SquaresFour,
  Users,
  ShieldCheck,
} from '@phosphor-icons/react';

export const navigationConfig = {
  // Regular user navigation
  navMain: [
    {
      title: 'breadcrumbs.cars',
      url: '/dashboard',
      icon: <CarProfile size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.clients',
      url: '/clients',
      icon: <UserList size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.rents',
      url: '/rents',
      icon: <Key size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.reports',
      url: '/reports',
      icon: <ChartDonut size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.organization',
      url: '/Organization',
      icon: <BuildingOffice size={20} weight="duotone" />,
    },
    {
      title: 'notifications.menu', // add this key in layout.json or another namespace
      url: '/notifications',
      icon: <Bell size={20} weight="duotone" />,
    },
  ],

  // Admin navigation
  navAdmin: [
    {
      title: 'breadcrumbs.dashboard',
      url: '/admin/dashboard',
      icon: <SquaresFour size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.users',
      url: '/admin/users',
      icon: <Users size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.organizations',
      url: '/admin/organizations',
      icon: <BuildingOffice size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.settings',
      url: '/admin/settings',
      icon: <Gear size={20} weight="duotone" />,
    },
    {
      title: 'breadcrumbs.system',
      url: '/admin/system',
      icon: <ShieldCheck size={20} weight="duotone" />,
    },
  ],
};

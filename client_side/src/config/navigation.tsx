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
      title: 'Cars',
      url: '/dashboard',
      icon: <CarProfile size={20} weight="duotone" />,
    },
    {
      title: 'Clients',
      url: '/clients',
      icon: <UserList size={20} weight="duotone" />,
    },
    {
      title: 'Rents',
      url: '/rents',
      icon: <Key size={20} weight="duotone" />,
    },
    {
      title: 'Reports',
      url: '/reports',
      icon: <ChartDonut size={20} weight="duotone" />,
    },
    {
      title: 'Organization',
      url: '/Organization',
      icon: <BuildingOffice size={20} weight="duotone" />,
    },
    {
      title: 'Notifications',
      url: '/notifications',
      icon: <Bell size={20} weight="duotone" />,
    },
  ],

  // Admin navigation
  navAdmin: [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: <SquaresFour size={20} weight="duotone" />,
    },
    {
      title: 'Users',
      url: '/admin/users',
      icon: <Users size={20} weight="duotone" />,
    },
    {
      title: 'Organizations',
      url: '/admin/organizations',
      icon: <BuildingOffice size={20} weight="duotone" />,
    },
    {
      title: 'Settings',
      url: '/admin/settings',
      icon: <Gear size={20} weight="duotone" />,
    },
    {
      title: 'System',
      url: '/admin/system',
      icon: <ShieldCheck size={20} weight="duotone" />,
    },
  ],
};

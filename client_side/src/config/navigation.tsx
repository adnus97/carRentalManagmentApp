import {
  CarProfile,
  UserList,
  ChartDonut,
  Gear,
  BuildingOffice,
  Key,
} from '@phosphor-icons/react';

export const navigationConfig = {
  navMain: [
    {
      title: `Cars`,
      url: '/dashboard',
      icon: <CarProfile size={40} />,
    },
    {
      title: 'Clients',
      url: '/clients',
      icon: <UserList size={40} />,
    },
    {
      title: 'Rents',
      url: '/rents',
      icon: <Key size={96} />,
    },
    {
      title: 'Reports',
      url: '/reports',
      icon: <ChartDonut size={40} />,
    },
    {
      title: 'Organization',
      url: '/Organization',
      icon: <BuildingOffice size={40} />,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: <Gear size={40} />,
    },
  ],
};

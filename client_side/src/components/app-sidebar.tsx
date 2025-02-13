import * as React from 'react';
import { ChevronRight, Icon, icons, Table } from 'lucide-react';

import { SearchForm } from '@/components/search-form';
import { VersionSwitcher } from '@/components/version-switcher';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { CarProfile, UserList, ChartDonut, Gear } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

// This is sample data.
const data = {
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
      title: 'Reports',
      url: '/reports',
      icon: <ChartDonut size={40} />,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: <Gear size={40} />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} className="bg-gray-3 border-r-gray-4">
      <SidebarHeader>
        <SearchForm className="pt-5" />
      </SidebarHeader>

      <SidebarContent className="gap-1 ml-4">
        {/* {data.navMain.map((item) => (
          <Collapsible
            key={item.title}
            title={item.title}
            defaultOpen
            className="group/collapsible "
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sm text-sidebar-foreground hover:bg-gray-9  hover:text-sidebar-accent-foreground "
              >
                <CollapsibleTrigger asChild>
                  <Link
                    to={item.url}
                    className="data-[status=active]:bg-gray-4"
                  >
                    {item?.icon}
                    <span className="ml-3"> {item.title}</span>
                  </Link>
                </CollapsibleTrigger>
              </SidebarGroupLabel>
            </SidebarGroup>
          </Collapsible>
        ))} */}
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => {
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className="data-[status=active]:bg-gray-4"
                    >
                      {item?.icon}
                      <span className="ml-3"> {item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* <SidebarRail /> */}
    </Sidebar>
  );
}

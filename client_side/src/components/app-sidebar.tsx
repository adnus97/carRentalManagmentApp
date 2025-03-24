import * as React from 'react';
import { SearchForm } from '@/components/search-form';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  CarProfile,
  UserList,
  ChartDonut,
  Gear,
  BuildingOffice,
  CaretUpDown,
  UserSquare,
  User,
  SignOut,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Separator } from './ui/separator';

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} className="bg-gray-3 border-r-gray-4">
      <SidebarHeader>
        <SearchForm className="pt-5" />
      </SidebarHeader>

      <SidebarContent className="gap-1 ml-4 h-full flex flex-col">
        <SidebarGroup className="flex-1">
          <SidebarMenu className="flex flex-col h-full">
            {data.navMain.slice(0, -1).map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild>
                  <Link
                    to={item.url}
                    className="hover:bg-gray-4 data-[status=active]:bg-gray-4"
                  >
                    {item.icon}
                    <span className="ml-3">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* Push Settings to the Bottom */}
            <div className="mt-auto">
              {data.navMain.slice(-1).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className="hover:bg-gray-4 data-[status=active]:bg-gray-4"
                    >
                      {item.icon}
                      <span className="ml-3">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarFooter className="pl-0 h-16">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton className="gap-5 h-full">
                          <User />{' '}
                          <div className="flex flex-col">
                            <span>Username</span>{' '}
                            <span className="text-xs">m@gmail.com</span>
                          </div>
                          <CaretUpDown size={40} className="ml-auto" />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="top"
                        className="w-[--radix-popper-anchor-width] "
                      >
                        <div className="flex items-center gap-3 p-2">
                          {' '}
                          <User />{' '}
                          <div className="flex flex-col ">
                            <span>Username</span>{' '}
                            <span className="text-xs">m@gmail.com</span>
                          </div>
                        </div>

                        <Separator />

                        <DropdownMenuItem className="mb-2 mt-2">
                          <User size={40} />
                          <span>Account</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem>
                          <SignOut size={40} /> <span>Sign out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </div>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* <SidebarRail /> */}
    </Sidebar>
  );
}

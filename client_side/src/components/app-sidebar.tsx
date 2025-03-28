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
  User,
  SignOut,
} from '@phosphor-icons/react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { useUser } from '@/contexts/user-context';
import { useQuery } from '@tanstack/react-query';
import { getOrganizationsByUserId } from '@/api/organization';
import { UserDefaultImg } from './user-defaultImg';
import { authClient } from '@/lib/auth-client';
import { error } from 'console';

interface Organization {
  name: string;
  userId: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  id: string;
}
// This is sample data.
const navData = {
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
  const { user } = useUser();
  const router = useRouter();
  const { data, isLoading } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: getOrganizationsByUserId,
  }) as { data: Organization[] | undefined; isLoading: boolean };

  return (
    <Sidebar {...props} className="bg-gray-3 border-r-gray-4">
      <SidebarHeader>
        <SearchForm className="pt-5" />
      </SidebarHeader>

      <SidebarContent className="gap-1 ml-4 h-full flex flex-col">
        <SidebarGroup className="flex-1">
          <SidebarMenu className="flex flex-col h-full">
            {navData.navMain.slice(0, -1).map((item) => (
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
              {navData.navMain.slice(-1).map((item: any) => (
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
            </div>
            <Separator className="mb-2" />
            <SidebarFooter className="h-16 -ml-3 bg-gray-2 rounded-s">
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="gap-2 h-full">
                        {!isLoading && data?.[0]?.image ? (
                          <div className="flex space-x-3 ">
                            <img
                              src={data[0].image}
                              alt="org image"
                              className="w-12 h-12 rounded-[50%]"
                            />
                            <div className="flex flex-col">
                              <span className="text-gray-12">{user?.name}</span>
                              <span className="text-xs text-gray-10">
                                {user?.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {' '}
                            <UserDefaultImg
                              name={user?.name || ''}
                              email={user?.email || ''}
                            />
                          </div>
                        )}

                        <CaretUpDown size={40} className="ml-auto" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      className="w-[--radix-popper-anchor-width] "
                    >
                      <div className="flex items-center gap-3 p-2">
                        {!isLoading && data?.[0]?.image ? (
                          <div className="flex space-x-3 ">
                            <img
                              src={data[0].image}
                              alt="org image"
                              className="w-12 h-12 rounded-[50%]"
                            />
                            <div className="flex flex-col">
                              <span className="text-gray-12">{user?.name}</span>
                              <span className="text-xs text-gray-10">
                                {user?.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {' '}
                            <UserDefaultImg
                              name={user?.name || ''}
                              email={user?.email || ''}
                            />
                          </div>
                        )}
                      </div>

                      <Separator />

                      <DropdownMenuItem className="mb-2 mt-2">
                        <User size={40} />
                        <span>Account</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={async () => {
                          await authClient.signOut({
                            fetchOptions: {
                              onSuccess: () => {
                                console.log('logged out');
                                try {
                                  localStorage.removeItem('authUser');
                                  router.navigate({ to: '/login' });
                                } catch (err: any) {
                                  throw new Error(err);
                                }
                              },
                            },
                          });
                        }}
                      >
                        <SignOut size={40} /> <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* <SidebarRail /> */}
    </Sidebar>
  );
}

// import * as React from 'react';
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
import { ConfirmationDialog } from './confirmation-dialog';
import React from 'react';

interface Organization {
  name: string;
  userId: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  id: string;
}

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
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false);

  const { data, isLoading } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: getOrganizationsByUserId,
  }) as { data: Organization[] | undefined; isLoading: boolean };

  const handleSignOut = async () => {
    await authClient.signOut();
    localStorage.removeItem('authUser');
    router.navigate({ to: '/login' });
  };

  return (
    <>
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

              <div className="mt-auto">
                {navData.navMain.slice(-1).map((item) => (
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

              <SidebarFooter className="p-0 border-t border-gray-6 bg-gray-1  rounded-sm">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton className="h-16 px-4 py-3 hover:bg-gray-3 transition-colors duration-200 group">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {!isLoading && data?.[0]?.image ? (
                              <img
                                src={data[0].image}
                                alt="Organization"
                                className="w-10 h-10 rounded-full ring-2 ring-gray-6 group-hover:ring-gray-7 transition-all duration-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 flex-shrink-0">
                                <UserDefaultImg
                                  name={user?.name || ''}
                                  email={user?.email || ''}
                                />
                              </div>
                            )}

                            <div className="flex flex-col justify-center min-w-0 flex-1">
                              <span className="text-sm font-medium text-gray-12 truncate">
                                {user?.name || 'User'}
                              </span>
                              <span className="text-xs text-gray-10 truncate">
                                {user?.email || 'user@example.com'}
                              </span>
                            </div>
                          </div>

                          <CaretUpDown
                            size={16}
                            className="text-gray-10 group-hover:text-gray-11 transition-colors duration-200 flex-shrink-0"
                          />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        side="top"
                        align="start"
                        className="w-64 p-2 bg-white dark:bg-gray-2 border border-gray-6 shadow-lg rounded-lg"
                        sideOffset={8}
                      >
                        {/* User Info Header */}
                        <div className="flex items-center gap-3 p-3 rounded-md bg-gray-1 dark:bg-gray-3 mb-2">
                          {!isLoading && data?.[0]?.image ? (
                            <img
                              src={data[0].image}
                              alt="Organization"
                              className="w-10 h-10 rounded-full ring-2 ring-gray-6"
                            />
                          ) : (
                            <div className="w-10 h-10">
                              <UserDefaultImg
                                name={user?.name || ''}
                                email={user?.email || ''}
                              />
                            </div>
                          )}

                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-12 truncate">
                              {user?.name || 'User'}
                            </span>
                            <span className="text-xs text-gray-10 truncate">
                              {user?.email || 'user@example.com'}
                            </span>
                          </div>
                        </div>

                        <Separator className="my-2" />

                        {/* Menu Items */}
                        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-3 dark:hover:bg-gray-4 transition-colors duration-150 cursor-pointer">
                          <User size={18} className="text-gray-10" />
                          <span className="text-sm font-medium text-gray-12">
                            Account Settings
                          </span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => setShowSignOutDialog(true)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:!bg-red-50  dark:hover:!bg-red-950/20 transition-colors duration-150 cursor-pointer !text-red-600 dark:text-red-400"
                        >
                          <SignOut size={18} />
                          <span className="text-sm font-medium">Sign Out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <ConfirmationDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        title="Sign Out"
        description="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        loadingText="Signing out..."
        variant="destructive"
      />
    </>
  );
}

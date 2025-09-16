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
import { getOrganizationByUser, Organization } from '@/api/organization';
import { UserDefaultImg } from './user-defaultImg';
import { authClient } from '@/lib/auth-client';
import { ConfirmationDialog } from './confirmation-dialog';
import { navigationConfig } from '@/config/navigation';
import { NotificationsDropdown } from './notifications/notification-dropdown';
import { useQueryClient } from '@tanstack/react-query';

import React from 'react';
import { Skeleton } from './ui/skeleton';

const navData = navigationConfig;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, setUser } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false);

  const { data, isLoading } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: getOrganizationByUser,
  }) as { data: Organization[] | undefined; isLoading: boolean };

  const handleSignOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    localStorage.removeItem('authUser');
    setUser(null);
    router.navigate({ to: '/login' });
  };

  return (
    <>
      <Sidebar {...props} className="bg-gray-3 border-r-gray-4">
        {/* ✅ Completely empty header */}
        <SidebarHeader className="h-0 p-0 border-0 m-0" />

        <SidebarContent className="px-4 py-2">
          <SidebarGroup>
            <SidebarMenu>
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
            </SidebarMenu>
          </SidebarGroup>

          {/* Push notifications to bottom */}
          <div className="flex-1" />

          <div className="flex justify-end pb-2">
            <NotificationsDropdown />
          </div>
        </SidebarContent>

        {/* ✅ User info ONLY in footer */}
        <SidebarFooter className="border-t border-gray-6 bg-gray-1 p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-16 px-4 py-3 hover:bg-gray-3 transition-colors duration-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* ✅ Fixed avatar rendering */}
                      <div className="w-10 h-10 flex-shrink-0">
                        {!isLoading && data?.[0]?.imageFileId ? (
                          <img
                            src={data[0].imageFile?.url}
                            alt="Organization"
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-12 truncate">
                          {user?.name || 'User'}
                        </span>
                        <span className="text-xs text-gray-10 truncate">
                          {user?.email || 'user@example.com'}
                        </span>
                      </div>

                      <CaretUpDown
                        size={16}
                        className="text-gray-10 flex-shrink-0"
                      />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-64 p-2"
                  sideOffset={8}
                >
                  {/* Same avatar logic in dropdown */}
                  <div className="flex items-center gap-3 p-3 rounded-md bg-gray-1 mb-2">
                    <div className="w-10 h-10 flex-shrink-0">
                      {!isLoading && data?.[0]?.imageFileId ? (
                        <img
                          src={data[0].imageFile?.url}
                          alt="Organization"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

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

                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-3 px-3 py-2 rounded-md dark:hover:!bg-gray-4 cursor-pointer"
                  >
                    <Link
                      to="/account-settings"
                      className="flex items-center gap-3 w-full"
                    >
                      <User size={18} className="text-gray-10" />
                      <span className="text-sm font-medium">
                        Account Settings
                      </span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={() => setShowSignOutDialog(true)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 dark:hover:!bg-gray-4  cursor-pointer text-red-600"
                  >
                    <SignOut size={18} />
                    <span className="text-sm font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <ConfirmationDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}

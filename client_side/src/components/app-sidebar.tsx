// src/components/layout/AppSidebar.tsx
'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar, // 1. IMPORT THIS HOOK
} from '@/components/ui/sidebar';
import { CaretUpDown, User, SignOut, Shield } from '@phosphor-icons/react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { useUser } from '@/contexts/user-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizationByUser, Organization } from '@/api/organization';
import { authClient } from '@/lib/auth-client';
import { ConfirmationDialog } from './confirmation-dialog';
import { navigationConfig } from '@/config/navigation';
import { NotificationsDropdown } from './notifications/notification-dropdown';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './language-selector';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, setUser } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const { t } = useTranslation('layout');

  // 2. GET THE MOBILE CONTROL FUNCTION
  const { setOpenMobile } = useSidebar();

  const isSuperAdmin = user?.role === 'super_admin';

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

  const handleSignOutClick = () => {
    // 3. SEQUENCE THE CLOSING ACTIONS
    // First, close the dropdown menu
    setDropdownOpen(false);

    // Second, CLOSE THE MOBILE SIDEBAR DRAWER
    // This removes the "overlay" that was blocking your clicks
    setOpenMobile(false);

    // Third, open the dialog after a tiny delay to allow animations to clear
    setTimeout(() => {
      setShowSignOutDialog(true);
    }, 200);
  };

  const navigationItems = isSuperAdmin
    ? navigationConfig.navAdmin
    : navigationConfig.navMain.slice(0, -1);

  const avatarGradient = isSuperAdmin
    ? 'from-red-500 to-orange-600'
    : 'from-blue-500 to-purple-600';

  return (
    <>
      <Sidebar {...props} className="bg-gray-3 border-r-gray-4">
        <SidebarHeader className="h-0 p-0 border-0 m-0" />

        <SidebarContent className="px-4 py-2">
          {isSuperAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
              <Shield size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {t('badges.admin_panel')}
              </span>
            </div>
          )}

          <SidebarGroup>
            <SidebarMenu>
              <div className="mt-4 h-10 flex items-center justify-center">
                <Link to="/dashboard" className="inline-flex">
                  <img
                    src="/appLogo.svg"
                    alt="App Logo"
                    className="cursor-pointer"
                  />
                </Link>
              </div>
              <Separator className="my-4" />
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className="hover:bg-gray-4 data-[status=active]:bg-gray-4"
                      onClick={() => setOpenMobile(false)} // Optional: Auto-close sidebar on nav click
                    >
                      {item.icon}
                      <span className="ml-3">{t(item.title)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <div className="flex-1" />

          <div className="flex justify-between pb-2">
            <div>
              <LanguageSelector />
            </div>
            <NotificationsDropdown />
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-gray-6 bg-gray-1 p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu
                open={dropdownOpen}
                onOpenChange={setDropdownOpen}
                modal={false} // Keep this false for better touch handling
              >
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-16 px-4 py-3 hover:bg-gray-3 transition-colors duration-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 flex-shrink-0">
                        {!isLoading && data?.[0]?.imageFileId ? (
                          <img
                            src={data[0].imageFile?.url}
                            alt="Organization"
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 bg-gradient-to-br ${avatarGradient} rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md`}
                          >
                            {(user?.name || t('sidebar.user_fallback'))
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-12 truncate">
                          {user?.name || t('sidebar.user_fallback')}
                        </span>
                        <span className="text-xs text-gray-1 truncate">
                          {user?.email || t('sidebar.email_fallback')}
                        </span>
                      </div>

                      <CaretUpDown
                        size={16}
                        className="text-gray-10 flex-shrink-0"
                      />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-64 p-2 z-[100000]"
                    sideOffset={8}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-md bg-gray-1 mb-2">
                      <div className="w-10 h-10 flex-shrink-0">
                        {!isLoading && data?.[0]?.imageFileId ? (
                          <img
                            src={data[0].imageFile?.url}
                            alt="Organization"
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 bg-gradient-to-br ${avatarGradient} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                          >
                            {(user?.name || t('sidebar.user_fallback'))
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-12 truncate">
                          {user?.name || t('sidebar.user_fallback')}
                        </span>
                        <span className="text-xs text-gray-1 truncate">
                          {user?.email || t('sidebar.email_fallback')}
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
                        onClick={() => setOpenMobile(false)} // Close sidebar when navigating too
                      >
                        <User size={18} className="text-gray-10" />
                        <span className="text-sm font-medium">
                          {t('sidebar.account_settings')}
                        </span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault(); // Stop Radix default closing
                        handleSignOutClick(); // Run our custom sequence
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 dark:hover:!bg-gray-4 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <SignOut size={18} />
                      <span className="text-sm font-medium">
                        {t('sidebar.sign_out')}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Confirmation Dialog is OUTSIDE the Sidebar structure */}
      <ConfirmationDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        title={t('sidebar.confirm_signout_title')}
        description={t('sidebar.confirm_signout_desc')}
        confirmText={t('sidebar.confirm')}
        cancelText={t('sidebar.cancel')}
        variant="destructive"
      />
    </>
  );
}

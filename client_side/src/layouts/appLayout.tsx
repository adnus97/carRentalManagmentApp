// src/layouts/appLayout.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet, useLocation } from '@tanstack/react-router';
import { ModeToggle } from '@/components/mode-toggle';
import { LayoutContext } from '@/contexts/layout-context';
import {
  NavigationProvider,
  useNavigationContext,
} from '@/contexts/navigation-context';
import { cn } from '@/lib/utils';
import { DialogDemo } from '@/components/cars/car-form';
import { AddClientDialog } from '@/components/customers/add-client-form';
import { Badge } from '@/components/ui/badge';
import { Shield } from '@phosphor-icons/react';
import { useUser } from '@/contexts/user-context';

function Breadcrumbs() {
  const location = useLocation();
  const { entityName, entityHref } = useNavigationContext();
  const { user } = useUser();

  const isSuperAdmin = user?.role === 'super_admin';

  const getBreadcrumbItems = () => {
    const path = location.pathname;

    // ✅ Admin routes
    if (isSuperAdmin && path.startsWith('/admin')) {
      if (path === '/admin/dashboard') {
        return [
          {
            title: 'Dashboard',
            href: '/admin/dashboard',
            isCurrentPage: true,
          },
        ];
      }

      if (path.startsWith('/admin/users')) {
        return [
          { title: 'Users', href: '/admin/users', isCurrentPage: !entityName },
          ...(entityName
            ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
            : []),
        ];
      }

      if (path.startsWith('/admin/organizations')) {
        return [
          {
            title: 'Organizations',
            href: '/admin/organizations',
            isCurrentPage: !entityName,
          },
          ...(entityName
            ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
            : []),
        ];
      }

      if (path.startsWith('/admin/settings')) {
        return [
          {
            title: 'Settings',
            href: '/admin/settings',
            isCurrentPage: !entityName,
          },
          ...(entityName
            ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
            : []),
        ];
      }

      if (path.startsWith('/admin/system')) {
        return [
          {
            title: 'System',
            href: '/admin/system',
            isCurrentPage: !entityName,
          },
          ...(entityName
            ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
            : []),
        ];
      }
    }

    // ✅ Cars section
    if (path.startsWith('/dashboard') || path.startsWith('/carDetails')) {
      return [
        { title: 'Cars', href: '/dashboard', isCurrentPage: !entityName },
        ...(entityName
          ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
          : []),
      ];
    }

    // ✅ Rents section
    if (path.startsWith('/rents')) {
      return [
        { title: 'Rents', href: '/rents', isCurrentPage: !entityName },
        ...(entityName
          ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
          : []),
      ];
    }

    // ✅ Clients section
    if (path.startsWith('/clients') || path.startsWith('/customerDetails')) {
      return [
        { title: 'Clients', href: '/clients', isCurrentPage: !entityName },
        ...(entityName
          ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
          : []),
      ];
    }

    // ✅ Reports section
    if (path.startsWith('/reports')) {
      return [
        { title: 'Reports', href: '/reports', isCurrentPage: !entityName },
        ...(entityName
          ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
          : []),
      ];
    }

    // ✅ Organization section
    if (path.startsWith('/Organization')) {
      return [
        {
          title: 'Organization',
          href: '/organization',
          isCurrentPage: !entityName,
        },
        ...(entityName
          ? [{ title: entityName, href: entityHref, isCurrentPage: true }]
          : []),
      ];
    }

    // ✅ Default fallback
    return [{ title: 'Dashboard', href: '/', isCurrentPage: true }];
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <Breadcrumb className="flex w-full justify-between h-full items-center">
      <div className="flex items-center gap-3">
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <div key={item.title} className="flex items-center">
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className="hidden md:block">
                {item.isCurrentPage ? (
                  <BreadcrumbPage>{item.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href || '#'}>
                    {item.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>

        {/* Admin Badge in breadcrumbs */}
        {isSuperAdmin && location.pathname.startsWith('/admin') && (
          <Badge variant="destructive" className="gap-1 hidden sm:flex">
            <Shield className="w-3 h-3" />
            Super Admin
          </Badge>
        )}
      </div>

      <div className="flex space-x-3">
        {location.pathname.startsWith('/dashboard') && <DialogDemo />}
        {location.pathname.startsWith('/clients') && <AddClientDialog />}
        <ModeToggle />
      </div>
    </Breadcrumb>
  );
}

export function AppLayout() {
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <NavigationProvider>
        <div
          className={cn(
            'w-full',
            (location.pathname === '/dashboard' ||
              location.pathname === '/admin/dashboard') &&
              'overflow-hidden',
          )}
        >
          {/* Sticky Header */}
          <header
            ref={headerRef}
            className="flex bg-background h-16 shrink-0 items-center gap-2 border-b px-4 z-50"
          >
            <SidebarTrigger className="hover:bg-accent-4 dark:hover:bg-accent-6" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="w-full">
              <Breadcrumbs />
            </div>
          </header>

          {/* Provide headerHeight to all pages */}
          <LayoutContext.Provider value={{ headerHeight }}>
            <main className="h-[calc(100vh-64px)]">
              <Outlet />
            </main>
          </LayoutContext.Provider>
        </div>
      </NavigationProvider>
    </SidebarProvider>
  );
}

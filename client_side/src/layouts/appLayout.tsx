import { AppSidebar } from '@/components/app-sidebar';
import { DialogDemo } from '@/components/cars/car-form';
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
import { navigationConfig } from '@/config/navigation';

const navData = navigationConfig;

export function AppLayout() {
  const location = useLocation();

  // Get selected car name from query param (?car=...)
  const search = location.search;
  const params = new URLSearchParams(search);
  const selectedCarName = params.get('car');

  // Find the current page title based on the pathname
  const getCurrentPageTitle = () => {
    const currentNav = navData.navMain.find(
      (nav) => nav.url === location.pathname,
    );
    let title = currentNav?.title || 'Dashboard';

    // If on rents page and car is selected, append car name
    if (location.pathname === '/rents' && selectedCarName) {
      title += ` - ${selectedCarName}`;
    }
    return title;
  };

  // Get breadcrumb items based on current path
  const getBreadcrumbItems = () => {
    const currentTitle = getCurrentPageTitle();

    // For dashboard/home/rents, show just the current page
    if (
      location.pathname === '/dashboard' ||
      location.pathname === '/' ||
      location.pathname === '/rents'
    ) {
      return [
        {
          title: currentTitle,
          isCurrentPage: true,
        },
      ];
    }

    // For other pages, show Dashboard -> Current Page
    return [
      {
        title: 'Dashboard',
        href: '/dashboard',
        isCurrentPage: false,
      },
      {
        title: currentTitle,
        isCurrentPage: true,
      },
    ];
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="w-full">
        <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="w-full">
            <Breadcrumb className="flex w-full justify-between h-full items-center">
              <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                  <div key={item.title} className="flex items-center">
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                    <BreadcrumbItem className="hidden md:block">
                      {item.isCurrentPage ? (
                        <BreadcrumbPage>{item.title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href}>
                          {item.title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
              {/* Only show Add car button on /_layout/dashboard */}
              {location.pathname === '/dashboard' && <DialogDemo />}
            </Breadcrumb>
          </div>
        </header>
        <Outlet />
      </div>
    </SidebarProvider>
  );
}

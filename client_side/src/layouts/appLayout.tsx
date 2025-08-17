import { useRef, useState, useEffect } from 'react';
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
import { ModeToggle } from '@/components/mode-toggle';
import { LayoutContext } from '@/contexts/layout-context';
import { cn } from '@/lib/utils';

const navData = navigationConfig;

export function AppLayout() {
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const search = location.search;
  const params = new URLSearchParams(search);
  const selectedCarName = params.get('car');

  const getCurrentPageTitle = () => {
    const currentNav = navData.navMain.find(
      (nav) => nav.url === location.pathname,
    );
    let title = currentNav?.title || 'Dashboard';

    if (location.pathname === '/rents' && selectedCarName) {
      title += ` - ${selectedCarName}`;
    }
    return title;
  };

  const getBreadcrumbItems = () => {
    const currentTitle = getCurrentPageTitle();

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
  //w-full overflow-hidden
  return (
    <SidebarProvider>
      <AppSidebar />
      <div
        className={cn(
          'w-full',
          (location.pathname === '/dashboard' ||
            location.pathname === '/rents') &&
            'overflow-hidden',
        )}
      >
        {/* Sticky Header */}
        <header
          ref={headerRef}
          className="flex bg-background h-16 shrink-0 items-center gap-2 border-b px-4 z-50"
        >
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="w-full ">
            <Breadcrumb className="flex w-full justify-between h-full items-center ">
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
              <div className="flex space-x-3">
                {location.pathname === '/dashboard' && <DialogDemo />}
                <ModeToggle />
              </div>
            </Breadcrumb>
          </div>
        </header>

        {/* Provide headerHeight to all pages */}
        <LayoutContext.Provider value={{ headerHeight }}>
          <main className="h-[calc(100vh-64px)]">
            <Outlet />
          </main>
        </LayoutContext.Provider>
      </div>
    </SidebarProvider>
  );
}

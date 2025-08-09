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

const navData = navigationConfig;

export function AppLayout() {
  const location = useLocation();

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="w-full">
        <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 border-b px-4 z-50">
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
              {location.pathname === '/dashboard' && <DialogDemo />}
              <ModeToggle />
            </Breadcrumb>
          </div>
        </header>

        {/* Responsive padding: pt-32 on small/medium, pt-4 on large+ */}
        <main>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

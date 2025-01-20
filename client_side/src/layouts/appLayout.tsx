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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Outlet } from '@tanstack/react-router';
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <div className="w-full">
        <Outlet />
      </div>
    </SidebarProvider>
  );
}

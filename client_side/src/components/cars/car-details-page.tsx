'use client';

import { useQuery } from '@tanstack/react-query';
import { getCarDetails } from '@/api/cars';
import { useTheme } from '../theme/theme-provider';
import { useLayoutContext } from '../../contexts/layout-context';
import { useRouter } from '@tanstack/react-router';

import { ChartAreaInteractive } from '../car-details-chart';
import AddTargetDialog from './car/add-target-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import CarRentalsGrid from './car/car-rental-grid';
import CarMaintenanceLogsGrid from './car/car-maintenance-logs-grid';
import CarTargetsGrid from './car/car-target-grid';
import AddMaintenanceDialog from './car/add-maintenance-dialog';
import UpdateMileageDialog from './car/update-mileage-dialog';
import { useUpdateCar } from '@/hooks/use-update-car';
import { useNavigationContext } from '@/contexts/navigation-context';
import { useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/confirmation-dialog';

export default function CarDetailsPage({ carId }: { carId: string }) {
  const { headerHeight } = useLayoutContext();
  const { theme } = useTheme();
  const router = useRouter();
  const { setEntity } = useNavigationContext();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ✅ Car details
  const { data, isLoading, isError } = useQuery({
    queryKey: ['carDetails', carId],
    queryFn: () => getCarDetails(carId),
  });

  useEffect(() => {
    if (data?.car) {
      setEntity(
        `${data.car.make} ${data.car.model} ${data.car.year}`,
        `/carDetails/${carId}`,
      );
    }
    return () => setEntity(null);
  }, [data, carId, setEntity]);

  if (isLoading) return <p className="text-center">Loading car details...</p>;
  if (isError || !data)
    return (
      <p className="text-center text-red-500">Error loading car details.</p>
    );

  const { car, rentalHistory, targets } = data;

  // ✅ Compute financial stats from rentalHistory
  const totalRevenue = rentalHistory.reduce(
    (sum: number, r: any) => sum + (r.totalPrice || 0),
    0,
  );
  const totalRents = rentalHistory.length;
  const avgRentPrice = totalRents > 0 ? totalRevenue / totalRents : 0;

  const financialStats = {
    totalRevenue,
    totalRents,
    avgRentPrice,
  };

  const updateCarMutation = useUpdateCar(carId);

  const actionButtons = [
    {
      label: 'Mark as Active',
      onClick: () => updateCarMutation.mutate({ status: 'active' }),
      disabled: car.status === 'active',
      variant: 'outline',
    },
    {
      label: 'Mark as Maintenance',
      onClick: () => updateCarMutation.mutate({ status: 'maintenance' }),
      disabled: car.status === 'maintenance',
      variant: 'outline',
    },
    {
      label: 'Mark as Sold',
      onClick: () => updateCarMutation.mutate({ status: 'sold' }),
      disabled: car.status === 'sold',
      variant: 'outline',
    },
    {
      label: 'Delete Car',
      onClick: () => setShowDeleteDialog(true), // ✅ open dialog
      disabled: car.status === 'deleted',
      variant: 'destructive',
    },
  ];

  // ✅ Safe date formatter
  const safeFormat = (dateString: string | null, fmt = 'dd MMM yyyy') => {
    if (!dateString) return 'Currently Rented';
    try {
      const parsed = parseISO(dateString);
      return isValid(parsed) ? format(parsed, fmt) : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  // ✅ Availability Badge Logic
  const getAvailabilityBadge = () => {
    if (car.status === 'sold') {
      return <Badge variant="destructive">❌ Sold</Badge>;
    }
    if (car.status === 'maintenance') {
      return <Badge variant="warning">🛠 In Maintenance</Badge>;
    }
    if (car.status === 'deleted') {
      return <Badge variant="secondary">🚫 Deleted</Badge>;
    }

    const activeRent = rentalHistory.find(
      (r: any) =>
        r.status === 'active' &&
        (!r.returnedAt || new Date(r.returnedAt) > new Date()),
    );
    if (activeRent) {
      return <Badge variant="warning">🚗 Rented</Badge>;
    }

    if (car.status === 'active' && car.isAvailable) {
      return <Badge variant="success"> Available</Badge>;
    }
    if (car.status === 'active' && !car.isAvailable) {
      return (
        <Badge variant="outline">
          ⏳ Next: {safeFormat(car.nextAvailableDate)}
        </Badge>
      );
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  return (
    <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 space-y-8">
      {/* Sticky Action Bar */}
      <div
        className="z-40 bg-background py-4 flex flex-wrap gap-2 items-center justify-between"
        style={{ top: headerHeight }}
      >
        <Button
          variant="outline"
          onClick={() => router.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="hidden sm:flex gap-2">
          {/* Status buttons */}
          {actionButtons
            .filter((btn) => btn.label !== 'Delete Car')
            .map((btn) => (
              <Button
                key={btn.label}
                variant="outline"
                onClick={btn.onClick}
                disabled={btn.disabled || updateCarMutation.isPending}
              >
                {btn.label}
              </Button>
            ))}

          {/* ✅ Zod-powered Update Mileage Dialog */}
          <UpdateMileageDialog carId={carId} currentMileage={car.mileage} />

          {/* Delete button always last */}
          {actionButtons
            .filter((btn) => btn.label === 'Delete Car')
            .map((btn) => (
              <Button
                key={btn.label}
                variant="secondary"
                onClick={btn.onClick}
                disabled={btn.disabled || updateCarMutation.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {btn.label}
              </Button>
            ))}
        </div>

        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actionButtons.map((btn) => (
                <DropdownMenuItem key={btn.label} onClick={btn.onClick}>
                  {btn.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 🚗 Car Info + 📈 Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Car Info */}
        <Card
          className={[
            'lg:col-span-1 h-full min-h-[400px] shadow-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            // Light mode
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            // Dark mode (Insurance style)
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          {/* Dark-mode glow orbs */}
          <div className="pointer-events-none absolute -right-12 -top-12 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              🚗 {car.make} {car.model}{' '}
              <span className="text-sm font-normal">{car.plateNumber}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Vehicle Overview</p>
          </CardHeader>

          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 text-sm flex-1">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Year</span>
              <span className="font-semibold text-lg">{car.year}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Status</span>
              {getAvailabilityBadge()}
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Insurance Expiry</span>
              <span className="font-semibold">
                {safeFormat(car.insuranceExpiryDate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Purchase Price</span>
              <span className="font-semibold text-base">
                {car.purchasePrice.toLocaleString()} DHS
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Price / Day</span>
              <span className="font-semibold text-base">
                {car.pricePerDay} DHS
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Mileage</span>
              <span className="font-semibold text-base">
                {car.mileage.toLocaleString()} km
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Monthly Payment</span>
              <span className="font-semibold text-base">
                {car.monthlyLeasePrice} DHS
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Insurance Expiry</span>
              <span className="font-semibold">
                {safeFormat(car.insuranceExpiryDate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">
                Technical Visit Expiry
              </span>
              <span className="font-semibold">
                {safeFormat(car.technicalVisiteExpiryDate)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 📈 Revenue Chart */}
        <div className="lg:col-span-2 shadow-lg overflow-x-auto flex flex-col rounded-lg">
          <ChartAreaInteractive
            rentalHistory={rentalHistory.map((r: any) => ({
              startDate: r.startDate,
              endDate: r.endDate,
              totalPrice: r.totalPaid,
            }))}
          />
        </div>
      </div>

      {/* Tabs Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="pt-4 sm:pt-6">
          <Tabs defaultValue="rentals" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="targets">Targets</TabsTrigger>
              <TabsTrigger value="rentals">Rentals</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="rentals" className="space-y-6">
              <CarRentalsGrid carId={carId} financialStats={financialStats} />
            </TabsContent>

            <TabsContent value="targets" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold">Targets</h2>
                <AddTargetDialog carId={carId} targets={targets} />
              </div>
              <CarTargetsGrid carId={carId} targets={targets} />
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold">Maintenance Logs</h2>
                <AddMaintenanceDialog carId={carId} />
              </div>
              <CarMaintenanceLogsGrid carId={carId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ✅ Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={async () => {
          await updateCarMutation.mutateAsync({ status: 'deleted' });
          router.navigate({ to: '/dashboard' }); // ✅ go back to CarsGrid
        }}
        title="Delete Car"
        description={`Are you sure you want to delete ${car.make} ${car.model} (${car.year})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />
    </div>
  );
}

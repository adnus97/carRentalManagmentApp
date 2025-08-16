import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCarDetails, updateCar, deleteCar } from '@/api/cars';
import { useTheme } from '../theme/theme-provider';
import { useLayoutContext } from '../../contexts/layout-context';
import { useRouter } from '@tanstack/react-router';

import CarRevenueChart from './car/car-revenue-chart';
import CarTargetsGrid from './car/car-target-grid';
import CarMaintenanceLogsGrid from './car/car-maintenance-logs-grid';
import CarOilChangesGrid from './car/car-oil-change-grid';
import CarRentalsGrid from './car/car-rental-grid';
import AddTargetDialog from './car/add-target-dialog';
import AddMaintenanceDialog from './car/add-maintenance-dialog';
import AddOilChangeDialog from './car/add-oil-change-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TargetStatsCards from './car/target-state-cards';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { successToast, errorToast } from '@/components/ui/toast';

export default function CarDetailsPage({ carId }: { carId: string }) {
  const { headerHeight } = useLayoutContext();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carDetails', carId],
    queryFn: () => getCarDetails(carId),
  });

  if (isLoading) return <p className="text-center">Loading car details...</p>;
  if (isError || !data)
    return (
      <p className="text-center text-red-500">Error loading car details.</p>
    );

  const { car, rentalHistory, maintenanceLogs, oilChanges, targets } = data;

  const daysRemaining =
    targets.length > 0 && targets[0].endDate
      ? differenceInDays(new Date(targets[0].endDate), new Date())
      : 0;

  const actionButtons = [
    {
      label: 'Mark as Maintenance',
      onClick: () => updateCar(carId, { status: 'maintenance' }),
    },
    {
      label: 'Mark as Sold',
      onClick: () => updateCar(carId, { status: 'sold' }),
    },
    {
      label: 'Update Mileage',
      onClick: () => {
        const mileage = prompt('Enter new mileage:', String(car.mileage));
        if (mileage) updateCar(carId, { mileage: Number(mileage) });
      },
    },
    {
      label: 'Delete Car',
      onClick: () => {
        if (confirm('Are you sure you want to delete this car?'))
          deleteCar(carId);
      },
    },
  ];

  return (
    <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 ">
      {/* Sticky Action Bar */}
      <div
        className="z-40 bg-background py-4 flex  flex-wrap gap-2 items-center justify-between "
        style={{ top: headerHeight }}
      >
        <Button
          variant="outline"
          onClick={() => router.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="hidden sm:flex gap-2 ">
          {actionButtons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.label === 'Delete Car' ? 'ghost' : 'outline'}
              onClick={btn.onClick}
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

      <div className="space-y-8 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-1 shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {car.make} {car.model}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm sm:text-base">
              <p>
                <strong>Year:</strong> {car.year}
              </p>
              <p className="flex items-center gap-2">
                <strong>Status:</strong>
                <Badge
                  variant={
                    car.status === 'active'
                      ? 'success'
                      : car.status === 'maintenance'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {car.status}
                </Badge>
              </p>
              <p>
                <strong>Insurance Expiry:</strong>{' '}
                {format(new Date(car.insuranceExpiryDate), 'dd MMM yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border border-border overflow-x-auto">
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <CarRevenueChart rentalHistory={rentalHistory} />
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border border-border">
          <CardContent className="pt-4 sm:pt-6">
            <Tabs defaultValue="targets" className="space-y-4 sm:space-y-6">
              <TabsList className="flex flex-wrap gap-2">
                <TabsTrigger value="targets">Targets</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
                <TabsTrigger value="oil">Oil Changes</TabsTrigger>
                <TabsTrigger value="rentals">Rentals</TabsTrigger>
              </TabsList>

              <TabsContent value="targets" className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold">Targets</h2>
                  <AddTargetDialog carId={carId} />
                </div>
                {targets.length > 0 ? (
                  <TargetStatsCards
                    currentRevenue={targets[0]?.actualRevenue}
                    targetRevenue={targets[0]?.revenueGoal}
                    currentRents={targets[0]?.actualRents}
                    targetRents={targets[0]?.targetRents}
                    daysRemaining={daysRemaining}
                  />
                ) : (
                  <p className="text-muted-foreground">No active target set.</p>
                )}
                <div className="max-h-[400px] overflow-auto rounded-md border border-border">
                  <CarTargetsGrid
                    targets={targets}
                    theme={theme as 'light' | 'dark'}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="maintenance"
                className="space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold">Maintenance Logs</h2>
                  <AddMaintenanceDialog carId={carId} />
                </div>
                <div className="max-h-[400px] overflow-auto rounded-md border border-border">
                  <CarMaintenanceLogsGrid
                    logs={maintenanceLogs}
                    theme={theme as 'light' | 'dark'}
                  />
                </div>
              </TabsContent>

              <TabsContent value="oil" className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold">Oil Changes</h2>
                  <AddOilChangeDialog carId={carId} />
                </div>
                <div className="max-h-[400px] overflow-auto rounded-md border border-border">
                  <CarOilChangesGrid
                    oilChanges={oilChanges}
                    theme={theme as 'light' | 'dark'}
                  />
                </div>
              </TabsContent>

              <TabsContent value="rentals" className="space-y-4 sm:space-y-6">
                <h2 className="text-lg font-semibold">Rentals</h2>
                <div className="max-h-[400px] overflow-auto rounded-md border border-border">
                  <CarRentalsGrid
                    rentalHistory={rentalHistory}
                    theme={theme as 'light' | 'dark'}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

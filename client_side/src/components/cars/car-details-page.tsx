'use client';

import { useQuery } from '@tanstack/react-query';
import { getCarDetails, updateCar, deleteCar } from '@/api/cars';
import { useTheme } from '../theme/theme-provider';
import { useLayoutContext } from '../../contexts/layout-context';
import { useRouter } from '@tanstack/react-router';

import { ChartAreaInteractive } from '../car-details-chart';
import AddTargetDialog from './car/add-target-dialog';
import AddMaintenanceDialog from './car/add-maintenance-dialog';
import AddOilChangeDialog from './car/add-oil-change-dialog';
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
import { cn } from '@/lib/utils';

import CarRentalsGrid from './car/car-rental-grid';
import CarOilChangesGrid from './car/add-oil-change-dialog';
import CarMaintenanceLogsGrid from './car/car-maintenance-logs-grid';
import CarTargetsGrid from './car/car-target-grid';

export default function CarDetailsPage({ carId }: { carId: string }) {
  const { headerHeight } = useLayoutContext();
  const { theme } = useTheme();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carDetails', carId],
    queryFn: () => getCarDetails(carId),
  });

  if (isLoading) return <p className="text-center">Loading car details...</p>;
  if (isError || !data)
    return (
      <p className="text-center text-red-500">Error loading car details.</p>
    );

  const {
    car,
    rentalHistory,
    maintenanceLogs,
    oilChanges,
    targets,
    financialStats,
  } = data;

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
          {actionButtons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.label === 'Delete Car' ? 'ghost' : 'outline'}
              onClick={btn.onClick}
              className={cn(
                btn.label === 'Delete Car' &&
                  'flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white',
              )}
              disabled={btn.label === 'Delete Car' && isLoading}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Car Info (smaller width) */}
        <Card className="lg:col-span-1 shadow-md border border-border bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              🚗 {car.make} {car.model}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Vehicle Overview</p>
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Year</span>
              <span className="font-medium">{car.year}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={
                  car.status === 'active'
                    ? 'success'
                    : car.status === 'maintenance'
                      ? 'warning'
                      : 'secondary'
                }
                className="w-fit text-xs px-2 py-0.5 mt-1"
              >
                {car.status}
              </Badge>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-muted-foreground">Insurance Expiry</span>
              <span className="font-medium">
                {safeFormat(car.insuranceExpiryDate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Purchase Price</span>
              <span className="font-semibold text-sm">
                {car.purchasePrice.toLocaleString()} MAD
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Price / Day</span>
              <span className="font-semibold text-sm">
                {car.pricePerDay} MAD
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Mileage</span>
              <span className="font-semibold text-sm">
                {car.mileage.toLocaleString()} km
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Lease Price</span>
              <span className="font-semibold text-sm">
                {car.monthlyLeasePrice} MAD
              </span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-muted-foreground">Availability</span>
              {car.isAvailable ? (
                <Badge
                  variant="success"
                  className="w-fit text-xs px-2 py-0.5 mt-1"
                >
                  ✅ Available
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="w-fit text-xs px-2 py-0.5 mt-1"
                >
                  ⏳ Next: {safeFormat(car.nextAvailableDate)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 📈 Revenue Chart (larger width) */}
        <Card className="lg:col-span-2 shadow-sm border border-border overflow-x-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Revenue & Rents Over Time
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Showing revenue and rents for the selected period
            </p>
          </CardHeader>
          <CardContent>
            <ChartAreaInteractive
              rentalHistory={rentalHistory.map((r) => ({
                startDate: r.startDate,
                endDate: r.endDate,
                totalPrice: r.totalPrice,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="pt-4 sm:pt-6">
          <Tabs defaultValue="targets" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="targets">Targets</TabsTrigger>
              <TabsTrigger value="rentals">Rentals</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
              <TabsTrigger value="oil">Oil Changes</TabsTrigger>
            </TabsList>

            {/* 🎯 Targets */}
            <TabsContent value="targets" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-semibold">Target</h2>
                <AddTargetDialog carId={carId} targets={targets} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ✅ Active Target Card (only one) */}
                <div className="lg:col-span-1">
                  {(() => {
                    const now = new Date();
                    const activeTarget = targets.find(
                      (t) =>
                        new Date(t.startDate) <= now &&
                        new Date(t.endDate) >= now &&
                        !t.isExpired,
                    );

                    if (!activeTarget) {
                      return (
                        <Card className="p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
                          <div className="text-5xl mb-3">🎯</div>
                          <p className="font-medium">No active target</p>
                          <p className="text-sm">
                            Start by adding a new target.
                          </p>
                        </Card>
                      );
                    }

                    const t = activeTarget;
                    return (
                      <Card className="p-4 border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">
                            {safeFormat(t.startDate, 'dd MMM')} -{' '}
                            {safeFormat(t.endDate, 'dd MMM')}
                          </h3>
                          <Badge variant="success">Active</Badge>
                        </div>

                        {/* KPI Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">
                              Days Remaining
                            </p>
                            <p className="font-bold">{t.daysRemaining}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Revenue Progress
                            </p>
                            <p className="font-bold">
                              {t.revenueProgress.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Rents Progress
                            </p>
                            <p className="font-bold">
                              {t.rentProgress.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="mt-4 space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Revenue
                            </p>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-accent-6 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(t.revenueProgress, 100)}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs mt-1">
                              {t.actualRevenue} / {t.revenueGoal}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Rents
                            </p>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-accent-10 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(t.rentProgress, 100)}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs mt-1">
                              {t.actualRents} / {t.targetRents}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })()}
                </div>

                {/* 📜 Targets History Grid (beside card) */}
                <div className="lg:col-span-2">
                  <h3 className="text-md font-semibold mb-2">
                    Targets History
                  </h3>
                  <CarTargetsGrid carId={carId} />
                </div>
              </div>
            </TabsContent>

            {/* 📑 Rentals */}
            <TabsContent value="rentals">
              <CarRentalsGrid carId={carId} financialStats={financialStats} />
            </TabsContent>

            {/* 🛠 Maintenance Logs */}
            <TabsContent value="maintenance">
              <CarMaintenanceLogsGrid carId={carId} />
            </TabsContent>

            {/* 🛢 Oil Changes */}
            <TabsContent value="oil">
              <CarOilChangesGrid carId={carId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

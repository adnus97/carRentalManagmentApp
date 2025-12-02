'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  TextFilterModule,
  CellStyleModule,
} from 'ag-grid-community';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { deleteCar, getCars, Car } from '@/api/cars';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hammer, ShoppingCart, Trash } from '@phosphor-icons/react';
import { ConfirmationDialog } from '../confirmation-dialog';
import { toast } from '@/components/ui/toast';
import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { format, isBefore, addDays } from 'date-fns';
import { useRouter } from '@tanstack/react-router';
import { RentFormDialog } from '../rent/rent-form';
import { EditCarFormDialog } from './edit-car-form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useNavigationContext } from '@/contexts/navigation-context';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  CellStyleModule,
]);

export const CarsGrid = () => {
  const { t } = useTranslation('cars');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Car[]>([]);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [selectedCarForRent, setSelectedCarForRent] = useState<Car | null>(
    null,
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCarForEdit, setSelectedCarForEdit] = useState<Car | null>(
    null,
  );
  const { setEntity } = useNavigationContext();
  const router = useRouter();

  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();

  // Availability filter: 'all' | 'available' | 'not_available'
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'not_available'
  >('all');

  // Responsive pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1700 ? 7 : 12,
  );

  useEffect(() => {
    setEntity(null);
    return () => setEntity(null);
  }, [setEntity]);

  useEffect(() => {
    const handleResize = () => {
      setPageSize(window.innerWidth < 1700 ? 7 : 12);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch cars
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['cars', page, pageSize],
    queryFn: () => getCars(page, pageSize),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (
        error?.response?.status === 400 &&
        error?.response?.data?.message?.includes('No organization')
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false, // sm breakpoint
  );

  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Client-side filtered rows by availability
  const rawRows: Car[] = data?.data || [];
  const filteredRows = useMemo(() => {
    if (availabilityFilter === 'available') {
      return rawRows.filter((r) => r.isAvailable === true);
    }
    if (availabilityFilter === 'not_available') {
      return rawRows.filter((r) => r.isAvailable === false);
    }
    return rawRows;
  }, [rawRows, availabilityFilter]);

  // Handle no organization case
  if (
    error?.response?.status === 400 &&
    error?.response?.data?.message?.includes('No organization')
  ) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl mb-4">{t('no_org.title')}</h2>
        <p className="mb-4">{t('no_org.desc')}</p>
        <Button onClick={() => router.navigate({ to: '/organization' })}>
          {t('no_org.cta')}
        </Button>
      </div>
    );
  }

  // Helper: can a car be deleted?
  const canBeDeleted = (car: Car): boolean => {
    return car.isAvailable && car.status !== 'deleted';
  };

  // Delete mutation
  const mutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast({
        type: 'success',
        title: t('toasts.delete_success_title'),
        description: t('toasts.delete_success_desc'),
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: t('common.error', { ns: 'common', defaultValue: 'Error' }),
        description: error?.response?.data?.message || t('toasts.delete_error'),
      });
    },
  });

  const handleDelete = async () => {
    const deletableRows = selectedRows.filter(canBeDeleted);
    const blockedRows = selectedRows.filter((row) => !canBeDeleted(row));

    if (blockedRows.length > 0) {
      toast({
        type: 'warning',
        title: t('delete.partial_title'),
        description: t('delete.partial_desc', {
          blocked: blockedRows.length,
          allowed: deletableRows.length,
        }),
      });
    }

    if (deletableRows.length === 0) {
      toast({
        type: 'error',
        title: t('delete.none_title'),
        description: t('delete.none_desc'),
      });
      setShowDeleteDialog(false);
      return;
    }

    try {
      await Promise.allSettled(
        deletableRows.map((row) => mutation.mutateAsync(row.id)),
      );
      setSelectedRows([]);
    } catch (error) {
      console.error('Delete error:', error);
    }

    setShowDeleteDialog(false);
  };

  const currencyFormatter = (params: any) =>
    params.value ? `${params.value.toLocaleString()} ${t('currency')}` : '';

  const statusBadge = (status: Car['status']) => {
    const colors: Record<Car['status'], string> = {
      active: 'bg-green-500',
      maintenance: 'bg-yellow-500',
      leased: 'bg-blue-500',
      sold: 'bg-gray-500',
      deleted: 'bg-red-500',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-white text-xs ${colors[status]}`}
      >
        {t(`status.${status}`)}
      </span>
    );
  };

  const colDefs: ColDef<Car>[] = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      lockPinned: true,
      suppressMovable: true,
    },
    {
      field: 'plateNumber',
      headerName: t('columns.plate'),
      width: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => (
        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
          {params.value ||
            t('common.na', { ns: 'common', defaultValue: 'N/A' })}
        </span>
      ),
    },
    {
      field: 'make',
      headerName: t('columns.make'),
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'model',
      headerName: t('columns.model'),
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    { field: 'year', headerName: t('columns.year'), width: 80, sortable: true },
    {
      field: 'color',
      headerName: t('columns.color'),
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const raw = (params.value ?? '').toString().trim();
        // Translate only if a matching key exists; otherwise show the raw value
        const translated = raw ? t(`colors.${raw}`) : '';
        const label =
          translated && translated !== `colors.${raw}`
            ? translated
            : raw || t('common.na', { ns: 'common', defaultValue: 'N/A' });

        return (
          <div className="flex items-center gap-2">
            {raw && (
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: raw }}
              />
            )}
            <span>{label}</span>
          </div>
        );
      },
    },
    {
      field: 'purchasePrice',
      headerName: t('columns.purchase_price'),
      width: 130,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'pricePerDay',
      headerName: t('columns.price_per_day'),
      width: 100,
      valueFormatter: currencyFormatter,
    },
    {
      headerName: t('columns.status'),
      field: 'status',
      width: 110,
      cellRenderer: (params: any) => statusBadge(params.value),
    },
    {
      headerName: t('columns.availability'),
      field: 'isAvailable',
      width: 140,
      cellRenderer: (params: any) => {
        const available = params.value;
        return (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: available ? '#22c55e' : '#ef4444' }}
            ></span>
            <span>{available ? t('available') : t('not_available')}</span>
          </div>
        );
      },
    },
    {
      headerName: t('columns.next_available'),
      field: 'nextAvailableDate',
      width: 140,
      cellRenderer: (params: { value: string; data: Car }) => {
        const { value: nextAvailableDate, data: car } = params;

        if (!car.isAvailable && !nextAvailableDate) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help underline decoration-dotted text-orange-500 font-semibold">
                    {t('open_contract')}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t('open_contract_hint')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        if (!nextAvailableDate) {
          return <span>{t('available_now')}</span>;
        }

        const parsed = new Date(nextAvailableDate);
        const shortDate = format(parsed, 'dd/MM/yyyy');
        const fullDate = format(parsed, 'dd/MM/yyyy HH:mm:ss');

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted">
                  {shortDate}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{fullDate}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      headerName: t('columns.insurance_expiry'),
      field: 'insuranceExpiryDate',
      width: 130,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;

        const expiry = new Date(params.value);
        const today = new Date();
        const soon = addDays(today, 30);

        let color = '';
        let tooltipMessage = t('insurance.valid');

        if (isBefore(expiry, today)) {
          color = '#EC6142';
          tooltipMessage = t('insurance.expired');
        } else if (isBefore(expiry, soon)) {
          color = '#FFCA16';
          tooltipMessage = t('insurance.soon');
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span style={{ color, fontWeight: 'bold', cursor: 'help' }}>
                  {format(expiry, 'dd/MM/yyyy')}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{tooltipMessage}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      headerName: t('columns.tech_inspection_expiry'),
      field: 'technicalVisiteExpiryDate',
      width: 150,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;

        const expiry = new Date(params.value);
        const today = new Date();
        const soon = addDays(today, 30);

        let color = '';
        let tooltipMessage = t('tech.valid');

        if (isBefore(expiry, today)) {
          color = '#EC6142';
          tooltipMessage = t('tech.expired');
        } else if (isBefore(expiry, soon)) {
          color = '#FFCA16';
          tooltipMessage = t('tech.soon');
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span style={{ color, fontWeight: 'bold', cursor: 'help' }}>
                  {format(expiry, 'dd/MM/yyyy')}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{tooltipMessage}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      headerName: t('columns.actions'),
      pinned: 'right',
      width: isSmallScreen ? 110 : 205, // narrower on small screens
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCarForRent(params.data);
              setRentDialogOpen(true);
            }}
            disabled={
              !params.data.isAvailable ||
              ['maintenance', 'sold', 'deleted'].includes(params.data.status)
            }
            aria-label={t('actions.rent')}
            title={t('actions.rent')}
            className="gap-2"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">{t('actions.rent')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={params.data.status === 'deleted'}
            onClick={() => {
              setSelectedCarForEdit(params.data);
              setEditDialogOpen(true);
            }}
            aria-label={t('actions.edit')}
            title={t('actions.edit')}
            className="gap-2"
          >
            <Hammer size={16} />
            <span className="hidden sm:inline">{t('actions.edit')}</span>
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = data?.totalPages || 1;
  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= p + 2)) {
        pages.push(p);
      }
    }
    return pages;
  };

  const deletableCars = selectedRows.filter(canBeDeleted);
  const blockedCars = selectedRows.filter((row) => !canBeDeleted(row));

  const deletableNames = deletableCars.map(
    (car) => `${car.make} ${car.model} (${car.year})`,
  );

  let descriptionText = '';
  if (blockedCars.length > 0) {
    descriptionText = t('delete.dialog_partial', {
      count: deletableCars.length,
      list: deletableNames.slice(0, 5).join(', '),
      more:
        deletableCars.length > 5
          ? t('more', { n: deletableCars.length - 5 })
          : '',
      blocked: blockedCars.length,
    });
  } else {
    descriptionText = t('delete.dialog_full', {
      list: deletableNames.slice(0, 5).join(', '),
      more:
        deletableCars.length > 5
          ? t('more', { n: deletableCars.length - 5 })
          : '',
    });
  }

  return (
    <div
      className="ag-theme-alpine-dark flex flex-col"
      style={{ width: '100%', height: 'calc(100vh - 100px)' }}
    >
      <h2 className="text-xl mb-4 font-bold">{t('title')}</h2>

      <div className="flex items-center justify-between mb-4">
        <p>{t('manage_hint')}</p>

        <div className="flex items-center gap-2">
          <Select
            value={availabilityFilter}
            onValueChange={(v) =>
              setAvailabilityFilter(v as 'all' | 'available' | 'not_available')
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue
                placeholder={t('filters.availability_placeholder', {
                  defaultValue: 'Filter availability',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('filters.all', { defaultValue: 'All' })}
              </SelectItem>
              <SelectItem value="available">{t('available')}</SelectItem>
              <SelectItem value="not_available">
                {t('not_available')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div
          className="
      mb-4 rounded-lg border
      bg-gray-50 dark:bg-gray-800
      p-3 sm:p-3
      flex flex-col gap-3
      sm:flex-row sm:items-center sm:gap-2
    "
        >
          {/* Left cluster: count + divider + inline actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm font-medium">
              {t('selected_count', {
                count: selectedRows.length,
                s: selectedRows.length > 1 ? 's' : '',
              })}
            </span>

            {/* Divider shows only when items are inline */}
            <Separator orientation="horizontal" className="my-2 sm:hidden" />
            <Separator orientation="vertical" className="hidden sm:block h-4" />

            <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
              {selectedRows.length === 1 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const carId = selectedRows[0].id;
                    router.navigate({
                      to: '/carDetails/$id',
                      params: { id: carId },
                    });
                  }}
                  className="w-full sm:w-auto flex items-center justify-center"
                >
                  {t('view_details')}
                </Button>
              )}
            </div>
          </div>

          {/* Right cluster: delete + info; moves below on small screens */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:ml-auto gap-2 sm:gap-0 w-full sm:w-auto">
            {blockedCars.length > 0 && (
              <span className="text-xs text-yellow-500 sm:mr-3">
                {t('delete.blocked_hint', { n: blockedCars.length })}
              </span>
            )}

            <Button
              variant="secondary"
              className="bg-red-600 hover:bg-red-700 text-white
                          w-full sm:w-auto
                          flex items-center justify-center gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedRows.length === 0}
            >
              <Trash size={20} />
              {t('actions.delete_with_count', {
                a: deletableCars.length,
                b: selectedRows.length,
              })}
            </Button>
          </div>
        </div>
      )}

      {isLoading || isFetching ? (
        <p className="text-white text-center">{t('loading')}</p>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto" style={gridStyle}>
            <AgGridReact
              rowHeight={50}
              rowData={filteredRows}
              columnDefs={colDefs}
              rowSelection="multiple"
              pagination={false}
              onSelectionChanged={(event) =>
                setSelectedRows(event.api.getSelectedRows())
              }
            />
          </div>
        </>
      )}
      <div className="mt-4 flex items-center justify-between">
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-disabled={page === 1}
              />
            </PaginationItem>
            {getPageNumbers().map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && p - arr[idx - 1] > 1 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              </React.Fragment>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={t('delete.dialog_title')}
        description={descriptionText}
        confirmText={t('common.delete', {
          ns: 'common',
          defaultValue: 'Delete',
        })}
        cancelText={t('common.cancel', {
          ns: 'common',
          defaultValue: 'Cancel',
        })}
        loadingText={t('deleting')}
        variant="destructive"
      />

      {selectedCarForRent && (
        <RentFormDialog
          pricePerDay={selectedCarForRent.pricePerDay}
          open={rentDialogOpen}
          onOpenChange={(open) => {
            setRentDialogOpen(open);
            if (!open) setSelectedCarForRent(null);
          }}
          defaultCarId={selectedCarForRent.id}
          defaultCarModel={selectedCarForRent.model}
        />
      )}

      {selectedCarForEdit && (
        <EditCarFormDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedCarForEdit(null);
          }}
          car={selectedCarForEdit}
        />
      )}
    </div>
  );
};

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

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  CellStyleModule,
]);

export const CarsGrid = () => {
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
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();

  // Responsive pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1700 ? 7 : 12,
  );

  useEffect(() => {
    setEntity(null); // root breadcrumb = "Cars"
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
      // Don't retry if user has no organization
      if (
        error?.response?.status === 400 &&
        error?.response?.data?.message?.includes('No organization')
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Handle no organization case
  if (
    error?.response?.status === 400 &&
    error?.response?.data?.message?.includes('No organization')
  ) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl mb-4">No Organization Found</h2>
        <p className="mb-4">
          You need to create or join an organization first.
        </p>
        <Button onClick={() => router.navigate({ to: '/organization' })}>
          Set Up Organization
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
        title: 'Car Deleted',
        description: 'The car(s) have been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: 'Error',
        description:
          error?.response?.data?.message || 'Failed to delete car(s).',
      });
    },
  });

  const handleDelete = async () => {
    const deletableRows = selectedRows.filter(canBeDeleted);
    const blockedRows = selectedRows.filter((row) => !canBeDeleted(row));

    if (blockedRows.length > 0) {
      toast({
        type: 'warning',
        title: 'Some cars cannot be deleted',
        description: `${blockedRows.length} selected car(s) cannot be deleted. Only ${deletableRows.length} will be deleted.`,
      });
    }

    if (deletableRows.length === 0) {
      toast({
        type: 'error',
        title: 'Cannot delete',
        description:
          'No selected cars can be deleted. Cars must be available and not already deleted.',
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
    params.value ? `${params.value.toLocaleString()} DHS` : '';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'dd/MM/yyyy');
  };

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
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
      field: 'plateNumber', // 🆕 New plate number column
      headerName: 'Plate Number',
      width: 130,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => (
        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
          {params.value || 'N/A'}
        </span>
      ),
    },
    {
      field: 'make',
      headerName: 'Make',
      width: 120, // Reduced to make room
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'model',
      headerName: 'Model',
      width: 120, // Reduced to make room
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    { field: 'year', headerName: 'Year', width: 80, sortable: true },
    {
      field: 'color', // 🆕 New color column
      headerName: 'Color',
      width: 100,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2">
          {params.value && (
            <div
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: params.value.toLowerCase() }}
            />
          )}
          <span>{params.value || 'N/A'}</span>
        </div>
      ),
    },
    {
      field: 'purchasePrice',
      headerName: 'Purchase Price',
      width: 130,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'pricePerDay',
      headerName: 'Price/Day',
      width: 100,
      valueFormatter: currencyFormatter,
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 110,
      cellRenderer: (params: any) => statusBadge(params.value),
    },
    {
      headerName: 'Availability',
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
            <span>{available ? 'Available' : 'Not Available'}</span>
          </div>
        );
      },
    },
    {
      headerName: 'Next Available',
      field: 'nextAvailableDate',
      width: 140,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) {
          return <span>Available now</span>;
        }
        const parsed = new Date(params.value);
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
      headerName: 'Insurance Expiry',
      field: 'insuranceExpiryDate',
      width: 130,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;

        const expiry = new Date(params.value);
        const today = new Date();
        const soon = addDays(today, 30);

        let color = '';
        let tooltipMessage = 'Insurance is valid';

        if (isBefore(expiry, today)) {
          color = '#EC6142';
          tooltipMessage = 'Insurance has expired';
        } else if (isBefore(expiry, soon)) {
          color = '#FFCA16';
          tooltipMessage = 'Insurance will soon be expired (less than 30 days)';
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
      headerName: 'Technical Inspection Expiry', // ✅ New column
      field: 'technicalVisiteExpiryDate',
      width: 150,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;

        const expiry = new Date(params.value);
        const today = new Date();
        const soon = addDays(today, 30);

        let color = '';
        let tooltipMessage = 'Technical visit is valid';

        if (isBefore(expiry, today)) {
          color = '#EC6142';
          tooltipMessage = 'Technical visit has expired';
        } else if (isBefore(expiry, soon)) {
          color = '#FFCA16';
          tooltipMessage =
            'Technical visit will soon be expired (less than 30 days)';
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
      headerName: 'Actions',
      pinned: 'right',
      width: 180,
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
          >
            <ShoppingCart size={16} /> Rent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={params.data.status === 'deleted'}
            onClick={() => {
              setSelectedCarForEdit(params.data);
              setEditDialogOpen(true);
            }}
          >
            <Hammer size={16} /> Edit
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = data?.totalPages || 1;
  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
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
    descriptionText = `${deletableCars.length} car(s) will be deleted: ${deletableNames
      .slice(0, 5)
      .join(
        ', ',
      )}${deletableCars.length > 5 ? `, and ${deletableCars.length - 5} more` : ''}. ${blockedCars.length} cannot be deleted.`;
  } else {
    descriptionText = `Are you sure you want to delete the following car(s): ${deletableNames
      .slice(0, 5)
      .join(
        ', ',
      )}${deletableCars.length > 5 ? `, and ${deletableCars.length - 5} more` : ''}?`;
  }

  return (
    <div
      className="ag-theme-alpine-dark p-4 rounded-lg shadow-lg"
      style={containerStyle}
    >
      <h2 className="text-xl mb-4 font-bold">Your Cars Dashboard</h2>

      <div className="flex  space-x-4 items-center mb-4">
        <p>Manage your car fleet below:</p>

        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
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
              >
                View Details
              </Button>
            )}
            <Button
              variant="secondary"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedRows.length === 0}
            >
              <Trash size={20} /> Delete ({deletableCars.length}/
              {selectedRows.length})
            </Button>
            {blockedCars.length > 0 && (
              <span className="text-xs text-yellow-500">
                {blockedCars.length} selected car(s) cannot be deleted
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading || isFetching ? (
        <p className="text-white text-center">Loading cars...</p>
      ) : (
        <>
          <div className="flex flex-col h-[calc(100vh-230px)]">
            <div className="flex-1 overflow-y-auto" style={gridStyle}>
              <AgGridReact
                rowHeight={50}
                rowData={data?.data || []}
                columnDefs={colDefs}
                rowSelection="multiple"
                pagination={false}
                onSelectionChanged={(event) =>
                  setSelectedRows(event.api.getSelectedRows())
                }
              />
            </div>
          </div>
        </>
      )}
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
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Car(s)"
        description={descriptionText}
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
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

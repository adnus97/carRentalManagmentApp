'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
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
import { RentFormDialog } from '../rent/rent-form';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  CellStyleModule,
]);

export const CarsGrid = () => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [selectedCarForRent, setSelectedCarForRent] = useState<null | {
    pricePerDay: number;
    id: string;
    model: string;
  }>(null);

  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();

  // Responsive pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1700 ? 7 : 12;
    }
    return 10;
  });

  useEffect(() => {
    const handleResize = () => {
      setPageSize(window.innerWidth < 1700 ? 7 : 12);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch paginated cars
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cars', page, pageSize], // include pageSize so it refetches when it changes
    queryFn: () => getCars(page, pageSize),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Car has been deleted successfully.',
      });
    },
    onError: () => {
      toast({
        type: 'error',
        title: 'Error',
        description: 'An error occurred while deleting the car.',
      });
    },
  });

  const rowSelection = useMemo<
    RowSelectionOptions | 'single' | 'multiple'
  >(() => {
    return { mode: 'multiRow' };
  }, []);

  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const handleDelete = () => {
    selectedRows.forEach((row) => {
      mutation.mutate(row.id);
    });
    setSelectedRows([]);
  };

  const currencyFormatter = (params: any) =>
    params.value ? `${params.value.toLocaleString()} DHS` : '';

  const formatDateToDDMMYYYY = (params: any) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const colDefs: ColDef<Car>[] = [
    {
      field: 'make',
      headerName: 'Make',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'model',
      headerName: 'Model',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'year',
      headerName: 'Year',
      width: 100,
      filter: 'agSetColumnFilter',
      sortable: true,
    },
    {
      field: 'purchasePrice',
      headerName: 'Purchase Price',
      width: 150,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
    },
    {
      field: 'monthlyLeasePrice',
      headerName: 'Monthly Lease Price',
      width: 150,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
    },
    {
      field: 'pricePerDay',
      headerName: 'Price/Day',
      width: 120,
      filter: 'agNumberColumnFilter',
      sortable: true,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
    },

    // Availability column with colored dot + text
    {
      headerName: 'Availability',
      field: 'isAvailable',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['Available', 'Not Available'] },
      cellRenderer: (params: { value: boolean }) => {
        const available = params.value === true;
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

    // Next available date
    {
      headerName: 'Next Available',
      field: 'nextAvailableDate',
      width: 160,
      valueFormatter: (params) =>
        params.value
          ? new Date(params.value).toLocaleDateString('en-GB')
          : 'Available now',
      tooltipValueGetter: (params) =>
        params.value
          ? `Available from ${new Date(params.value).toLocaleDateString('en-GB')}`
          : 'Available now',
    },

    {
      headerName: 'Insurance Expiry',
      field: 'insuranceExpiryDate',
      width: 150,
      filter: 'agSetColumnFilter',
      sortable: true,
      cellStyle: { textAlign: 'right' },
      valueFormatter: formatDateToDDMMYYYY,
    },

    // Actions column
    {
      headerName: 'Actions',
      width: 300,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            className="flex items-center gap-2 hover:bg-gray-4"
            onClick={() => {
              setSelectedCarForRent({
                id: params.data.id,
                model: params.data.model,
                pricePerDay: params.data.pricePerDay,
              });
              setRentDialogOpen(true);
            }}
            disabled={!params.data.isAvailable}
            title={
              params.data.isAvailable
                ? 'Rent this car'
                : `This car is rented until ${
                    params.data.nextAvailableDate
                      ? new Date(
                          params.data.nextAvailableDate,
                        ).toLocaleDateString('en-GB')
                      : 'unknown'
                  }`
            }
          >
            <ShoppingCart size={40} />
            Rent
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {}}
          >
            <Hammer size={40} /> Edit
          </Button>
        </div>
      ),
    },
  ];

  // Pagination controls
  const totalPages = data?.totalPages || 1;
  const getPageNumbers = () => {
    if (!totalPages) return [];
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        pages.push(p);
      }
    }
    return pages;
  };

  return (
    <div
      className="ag-theme-alpine-dark p-4 rounded-lg shadow-lg"
      style={containerStyle}
    >
      <h2 className="text-xl mb-4 font-bold">Your Cars Dashboard</h2>

      <div className="flex justify-between mb-4 items-center">
        <p>Manage your available cars below:</p>
        <div className="flex gap-4 text-xs items-center">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#22c55e' }}
            ></span>
            Available
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#ef4444' }}
            ></span>
            Not Available
          </div>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <Button
          variant="secondary"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white mb-2"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash size={20} /> Delete ({selectedRows.length})
        </Button>
      )}

      {isLoading || isFetching ? (
        <p className="text-white text-center">Loading cars...</p>
      ) : (
        <>
          <div style={gridStyle}>
            <AgGridReact
              rowHeight={50}
              rowData={data?.data || []}
              columnDefs={colDefs}
              rowSelection={rowSelection}
              pagination={false}
              domLayout="autoHeight"
              onSelectionChanged={(event) =>
                setSelectedRows(event.api.getSelectedRows())
              }
            />
          </div>

          {/* Pagination Widget */}
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={page === 1}
                  tabIndex={page === 1 ? -1 : 0}
                  style={{ pointerEvents: page === 1 ? 'none' : undefined }}
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
                      tabIndex={p === page ? -1 : 0}
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
                  tabIndex={page === totalPages ? -1 : 0}
                  style={{
                    pointerEvents: page === totalPages ? 'none' : undefined,
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Confirmation"
        description="Are you sure you want to delete the car?"
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />

      {/* Rent Form Dialog */}
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
    </div>
  );
};

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
  TextFilterModule,
} from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { deleteCar, getCars } from '@/api/cars';
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
]);

export const CarsGrid = () => {
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [selectedCarForRent, setSelectedCarForRent] = useState<null | {
    pricePerDay: number;
    id: string;
    model: string;
  }>(null);

  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch paginated cars
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cars', page, pageSize],
    queryFn: () => getCars(page, pageSize),
    placeholderData: (previousData) => previousData,
  });

  const mutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Car has been deleted successfully.',
        button: {
          label: 'Undo',
          onClick: () => {
            // Add your undo logic here
          },
        },
      });
    },
    onError: (error) => {
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
    return {
      mode: 'multiRow',
    };
  }, []);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const handleDelete = () => {
    selectedRows.forEach((row) => {
      mutation.mutate(row.id);
    });
    setSelectedRows([]);
  };

  const currencyFormatter = (params: any) => {
    return params.value ? `${params.value.toLocaleString()} DHS` : '';
  };

  const formatDateToDDMMYYYY = (params: any) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const colDefs: ColDef[] = [
    // ... your column definitions ...
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
    {
      headerName: 'Availability',
      field: 'isAvailable',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['Available', 'Not Available'],
      },
      cellStyle: { textAlign: 'right' },
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
    {
      headerName: 'Actions',
      field: 'actions',
      width: 300,
      cellRenderer: (params: any) => (
        <div className="flex gap-2  items-center h-full">
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
      <h2 className="text-xl text-var(--gray-12) mb-4 font-bold">
        Your Cars Dashboard
      </h2>
      <div className="flex justify-between mb-4">
        <p className="text-var(--gray-9)">Manage your available cars below:</p>
        {selectedRows.length > 0 && (
          <Button
            variant="secondary"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setShowSignOutDialog(true)}
          >
            <Trash size={20} /> Delete ({selectedRows.length})
          </Button>
        )}
      </div>
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
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
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

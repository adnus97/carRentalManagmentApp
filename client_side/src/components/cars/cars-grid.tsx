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
import { format, isBefore, addDays } from 'date-fns';
import { EditCarFormDialog } from './edit-car-form';
import { useRouter } from '@tanstack/react-router';

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
  const [selectedCarForRent, setSelectedCarForRent] = useState<null | Car>(
    null,
  );
  const [selectedRows, setSelectedRows] = useState<Car[]>([]);
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
    const handleResize = () => {
      setPageSize(window.innerWidth < 1700 ? 7 : 12);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCarForEdit, setSelectedCarForEdit] = useState<Car | null>(
    null,
  );
  // Fetch cars
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cars', page, pageSize],
    queryFn: () => getCars(page, pageSize),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // Delete mutation
  const mutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast({
        type: 'success',
        title: 'Car Deleted',
        description: 'The car has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to delete car.',
      });
    },
  });

  const handleDelete = () => {
    selectedRows.forEach((row) => {
      mutation.mutate(row.id);
    });
    setSelectedRows([]);
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
      checkboxSelection: true, // ✅ Only here
      headerCheckboxSelection: true, // ✅ "Select all" in header
      width: 50,
      pinned: 'left', // ✅ Always visible
      lockPinned: true, // ✅ Prevent unpinning
      suppressMovable: true, // ✅ Prevent dragging
    },
    {
      field: 'make',
      headerName: 'Make',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      checkboxSelection: false, // ❌ Prevents duplicate checkbox
    },
    {
      field: 'model',
      headerName: 'Model',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    { field: 'year', headerName: 'Year', width: 100, sortable: true },
    {
      field: 'purchasePrice',
      headerName: 'Purchase Price',
      width: 150,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'monthlyLeasePrice',
      headerName: 'Monthly Lease Price',
      width: 150,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'pricePerDay',
      headerName: 'Price/Day',
      width: 120,
      valueFormatter: currencyFormatter,
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130,
      cellRenderer: (params: { value: any }) => statusBadge(params.value),
    },
    {
      headerName: 'Availability',
      field: 'isAvailable',
      width: 150,
      cellRenderer: (params: { value: any }) => {
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
      width: 160,
      valueFormatter: (params) =>
        params.value ? formatDate(params.value) : 'Available now',
    },
    {
      headerName: 'Insurance Expiry',
      field: 'insuranceExpiryDate',
      width: 150,
      cellStyle: (params) => {
        const expiry = new Date(params.value);
        const soon = addDays(new Date(), 30);
        if (isBefore(expiry, new Date())) return { color: 'red' };
        if (isBefore(expiry, soon)) return { color: 'orange' };
        return null;
      },
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      width: 200,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedCarForRent(params.data);
              setRentDialogOpen(true);
            }}
            disabled={
              !params.data.isAvailable ||
              ['maintenance', 'sold', 'deleted'].includes(params.data.status)
            }
          >
            <ShoppingCart size={20} /> Rent
          </Button>
          <Button
            variant="outline"
            disabled={params.data.status === 'deleted'}
            onClick={() => {
              setSelectedCarForEdit(params.data);
              setEditDialogOpen(true);
            }}
          >
            <Hammer size={20} /> Edit
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

  return (
    <div
      className="ag-theme-alpine-dark p-4 rounded-lg shadow-lg"
      style={containerStyle}
    >
      <h2 className="text-xl mb-4 font-bold">Your Cars Dashboard</h2>
      <p>Manage your car fleet below:</p>
      <br />
      {selectedRows.length > 0 && (
        <Button
          variant="secondary"
          className={`flex items-center gap-2 mb-2 text-white ${
            selectedRows.some(
              (car) => !car.isAvailable || car.status === 'deleted',
            )
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
          onClick={() => {
            if (
              selectedRows.some(
                (car) => !car.isAvailable || car.status === 'deleted',
              )
            ) {
              toast({
                type: 'error',
                title: 'Cannot Delete',
                description:
                  'One or more selected cars are currently rented or already deleted.',
              });
              return;
            }
            setShowDeleteDialog(true);
          }}
          disabled={selectedRows.some(
            (car) => !car.isAvailable || car.status === 'deleted',
          )}
          title={
            selectedRows.some(
              (car) => !car.isAvailable || car.status === 'deleted',
            )
              ? 'Cannot delete cars that are rented or already deleted'
              : 'Delete selected cars'
          }
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
              rowSelection="multiple"
              pagination={false}
              domLayout="autoHeight"
              onSelectionChanged={(event) =>
                setSelectedRows(event.api.getSelectedRows())
              }
              onRowDoubleClicked={(event) => {
                const carId = event.data?.id; //

                if (!carId) {
                  console.error('No car ID found in row data');
                  return;
                }

                router.navigate({
                  to: '/carDetails/$id',
                  params: { id: carId },
                });
              }}
            />
          </div>

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
        </>
      )}

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Car"
        description={`Are you sure you want to delete ${selectedRows[0]?.make} ${selectedRows[0]?.model}?`}
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

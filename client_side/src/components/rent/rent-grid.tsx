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
} from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { removeRent, getAllRentsWithCarAndCustomer } from '@/api/rents';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilSimple, Trash, X } from '@phosphor-icons/react';
import { ConfirmationDialog } from '../confirmation-dialog';
import { toast } from '@/components/ui/toast';
import React from 'react';
import { EditRentFormDialog } from './edit-rent-form';
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

type RentRow = {
  isOpenContract: boolean;
  deposit: number | undefined;
  id: string;
  carModel: string;
  customerName?: string;
  startDate: string | Date;
  expectedEndDate?: string | Date;
  returnedAt?: string | Date;
  pricePerDay: number;
  status?: 'active' | 'completed' | 'canceled';
  totalPaid?: number;
  isFullyPaid?: boolean;
  totalPrice: number;
  guarantee?: number;
  lateFee?: number;
  // ...other fields as needed
};

export const RentsGrid = () => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRentForEdit, setSelectedRentForEdit] =
    useState<null | RentRow>(null);

  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Fetch paginated rents with React Query and keepPreviousData for smooth transitions
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rents', page, pageSize],
    queryFn: () => getAllRentsWithCarAndCustomer(page, pageSize),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: removeRent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rent contract has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast({
        type: 'error',
        title: 'Error',
        description: 'An error occurred while deleting the rent contract.',
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
      deleteMutation.mutate(row.id);
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

  const statusFormatter = (params: any) => {
    const status = params.value;
    const statusColors = {
      active: 'text-green-500',
      completed: 'text-blue-500',
      canceled: 'text-red-500',
    };
    return (
      <span className={statusColors[status as keyof typeof statusColors] || ''}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const colDefs: ColDef[] = [
    {
      field: 'carModel',
      headerName: 'Car Model',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 120,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: formatDateToDDMMYYYY,
    },
    {
      field: 'expectedEndDate',
      headerName: 'Expected End Date',
      width: 150,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: formatDateToDDMMYYYY,
    },
    {
      field: 'returnedAt',
      headerName: 'Returned At',
      width: 130,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: formatDateToDDMMYYYY,
    },
    {
      field: 'totalPrice',
      headerName: 'Total Price',
      width: 120,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
      sortable: true,
    },
    {
      field: 'deposit',
      headerName: 'Deposit',
      width: 100,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'guarantee',
      headerName: 'Guarantee',
      width: 110,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'lateFee',
      headerName: 'Late Fee',
      width: 100,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['active', 'completed', 'canceled'],
      },
      cellRenderer: statusFormatter,
    },
    {
      field: 'isOpenContract',
      headerName: 'Open Contract',
      width: 130,
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['Yes', 'No'],
      },
      valueFormatter: (params: any) => (params.value ? 'Yes' : 'No'),
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 200,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="ghost"
            className="flex items-center gap-2 hover:bg-gray-4"
            onClick={() => {
              setSelectedRentForEdit({
                id: params.data.id,
                carModel: params.data.carModel,
                customerName: params.data.customerName,
                startDate: params.data.startDate,
                expectedEndDate: params.data.expectedEndDate,
                returnedAt: params.data.returnedAt,
                pricePerDay: params.data.pricePerDay,
                status: params.data.status,
                totalPaid: params.data.totalPaid,
                isFullyPaid: params.data.isFullyPaid,
                totalPrice: params.data.totalPrice,
                isOpenContract: params.data.isOpenContract,
                deposit: params.data.deposit,
                guarantee: params.data.guarantee,
                lateFee: params.data.lateFee,
              });
              setEditDialogOpen(true);
            }}
          >
            <PencilSimple size={16} />
            Edit
          </Button>
          {params.data.status === 'active' && (
            <Button
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:bg-red-50"
              onClick={() => {
                // Handle end contract logic
                console.log('End contract:', params.data.id);
              }}
            >
              <X size={16} />
              End
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Pagination controls
  const totalPages = data?.totalPages || 1;

  // For page number rendering
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
        Rent Contracts Dashboard
      </h2>
      <div className="flex justify-between mb-4">
        <p className="text-var(--gray-9)">Manage your rent contracts below:</p>
        {selectedRows.length > 0 && (
          <Button
            variant="secondary"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash size={20} /> Delete ({selectedRows.length})
          </Button>
        )}
      </div>
      {isLoading || isFetching ? (
        <p className="text-white text-center">Loading rent contracts...</p>
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
              className="!bg-green-800"
              getRowClass={(params) => {
                // Debug: log the data
                console.log('Row data:', params.data);

                if (
                  !params.data ||
                  typeof params.data.isFullyPaid === 'undefined'
                )
                  return '';

                if (params.data.isFullyPaid === true) return 'bg-green';
                if (params.data.isFullyPaid === false) return 'bg-red';

                return '';
              }}
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
        description="Are you sure you want to delete the selected rent contract(s)?"
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />

      {/* Edit Rent Form Dialog */}
      {selectedRentForEdit && (
        <EditRentFormDialog
          open={editDialogOpen}
          onOpenChange={(open: boolean | ((prevState: boolean) => boolean)) => {
            setEditDialogOpen(open);
            if (!open) setSelectedRentForEdit(null);
          }}
          rentId={selectedRentForEdit.id}
          carModel={selectedRentForEdit.carModel}
          customerName={selectedRentForEdit.customerName}
          startDate={selectedRentForEdit.startDate}
          pricePerDay={selectedRentForEdit.pricePerDay}
          status={selectedRentForEdit.status}
          totalPaid={selectedRentForEdit.totalPaid}
          isFullyPaid={selectedRentForEdit.isFullyPaid}
          totalPrice={selectedRentForEdit.totalPrice}
          isOpenContract={selectedRentForEdit.isOpenContract}
          deposit={selectedRentForEdit.deposit}
          guarantee={selectedRentForEdit.guarantee}
          lateFee={selectedRentForEdit.lateFee}
          returnedAt={selectedRentForEdit.returnedAt}
        />
      )}
    </div>
  );
};

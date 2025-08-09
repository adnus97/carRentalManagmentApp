'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
  RowStyleModule,
  TextFilterModule,
} from 'ag-grid-community';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { removeRent, getAllRentsWithCarAndCustomer } from '@/api/rents';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilSimple, Trash } from '@phosphor-icons/react';
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
import { RentStatus } from '@/types/rent-status.type';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  RowStyleModule,
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
  status?: RentStatus;
  totalPaid?: number;
  isFullyPaid?: boolean;
  totalPrice: number;
  guarantee?: number;
  lateFee?: number;
};

export const RentsGrid = () => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRentForEdit, setSelectedRentForEdit] =
    useState<null | RentRow>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);

  const queryClient = useQueryClient();

  // Responsive pageSize
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

  // Fetch paginated rents
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rents', page, pageSize],
    queryFn: () => getAllRentsWithCarAndCustomer(page, pageSize),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // 1 minute
  });

  useEffect(() => {
    if (!isFetching) setLastUpdated(new Date());
  }, [isFetching]);

  // DELETE LOGIC
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

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
    onError: (error: any) => {
      console.log('Full error object:', error); // ✅ Debug log

      let errorMessage = 'An error occurred while deleting the rent contract.';

      // Handle Axios error response structure
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.log('Extracted error message:', errorMessage); // ✅ Debug log

      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  const handleDelete = () => {
    selectedRows.forEach((row) => {
      deleteMutation.mutate(row.id);
    });
    setSelectedRows([]);
  };

  const rowSelection = useMemo<
    RowSelectionOptions | 'single' | 'multiple'
  >(() => {
    return { mode: 'multiRow' };
  }, []);

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

  const statusFormatter = (params: any) => {
    const { status, returnedAt } = params.data;
    const now = new Date();
    const isOverdue =
      status === 'active' && returnedAt && new Date(returnedAt) < now;

    if (isOverdue) {
      return (
        <span className="bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
          Overdue
        </span>
      );
    }

    const statusMap: Record<RentStatus, { label: string; className: string }> =
      {
        reserved: {
          label: 'Reserved',
          className:
            'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 px-2 py-1 rounded',
        },
        active: {
          label: 'Active',
          className:
            'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded',
        },
        completed: {
          label: 'Completed',
          className:
            'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded',
        },
        canceled: {
          label: 'Canceled',
          className:
            'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300 px-2 py-1 rounded',
        },
      };

    const s = statusMap[status as RentStatus] || {
      label: status,
      className: '',
    };
    return <span className={s.className}>{s.label}</span>;
  };

  // ✅ Helper to update a row locally in the grid without refetch
  const updateRowInGrid = (updatedRow: Partial<RentRow> & { id: string }) => {
    queryClient.setQueryData(['rents', page, pageSize], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((row: RentRow) =>
          row.id === updatedRow.id ? { ...row, ...updatedRow } : row,
        ),
      };
    });
  };

  // Row coloring rules
  const rowClassRules = useMemo(
    () => ({
      'green-row': (params: any) => {
        const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
        const totalPaidNum = Number(totalPaid) || 0;
        const totalPriceNum = Number(totalPrice) || 0;
        return (
          isFullyPaid === true ||
          (isFullyPaid === false && totalPaidNum === totalPriceNum)
        );
      },
      'red-row': (params: any) => {
        const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
        const totalPaidNum = Number(totalPaid) || 0;
        const totalPriceNum = Number(totalPrice) || 0;
        return isFullyPaid === false && totalPaidNum !== totalPriceNum;
      },
      'yellow-row': (params: any) => {
        const { status, returnedAt } = params.data || {};
        return (
          status === 'active' && returnedAt && new Date(returnedAt) < new Date()
        );
      },
      'purple-row': (params: any) => {
        const { status } = params.data || {};
        return status === 'reserved';
      },
    }),
    [],
  );

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
      valueFormatter: (params) => {
        const { expectedEndDate } = params.data || {};
        if (!expectedEndDate) {
          return 'Open';
        }
        return formatDateToDDMMYYYY({ value: expectedEndDate });
      },
    },
    {
      field: 'returnedAt',
      headerName: 'Returned At',
      width: 130,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        const { returnedAt } = params.data || {};
        if (!returnedAt) {
          return 'Open';
        }
        return formatDateToDDMMYYYY({ value: returnedAt });
      },
    },
    {
      field: 'totalPrice',
      headerName: 'Total Price',
      width: 130,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
      filter: 'agNumberColumnFilter',
      sortable: true,
    },
    {
      headerName: 'Payment Progress',
      width: 200,
      cellRenderer: (params: {
        data: { totalPaid: number; totalPrice: number };
      }) => {
        const paid = params.data.totalPaid || 0;
        const total = params.data.totalPrice || 0;
        const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
        const displayPercent = percent > 100 ? 100 : percent;
        return (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="w-4/5 bg-gray-200 dark:bg-gray-700 rounded h-3 mb-1">
              <div
                className="bg-green-500 h-3 rounded"
                style={{ width: `${displayPercent}%` }}
              ></div>
            </div>
            <span className="text-xs">
              {percent}% — Paid: {paid.toLocaleString()} /{' '}
              {total.toLocaleString()} DHS
            </span>
          </div>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['reserved', 'active', 'completed', 'canceled'] },
      cellRenderer: statusFormatter,
    },
    {
      field: 'isOpenContract',
      headerName: 'Open Contract',
      width: 130,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['Yes', 'No'] },
      valueFormatter: (params: any) => (params.value ? 'Yes' : 'No'),
    },
    {
      headerName: 'Actions',
      width: 200,
      cellRenderer: (params: any) => {
        const fullyPaid = params.data.totalPaid === params.data.totalPrice;
        const hasReturnedAt = Boolean(params.data.returnedAt);
        const isActuallyReturned =
          hasReturnedAt && new Date(params.data.returnedAt) <= new Date();

        // Only disable if BOTH fully paid AND actually returned
        const shouldDisable = fullyPaid && isActuallyReturned;

        return (
          <div className="flex gap-2 items-center h-full">
            <Button
              variant="ghost"
              disabled={shouldDisable}
              title={
                shouldDisable
                  ? 'Cannot edit a fully paid and returned contract'
                  : 'Edit rent'
              }
              onClick={() => {
                setSelectedRentForEdit(params.data);
                setEditDialogOpen(true);
              }}
            >
              <PencilSimple size={16} /> Edit
            </Button>
          </div>
        );
      },
    },
  ];

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
      <h2 className="text-xl mb-1 font-bold">Rent Contracts Dashboard</h2>
      <p className="text-xs text-gray-500 mb-4">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>

      <div className="flex justify-between mb-4 items-center">
        <p>Manage your rent contracts below:</p>
        <div className="flex gap-4 text-xs items-center">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#22c55e' }}
            ></span>
            Fully Paid
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#ef4444' }}
            ></span>
            Not Fully Paid
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#eab308' }}
            ></span>
            Overdue
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
        <p className="text-center">Loading rent contracts...</p>
      ) : (
        <>
          <div style={gridStyle}>
            <AgGridReact
              rowHeight={60}
              rowData={data?.data || []}
              columnDefs={colDefs}
              rowSelection={rowSelection}
              pagination={false}
              domLayout="autoHeight"
              rowClassRules={rowClassRules}
              onSelectionChanged={(event) =>
                setSelectedRows(event.api.getSelectedRows())
              }
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
        title="Confirmation"
        description="Are you sure you want to delete the selected rent contract(s)?"
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />

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

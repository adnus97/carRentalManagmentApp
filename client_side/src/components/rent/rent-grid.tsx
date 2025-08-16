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
  deposit?: number;
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRentForEdit, setSelectedRentForEdit] =
    useState<null | RentRow>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

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

  // Helper function to determine actual status (matching backend logic)
  const getActualStatus = (rent: RentRow): RentStatus => {
    const now = new Date();
    const startDate = new Date(rent.startDate);
    const returnedAt = rent.returnedAt ? new Date(rent.returnedAt) : null;
    const expectedEndDate = rent.expectedEndDate
      ? new Date(rent.expectedEndDate)
      : null;

    if (rent.status === 'canceled') return 'canceled';
    if (returnedAt && returnedAt <= now) return 'completed';
    if (startDate > now) return 'reserved';
    return 'active';
  };

  // Helper function to check if a rental can be deleted
  const canBeDeleted = (rent: RentRow): boolean => {
    return getActualStatus(rent) !== 'active';
  };

  // DELETE LOGIC
  const deleteMutation = useMutation({
    mutationFn: removeRent, // ✅ now points to /soft-delete endpoint
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rent contract(s) deleted successfully.',
      });
    },
    onError: (error: any) => {
      let errorMessage = 'An error occurred while deleting the rent contract.';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  const handleDelete = async () => {
    const deletableRows = selectedRows.filter(canBeDeleted);
    const activeRows = selectedRows.filter((row) => !canBeDeleted(row));

    if (activeRows.length > 0) {
      toast({
        type: 'warning',
        title: 'Some rentals cannot be deleted',
        description: `${activeRows.length} active rental(s) cannot be deleted. Only ${deletableRows.length} rental(s) will be deleted.`,
      });
    }

    if (deletableRows.length === 0) {
      toast({
        type: 'error',
        title: 'Cannot delete',
        description:
          'No rentals can be deleted. Active rentals must be completed or canceled first.',
      });
      setShowDeleteDialog(false);
      return;
    }

    try {
      await Promise.allSettled(
        deletableRows.map((row) => deleteMutation.mutateAsync(row.id)),
      );
      setSelectedRows([]);
    } catch (error) {
      console.error('Delete error:', error);
    }

    setShowDeleteDialog(false);
  };

  // const rowSelection = useMemo<RowSelectionOptions | 'single' | 'multiple'>(
  //   () => ({
  //     mode: 'multiRow',
  //     checkboxes: true,
  //     headerCheckbox: true,
  //   }),
  //   [],
  // );

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
    const actualStatus = getActualStatus(params.data);
    const now = new Date();
    const returnedAt = params.data.returnedAt
      ? new Date(params.data.returnedAt)
      : null;
    const isOverdue =
      actualStatus === 'active' && returnedAt && returnedAt < now;

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

    const s = statusMap[actualStatus] || {
      label: actualStatus,
      className: '',
    };
    return <span className={s.className}>{s.label}</span>;
  };

  const rowClassRules = useMemo(
    () => ({
      'green-row': (params: any) => {
        const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
        return (
          isFullyPaid === true ||
          (isFullyPaid === false && Number(totalPaid) === Number(totalPrice))
        );
      },
      'red-row': (params: any) => {
        const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
        return (
          isFullyPaid === false && Number(totalPaid) !== Number(totalPrice)
        );
      },
      'yellow-row': (params: any) => {
        const actualStatus = getActualStatus(params.data);
        const { returnedAt } = params.data || {};
        return (
          actualStatus === 'active' &&
          returnedAt &&
          new Date(returnedAt) < new Date()
        );
      },
      'purple-row': (params: any) =>
        getActualStatus(params.data) === 'reserved',
    }),
    [],
  );

  const rowData = useMemo(() => {
    return data?.data ? [...data.data] : [];
  }, [data?.data]);

  const colDefs: ColDef[] = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      lockPinned: true,
      suppressMovable: true,
      cellClassRules: {
        'left-border-green': (params) => {
          const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
          return (
            isFullyPaid === true ||
            (isFullyPaid === false && Number(totalPaid) === Number(totalPrice))
          );
        },
        'left-border-red': (params) => {
          const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
          return (
            isFullyPaid === false && Number(totalPaid) !== Number(totalPrice)
          );
        },
        'left-border-yellow': (params) => {
          const actualStatus = getActualStatus(params.data);
          const { returnedAt } = params.data || {};
          return (
            actualStatus === 'active' &&
            returnedAt &&
            new Date(returnedAt) < new Date()
          );
        },
      },
    },
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
      valueFormatter: (params) =>
        params.data?.expectedEndDate
          ? formatDateToDDMMYYYY({ value: params.data.expectedEndDate })
          : 'Open',
    },
    {
      field: 'returnedAt',
      headerName: 'Returned At',
      width: 141,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) =>
        params.data?.returnedAt
          ? formatDateToDDMMYYYY({ value: params.data.returnedAt })
          : 'Open',
    },
    {
      field: 'totalPrice',
      headerName: 'Total Price',
      width: 140,
      cellStyle: { textAlign: 'right' },
      valueGetter: (params) => {
        const {
          isOpenContract,
          totalPrice,
          startDate,
          returnedAt,
          pricePerDay,
        } = params.data || {};

        if (isOpenContract && returnedAt && startDate && pricePerDay) {
          const start = new Date(startDate);
          const end = new Date(returnedAt);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
            const days = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            );
            return days * pricePerDay;
          }
        }

        if (isOpenContract && !returnedAt) {
          return null;
        }

        return totalPrice || 0;
      },
      valueFormatter: (params) => {
        if (params.value === null || params.value === undefined) {
          return 'Open';
        }
        return `${params.value.toLocaleString()} DHS`;
      },
      filter: 'agNumberColumnFilter',
      sortable: true,
    },
    {
      headerName: 'Payment Progress',
      width: 220,
      cellRenderer: (params: {
        data: {
          totalPaid: number;
          totalPrice: number;
          isOpenContract: boolean;
          returnedAt?: string;
          startDate?: string;
          pricePerDay?: number;
        };
      }) => {
        const {
          totalPaid,
          totalPrice,
          isOpenContract,
          returnedAt,
          startDate,
          pricePerDay,
        } = params.data;
        const paid = totalPaid || 0;
        let total = totalPrice || 0;

        if (isOpenContract && returnedAt && startDate && pricePerDay) {
          const start = new Date(startDate);
          const end = new Date(returnedAt);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
            const days = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            );
            total = days * pricePerDay;
          }
        }

        if (isOpenContract && !returnedAt) {
          return (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <span className="text-xs text-muted-foreground">
                Open Contract
              </span>
              <span className="text-xs">Paid: {paid.toLocaleString()} DHS</span>
            </div>
          );
        }

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
      width: 160,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['reserved', 'active', 'completed', 'canceled'] },
      cellRenderer: statusFormatter,
    },
    {
      field: 'isOpenContract',
      headerName: 'Open Contract',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['Yes', 'No'] },
      valueFormatter: (params: any) => (params.value ? 'Yes' : 'No'),
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      width: 200,
      cellRenderer: (params: any) => {
        const actualStatus = getActualStatus(params.data);
        const fullyPaid = params.data.totalPaid === params.data.totalPrice;
        const hasReturnedAt = Boolean(params.data.returnedAt);
        const isActuallyReturned =
          hasReturnedAt && new Date(params.data.returnedAt) <= new Date();
        const shouldDisableEdit = fullyPaid && isActuallyReturned;

        return (
          <div className="flex gap-2 items-center h-full">
            <Button
              variant="ghost"
              disabled={shouldDisableEdit}
              title={
                shouldDisableEdit
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

  const deletableCount = selectedRows.filter(canBeDeleted).length;
  const activeCount = selectedRows.length - deletableCount;

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
        <div className="flex  space-x-4 items-center mb-2">
          <p>Manage your rent contracts below:</p>
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 ">
              <Button
                variant="secondary"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedRows.length === 0}
              >
                <Trash size={20} />
                Delete ({deletableCount}/{selectedRows.length})
              </Button>

              {activeCount > 0 && (
                <span className="text-xs text-yellow-600">
                  {activeCount} active rental(s) cannot be deleted
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 text-xs items-center">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#33B074' }}
            ></span>
            Fully Paid
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#EC6142' }}
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

      {isLoading || isFetching ? (
        <p className="text-center">Loading rent contracts...</p>
      ) : (
        <>
          {/* Match CarsGrid style: fixed height scrollable grid */}
          <div className="flex flex-col h-[calc(100vh-265px)]">
            <div className="flex-1 overflow-y-auto" style={gridStyle}>
              <AgGridReact
                rowHeight={60}
                rowData={rowData}
                columnDefs={colDefs}
                rowSelection="multiple"
                pagination={false}
                rowClassRules={rowClassRules}
                onSelectionChanged={(event) => {
                  const selectedNodes = event.api.getSelectedRows();
                  setSelectedRows(selectedNodes);
                }}
              />
            </div>
          </div>

          {/* Pagination outside scroll area */}
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
        description={
          activeCount > 0
            ? `${deletableCount} rental(s) will be deleted. ${activeCount} active rental(s) will be skipped as they cannot be deleted.`
            : `Are you sure you want to delete the selected ${deletableCount} rental contract(s)?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />

      {selectedRentForEdit && (
        <EditRentFormDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
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
          onRentUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['rents'] });
            queryClient.refetchQueries({ queryKey: ['rents', page, pageSize] });
          }}
        />
      )}
    </div>
  );
};

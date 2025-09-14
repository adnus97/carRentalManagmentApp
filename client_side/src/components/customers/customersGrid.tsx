'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  CellStyleModule,
} from 'ag-grid-community';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  getCustomers,
  deleteCustomer,
  unblacklistCustomer,
  Customer,
  CustomerWithFiles,
  getCustomerWithFiles,
} from '@/api/customers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  Hammer,
  Trash,
  Prohibit,
  Shield,
  ShieldWarning,
} from '@phosphor-icons/react';
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
import { useRouter } from '@tanstack/react-router';
import { BlacklistDialog } from './blacklist-dialog';
import { EditClientDialog } from './edit-client-form';
import BlacklistModal from './modals/BlacklistModal'; // Import our new component
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  CellStyleModule,
]);

export const ClientsGrid = () => {
  const [selectedRows, setSelectedRows] = useState<Customer[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1700 ? 7 : 12,
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithFiles | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch customers
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', page, pageSize],
    queryFn: () => getCustomers(page, pageSize),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], exact: false });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Customer deleted.',
      });
    },
    onError: () =>
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete customer',
      }),
  });

  const unblacklistMutation = useMutation({
    mutationFn: unblacklistCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], exact: false });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Customer unblacklisted.',
      });
    },
  });

  const handleDelete = async () => {
    try {
      await Promise.allSettled(
        selectedRows.map((row) => deleteMutation.mutateAsync(row.id)),
      );
      setSelectedRows([]);
    } catch (err) {
      console.error(err);
    }
    setShowDeleteDialog(false);
  };

  const handleEditCustomer = async (customer: Customer) => {
    setIsLoadingCustomer(true);
    try {
      const customerWithFiles = await getCustomerWithFiles(customer.id);
      setSelectedCustomer(customerWithFiles);
      setEditDialogOpen(true);
    } catch (error) {
      console.error('Failed to load customer with files:', error);
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load customer details for editing',
      });
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  const colDefs: ColDef<Customer>[] = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
    },
    {
      headerName: 'Full Name',
      valueGetter: (params) =>
        `${params.data?.firstName || ''} ${params.data?.lastName || ''}`,
      filter: 'agTextColumnFilter',
      width: 200,
      flex: 1,
    },
    { field: 'email', headerName: 'Email', width: 220, flex: 1 },
    { field: 'phone', headerName: 'Phone', width: 150, flex: 1 },
    {
      field: 'documentId',
      headerName: 'Document',
      width: 180,
      flex: 1,
      valueGetter: (params) =>
        `${params.data?.documentId || ''} (${params.data?.documentType || ''})`,
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 120,
      flex: 1,
      cellRenderer: (params: any) => {
        const stars = Math.round(params.value || 0);
        return (
          <div className="flex items-center gap-1">
            <span>{params.value?.toFixed(1) || '0.0'}</span>
            <span className="text-yellow-400">
              {'★'.repeat(stars)}
              {'☆'.repeat(5 - stars)}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'isBlacklisted',
      width: 150,
      cellRenderer: (params: any) => {
        if (params.value) {
          return (
            <span className="px-2 py-1 rounded text-xs bg-[#EC6142] text-white">
              Blacklisted
            </span>
          );
        }
        return (
          <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
            Active
          </span>
        );
      },
    },
    {
      headerName: 'Blacklist Reason',
      field: 'blacklistReason',
      width: 200,
      flex: 1,
      cellRenderer: (params: any) =>
        params.value ? (
          <span className="text-[#EC6142] italic ">{params.value}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      width: 150,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCustomer(params.data);
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

  // Count blacklisted customers in current view
  const blacklistedCount =
    data?.data?.filter((customer: Customer) => customer.isBlacklisted).length ||
    0;
  const totalCount = data?.total || 0;

  return (
    <div
      className="ag-theme-alpine-dark flex flex-col"
      style={{ width: '100%', height: 'calc(100vh - 100px)' }}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Clients Dashboard</h2>

        {/* Blacklist Action Buttons */}
        <div className="flex items-center gap-3">
          <BlacklistModal
            type="organization"
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700"
              >
                <Shield size={16} />
                My Blacklist
              </Button>
            }
          />
          <BlacklistModal
            type="global"
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700"
              >
                <ShieldWarning size={16} />
                Global Blacklist
              </Button>
            }
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
        <span>Manage your clients below:</span>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <span>
            Total: <Badge variant="outline">{totalCount}</Badge>
          </span>
        </div>
        {blacklistedCount > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span>
                Blacklisted:{' '}
                <Badge variant="destructive" className="bg-[#EC6142]">
                  {blacklistedCount}
                </Badge>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Selection Toolbar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedRows.length} customer{selectedRows.length > 1 ? 's' : ''}{' '}
            selected
          </span>
          <Separator orientation="vertical" className="h-4" />

          {selectedRows.length === 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.navigate({
                    to: '/customerDetails/$id',
                    params: { id: selectedRows[0].id },
                  })
                }
              >
                <Eye size={16} /> View
              </Button>

              {selectedRows[0].isBlacklisted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblacklistMutation.mutate(selectedRows[0].id)}
                  className="border-green-200 hover:border-green-300 text-green-700"
                >
                  <Prohibit size={16} /> Unblacklist
                </Button>
              ) : (
                <BlacklistDialog customerId={selectedRows[0].id} />
              )}
            </>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="ml-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash size={16} /> Delete ({selectedRows.length})
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        {isLoading || isFetching ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-white text-center">Loading customers...</p>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <Pagination>
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

      {/* Dialogs */}
      {selectedCustomer && (
        <EditClientDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />
      )}

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={
          selectedRows.length === 1
            ? 'Delete Customer'
            : `Delete ${selectedRows.length} Customers`
        }
        description={
          selectedRows.length === 1
            ? `Are you sure you want to delete "${selectedRows[0].firstName} ${selectedRows[0].lastName}"?`
            : selectedRows.length <= 5
              ? `Are you sure you want to delete these ${selectedRows.length} customers: 
       ${selectedRows.map((c) => `${c.firstName} ${c.lastName}`).join(', ')}?`
              : `Are you sure you want to delete ${selectedRows.length} customers? 
       ${selectedRows
         .slice(0, 3)
         .map((c) => `${c.firstName} ${c.lastName}`)
         .join(', ')}...`
        }
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />
    </div>
  );
};

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
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import {
  getCustomers,
  deleteCustomer,
  restoreCustomer,
  Customer,
} from '@/api/customers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Trash, RotateCcw, UserPlus } from 'lucide-react';
import { ConfirmationDialog } from '../confirmation-dialog';
import { toast } from '@/components/ui/toast';
import { useRouter } from '@tanstack/react-router';
import { AddClientDialog } from './add-client-form';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  CellStyleModule,
]);

export function ClientsGrid() {
  const [selectedRows, setSelectedRows] = useState<Customer[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const queryClient = useQueryClient();
  const router = useRouter();

  // ✅ Fetch clients
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', page, pageSize],
    queryFn: () => getCustomers(page, pageSize),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // ✅ Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        type: 'success',
        title: 'Client Deleted',
        description: 'The client has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: 'Error',
        description:
          error?.response?.data?.message || 'Failed to delete client.',
      });
    },
  });

  // ✅ Restore mutation
  const restoreMutation = useMutation({
    mutationFn: restoreCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        type: 'success',
        title: 'Client Restored',
        description: 'The client has been successfully restored.',
      });
    },
  });

  const handleDelete = async () => {
    try {
      await Promise.allSettled(
        selectedRows.map((row) => deleteMutation.mutateAsync(row.id)),
      );
      setSelectedRows([]);
    } catch (error) {
      console.error('Delete error:', error);
    }
    setShowDeleteDialog(false);
  };

  const colDefs: ColDef<Customer>[] = [
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
      headerName: 'Full Name',
      valueGetter: (params) =>
        `${params.data?.firstName || ''} ${params.data?.lastName || ''}`,
      sortable: true,
      filter: 'agTextColumnFilter',
      width: 200,
    },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    {
      headerName: 'Document',
      valueGetter: (params) =>
        `${params.data?.documentId || ''} (${params.data?.documentType || ''})`,
      width: 200,
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 120,
      valueFormatter: (p: any) => `${p.value ?? 0} ⭐`,
    },
  ];

  const totalPages = data?.totalPages || 1;

  return (
    <div className="ag-theme-alpine-dark  rounded-lg shadow-lg h-full flex flex-col">
      {/* Header with Add Client */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Clients Grid</h2>
      </div>
      <div className="flex  space-x-4 items-center mb-4">
        <p>Manage your clients below:</p>
      </div>

      {/* Grid */}
      {isLoading || isFetching ? (
        <p className="text-center">Loading clients...</p>
      ) : (
        <AgGridReact
          rowData={data?.data || []}
          columnDefs={colDefs}
          rowHeight={50}
          rowSelection="multiple"
          pagination={false}
          onSelectionChanged={(event) =>
            setSelectedRows(event.api.getSelectedRows())
          }
        />
      )}

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="flex gap-2 mt-4">
          {selectedRows.length === 1 && (
            <Button
              variant="outline"
              //   onClick={() =>
              //     router.navigate({
              //       to: '/clients/$id',
              //       params: { id: selectedRows[0].id },
              //     })
              //   }
            >
              <Eye size={18} /> View
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowDeleteDialog(true)}>
            <Trash size={18} /> Delete ({selectedRows.length})
          </Button>
          {selectedRows.some((c) => c.isDeleted) && (
            <Button
              variant="secondary"
              onClick={() =>
                Promise.allSettled(
                  selectedRows.map((row) =>
                    restoreMutation.mutateAsync(row.id),
                  ),
                )
              }
            >
              <RotateCcw size={18} /> Restore
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Client(s)"
        description={`Are you sure you want to delete ${selectedRows.length} client(s)?`}
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />
    </div>
  );
}

import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
  TextFilterModule,
} from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { getCars } from '@/api/cars';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hammer, ShoppingCart, Trash } from '@phosphor-icons/react';
import { Separator } from '@radix-ui/react-separator';
import { ConfirmationDialog } from '../confirmation-dialog';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
]);

export const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cars'],
    queryFn: getCars,
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
    console.log('Deleting selected rows:', selectedRows);

    setSelectedRows([]); // Clear selection after deletion
  };

  const currencyFormatter = (params: any) => {
    return params.value ? `${params.value.toLocaleString()} DHS` : '';
  };

  const colDefs: ColDef[] = [
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
      field: 'pricePerDay',
      headerName: 'Price/Day',
      width: 120,
      filter: 'agNumberColumnFilter',
      sortable: true,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
    },
    {
      field: 'purchasePrice',
      headerName: 'Purchase Price',
      width: 150,
      cellStyle: { textAlign: 'right' },
      valueFormatter: currencyFormatter,
    },
    {
      headerName: 'Availability',
      field: 'isAvailable',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: {
        values: ['Available', 'Not Available'], // Explicitly define filter options
      },
      cellStyle: { textAlign: 'right' },
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 300,
      cellStyle: { textAlign: 'center', justifyContent: 'center' },
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="flex items-center gap-2 hover:bg-gray-4"
            onClick={() => alert(`Renting car: ${params.data.model}`)}
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
            onClick={handleDelete}
          >
            <Trash size={20} /> Delete ({selectedRows.length})
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-white text-center">Loading cars...</p>
      ) : (
        <div style={gridStyle}>
          <AgGridReact
            rowHeight={50}
            rowData={data || []}
            columnDefs={colDefs}
            rowSelection={rowSelection}
            pagination={true}
            paginationPageSize={10}
            domLayout="autoHeight"
            onSelectionChanged={(event) =>
              setSelectedRows(event.api.getSelectedRows())
            }
          />
        </div>
      )}
    </div>
  );
};

import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { useTheme } from '../../theme/theme-provider';

interface CarDataGridProps<T> {
  rowData: T[];
  columnDefs: any[];
  pageSize?: number;
}

export default function CarDataGrid<T>({
  rowData,
  columnDefs,
  pageSize = 10,
}: CarDataGridProps<T>) {
  const { theme } = useTheme(); // ✅ from your provider

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    [],
  );

  return (
    <div
      className={`${
        theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'
      } rounded-lg border border-border`}
      style={{ width: '100%', height: '500px' }}
    >
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={pageSize}
        rowSelection="multiple"
      />
    </div>
  );
}

'use client';

import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { useTheme } from '../../theme/theme-provider';
import type { AgGridReactProps } from 'ag-grid-react';

// ✅ Extend AG Grid props so we can pass domLayout, onGridReady, etc.
interface CarDataGridProps<T> extends AgGridReactProps<T> {
  rowData: T[];
  columnDefs: any[];
  pageSize?: number;
  autoHeight?: boolean; // ✅ custom flag to toggle autoHeight
}

export default function CarDataGrid<T>({
  rowData,
  columnDefs,
  pageSize = 10,
  autoHeight = true, // ✅ default to autoHeight
  ...rest
}: CarDataGridProps<T>) {
  const { theme } = useTheme();

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
      style={{
        width: '100%',
        // ✅ only set fixed height if NOT autoHeight
        height: autoHeight ? 'auto' : '500px',
      }}
    >
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={pageSize}
        rowSelection="multiple"
        domLayout={autoHeight ? 'autoHeight' : 'normal'} // ✅ key fix
        {...rest} // ✅ forward any extra AG Grid props
      />
    </div>
  );
}

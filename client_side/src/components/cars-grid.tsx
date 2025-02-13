import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
} from 'ag-grid-community';
import { useState } from 'react';

ModuleRegistry.registerModules([
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
]);

export const GridExample = () => {
  // Row Data: The data to be displayed.
  const [rowData, setRowData] = useState([
    { make: 'Tesla', model: 'Model Y', price: 64950, electric: true },
    { make: 'Ford', model: 'F-Series', price: 33850, electric: false },
    { make: 'Toyota', model: 'Corolla', price: 29600, electric: false },
  ]);

  // Column Definitions: Defines the columns to be displayed.
  const [colDefs, setColDefs] = useState<ColDef[]>([
    { field: 'make', width: 300 },
    { field: 'model', width: 300 },
    { field: 'price', width: 300 },
    { field: 'electric', width: 300 },
  ]);

  return (
    <div
      // define a height because the Data Grid will fill the size of the parent container
      className="h-[500px]"
    >
      <AgGridReact rowData={rowData} columnDefs={colDefs} />
    </div>
  );
};

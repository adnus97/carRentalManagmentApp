import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';

export interface MaintenanceLogRow {
  id: string;
  description: string;
  cost: number;
  date: string;
}

export default function CarMaintenanceLogsGrid({
  logs,
  theme,
}: {
  logs: MaintenanceLogRow[];
  theme: 'light' | 'dark';
}) {
  const columnDefs = [
    { headerName: 'Description', field: 'description' },
    { headerName: 'Cost', field: 'cost' },
    {
      headerName: 'Date',
      field: 'date',
      valueFormatter: (p: { value: string | number | Date }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
  ];

  return (
    <CarDataGrid<MaintenanceLogRow> rowData={logs} columnDefs={columnDefs} />
  );
}

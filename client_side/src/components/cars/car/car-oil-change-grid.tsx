import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';

export interface OilChangeRow {
  id: string;
  changedAt: string;
  mileage: number;
  notes?: string;
}

export default function CarOilChangesGrid({
  oilChanges,
  theme,
}: {
  oilChanges: OilChangeRow[];
  theme: 'light' | 'dark';
}) {
  const columnDefs = [
    {
      headerName: 'Date',
      field: 'changedAt',
      valueFormatter: (p: { value: string | number | Date }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
    { headerName: 'Mileage', field: 'mileage' },
    { headerName: 'Notes', field: 'notes' },
  ];

  return (
    <CarDataGrid<OilChangeRow> rowData={oilChanges} columnDefs={columnDefs} />
  );
}

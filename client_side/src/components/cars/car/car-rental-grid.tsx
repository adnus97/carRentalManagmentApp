import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';

export interface RentalRow {
  id: string;
  customerName: string;
  startDate: string;
  returnedAt?: string | null;
  status: string;
  totalPaid: number;
}

export default function CarRentalsGrid({
  rentalHistory,
  theme,
}: {
  rentalHistory: RentalRow[];
  theme: 'light' | 'dark';
}) {
  const columnDefs = [
    { headerName: 'Customer', field: 'customerName' },
    {
      headerName: 'Start Date',
      field: 'startDate',
      valueFormatter: (p: { value: string | number | Date }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
    {
      headerName: 'End Date',
      field: 'returnedAt',
      valueFormatter: (p: { value: string | number | Date }) =>
        p.value ? format(new Date(p.value), 'dd/MM/yyyy') : 'Ongoing',
    },
    { headerName: 'Status', field: 'status' },
    { headerName: 'Paid', field: 'totalPaid' },
  ];

  return (
    <CarDataGrid<RentalRow> rowData={rentalHistory} columnDefs={columnDefs} />
  );
}

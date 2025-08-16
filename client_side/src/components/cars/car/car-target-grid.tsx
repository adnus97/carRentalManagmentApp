import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';

export interface TargetRow {
  id: string;
  startDate: string;
  endDate: string;
  targetRents: number;
  revenueGoal: number;
  actualRents: number;
  actualRevenue: number;
}

export default function CarTargetsGrid({
  targets,
  theme,
}: {
  targets: TargetRow[];
  theme: 'light' | 'dark';
}) {
  const columnDefs = [
    {
      headerName: 'Start Date',
      field: 'startDate',
      valueFormatter: (p: { value: string | number | Date }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      valueFormatter: (p: { value: string | number | Date }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
    { headerName: 'Target Rents', field: 'targetRents' },
    { headerName: 'Revenue Goal', field: 'revenueGoal' },
    { headerName: 'Actual Rents', field: 'actualRents' },
    { headerName: 'Actual Revenue', field: 'actualRevenue' },
  ];

  return <CarDataGrid<TargetRow> rowData={targets} columnDefs={columnDefs} />;
}

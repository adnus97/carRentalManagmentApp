import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';

interface RentalHistoryItem {
  startDate: string;
  totalPaid: number;
}

export default function CarRevenueChart({
  rentalHistory,
}: {
  rentalHistory: RentalHistoryItem[];
}) {
  const data = rentalHistory.map((r) => ({
    date: format(new Date(r.startDate), 'MMM dd'),
    revenue: r.totalPaid,
  }));

  return (
    <div className="bg-card rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#4ade80"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

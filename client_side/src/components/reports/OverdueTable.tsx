export function OverdueTable({ overdue }: { overdue: any[] }) {
  if (!overdue.length) return <div>No overdue rentals</div>;

  return (
    <div className="border rounded-md">
      <div className="p-2 font-bold">Overdue Rentals</div>
      {overdue.map((r) => (
        <div key={r.id} className="flex justify-between p-2 border-t text-sm">
          <span>Contract #{r.id}</span>
          <span>
            {r.expectedEndDate
              ? new Date(r.expectedEndDate).toLocaleDateString()
              : 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
}

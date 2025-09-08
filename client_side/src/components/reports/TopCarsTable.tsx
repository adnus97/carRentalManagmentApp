export function TopCarsTable({ cars }: { cars: any[] }) {
  if (!cars.length) return <div className="p-2 text-sm">No top cars data</div>;

  return (
    <div>
      {cars.map((c) => (
        <div
          key={c.carId}
          className="flex justify-between p-2 border-b last:border-b-0 text-sm"
        >
          <span>
            {c.plateNumber ? `${c.plateNumber} • ` : ''}
            {c.make} {c.model}
          </span>
          <span>
            {Number(c.revenue).toLocaleString()} MAD ({Number(c.rents)})
          </span>
        </div>
      ))}
    </div>
  );
}

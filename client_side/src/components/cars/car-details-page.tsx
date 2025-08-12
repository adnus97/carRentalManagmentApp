import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCarDetails,
  addMaintenanceLog,
  addOilChange,
  addMonthlyTarget,
} from '@/api/cars';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { successToast, errorToast } from '@/components/ui/toast';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';

export default function CarDetailsPage({ carId }: { carId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carDetails', carId],
    queryFn: () => getCarDetails(carId),
  });

  const maintenanceMutation = useMutation({
    mutationFn: (payload: any) => addMaintenanceLog(carId, payload),
    onSuccess: () => {
      successToast('Maintenance log added');
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
    },
    onError: (err: any) => {
      errorToast(
        err?.response?.data?.message || 'Failed to add maintenance log',
      );
    },
  });

  const oilChangeMutation = useMutation({
    mutationFn: (payload: any) => addOilChange(carId, payload),
    onSuccess: () => {
      successToast('Oil change recorded');
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to record oil change');
    },
  });

  const targetMutation = useMutation({
    mutationFn: (payload: any) => addMonthlyTarget(carId, payload),
    onSuccess: () => {
      successToast('Monthly target created');
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to create target');
    },
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    description: '',
    cost: 0,
    date: '',
  });
  const [oilForm, setOilForm] = useState({
    changedAt: '',
    mileage: 0,
    notes: '',
  });
  const [targetForm, setTargetForm] = useState({
    startDate: '',
    endDate: '',
    targetRents: 0,
    revenueGoal: 0,
  });

  if (isLoading) return <p>Loading...</p>;
  if (isError || !data) return <p>Error loading car details.</p>;

  const {
    car,
    rentalHistory,
    maintenanceLogs,
    oilChanges,
    targets,
    financialStats,
  } = data;

  const revenueData = rentalHistory.map((r) => ({
    date: format(new Date(r.startDate), 'MMM yyyy'),
    revenue: r.totalPaid,
  }));

  const rentalCountData = targets.map((t) => ({
    month: format(new Date(t.startDate), 'MMM yyyy'),
    actualRents: t.actualRents,
    targetRents: t.targetRents,
  }));

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>
            {car.make} {car.model} ({car.year})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Status: {car.status}</p>
          <p>Price/Day: {car.pricePerDay} DHS</p>
          <p>Mileage: {car.mileage} km</p>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#4ade80" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rentals vs Target</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rentalCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actualRents" fill="#60a5fa" />
                <Bar dataKey="targetRents" fill="#facc15" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rentals">
        <TabsList>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="oil">Oil Changes</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
        </TabsList>

        {/* Rentals */}
        <TabsContent value="rentals">
          {rentalHistory.length === 0 ? (
            <p>No rentals found.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {rentalHistory.map((r) => (
                  <tr key={r.id}>
                    <td>{r.customerName}</td>
                    <td>{format(new Date(r.startDate), 'dd/MM/yyyy')}</td>
                    <td>
                      {r.returnedAt
                        ? format(new Date(r.returnedAt), 'dd/MM/yyyy')
                        : 'Ongoing'}
                    </td>
                    <td>{r.status}</td>
                    <td>{r.totalPaid} DHS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              maintenanceMutation.mutate({
                ...maintenanceForm,
                date: new Date(maintenanceForm.date),
              });
            }}
            className="flex gap-2 mb-4"
          >
            <Input
              placeholder="Description"
              value={maintenanceForm.description}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  description: e.target.value,
                })
              }
            />
            <Input
              type="number"
              placeholder="Cost"
              value={maintenanceForm.cost}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  cost: Number(e.target.value),
                })
              }
            />
            <Input
              type="date"
              value={maintenanceForm.date}
              onChange={(e) =>
                setMaintenanceForm({ ...maintenanceForm, date: e.target.value })
              }
            />
            <Button type="submit">Add</Button>
          </form>
          {maintenanceLogs.length === 0 ? (
            <p>No maintenance logs.</p>
          ) : (
            <ul>
              {maintenanceLogs.map((m) => (
                <li key={m.id}>
                  {m.description} -{' '}
                  {format(new Date(m.createdAt), 'dd/MM/yyyy')}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Oil Changes */}
        <TabsContent value="oil">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              oilChangeMutation.mutate({
                ...oilForm,
                changedAt: new Date(oilForm.changedAt),
              });
            }}
            className="flex gap-2 mb-4"
          >
            <Input
              type="date"
              value={oilForm.changedAt}
              onChange={(e) =>
                setOilForm({ ...oilForm, changedAt: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Mileage"
              value={oilForm.mileage}
              onChange={(e) =>
                setOilForm({ ...oilForm, mileage: Number(e.target.value) })
              }
            />
            <Input
              placeholder="Notes"
              value={oilForm.notes}
              onChange={(e) =>
                setOilForm({ ...oilForm, notes: e.target.value })
              }
            />
            <Button type="submit">Add</Button>
          </form>
          {oilChanges.length === 0 ? (
            <p>No oil changes recorded.</p>
          ) : (
            <ul>
              {oilChanges.map((o) => (
                <li key={o.id}>
                  {format(new Date(o.changedAt), 'dd/MM/yyyy')} -{' '}
                  {o.notes || 'No notes'}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Targets */}
        <TabsContent value="targets">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              targetMutation.mutate({
                ...targetForm,
                startDate: new Date(targetForm.startDate),
                endDate: new Date(targetForm.endDate),
              });
            }}
            className="flex gap-2 mb-4"
          >
            <Input
              type="date"
              value={targetForm.startDate}
              onChange={(e) =>
                setTargetForm({ ...targetForm, startDate: e.target.value })
              }
            />
            <Input
              type="date"
              value={targetForm.endDate}
              onChange={(e) =>
                setTargetForm({ ...targetForm, endDate: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Target Rents"
              value={targetForm.targetRents}
              onChange={(e) =>
                setTargetForm({
                  ...targetForm,
                  targetRents: Number(e.target.value),
                })
              }
            />
            <Input
              type="number"
              placeholder="Revenue Goal"
              value={targetForm.revenueGoal}
              onChange={(e) =>
                setTargetForm({
                  ...targetForm,
                  revenueGoal: Number(e.target.value),
                })
              }
            />
            <Button type="submit">Add</Button>
          </form>
          {targets.length === 0 ? (
            <p>No targets set.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Target Rents</th>
                  <th>Revenue Goal</th>
                  <th>Actual Rents</th>
                  <th>Actual Revenue</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.id}>
                    <td>{format(new Date(t.startDate), 'dd/MM/yyyy')}</td>
                    <td>{format(new Date(t.endDate), 'dd/MM/yyyy')}</td>
                    <td>{t.targetRents}</td>
                    <td>{t.revenueGoal} DHS</td>
                    <td>{t.actualRents}</td>
                    <td>{t.actualRevenue} DHS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

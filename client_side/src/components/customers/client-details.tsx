'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getCustomerById,
  getCustomerRatings,
  getBlacklist,
  Customer,
} from '@/api/customers';
import { getRentsByCustomer } from '@/api/customers';
import { useLayoutContext } from '@/contexts/layout-context';
import { useNavigationContext } from '@/contexts/navigation-context';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trash, Hammer, IdCard, Mail } from 'lucide-react';
import {
  Calendar,
  CheckCircle,
  Phone,
  Prohibit,
  ProhibitInset,
  User,
} from '@phosphor-icons/react';

import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { toast } from '@/components/ui/toast';

import { RateCustomerDialog } from '@/components/customers/rate-customer-dialog';
import { EditClientDialog } from '@/components/customers/edit-client-form';
import { ClientRentalsGrid } from './client-rental-grid';
import { ClientSpendingChart } from './client-spending-chart';
import { format } from 'date-fns';

export function ClientDetailsPage({ customerId }: { customerId: string }) {
  const { headerHeight } = useLayoutContext();
  const { setEntity } = useNavigationContext();
  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  // incremental show counts
  const [ratingsToShow, setRatingsToShow] = useState(3);
  const [blacklistToShow, setBlacklistToShow] = useState(3);

  // ✅ Fetch customer
  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery<Customer>({
    queryKey: ['customerDetails', customerId],
    queryFn: () => getCustomerById(customerId),
  });

  // ✅ Fetch ratings (all, then slice client-side)
  const { data: ratings } = useQuery({
    queryKey: ['customerRatings', customerId],
    queryFn: () => getCustomerRatings(customerId, 1, 100), // fetch up to 100
  });

  // ✅ Fetch blacklist history
  const { data: blacklist } = useQuery({
    queryKey: ['blacklistHistory', customerId],
    queryFn: () => getBlacklist(1, 100),
  });

  // ✅ Fetch rentals for chart
  const { data: rents } = useQuery({
    queryKey: ['customerRentsForChart', customerId],
    queryFn: () => getRentsByCustomer(customerId, 1, 100),
  });

  // ✅ Spending history (use actual rent start date for X-axis)
  const spendingHistory =
    rents?.data?.map((r: any) => ({
      startDate: r.startDate, // actual rent start date
      endDate: r.returnedAt || r.expectedEndDate || r.startDate,
      totalPaid: r.totalPaid || 0, // spending = what client paid
    })) || [];

  // ✅ Compute ratings summary from ratings query
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (ratings?.data?.length) {
      const total = ratings.data.length;
      const avg =
        ratings.data.reduce((sum: number, r: any) => sum + r.rating, 0) / total;
      setAverageRating(avg);
      setTotalReviews(total);
    } else {
      setAverageRating(0);
      setTotalReviews(0);
    }
  }, [ratings]);

  useEffect(() => {
    if (customer) {
      setEntity(
        `${customer.firstName} ${customer.lastName}`,
        `/customerDetails/${customerId}`,
      );
    }
    return () => setEntity(null);
  }, [customer, customerId, setEntity]);

  if (isLoading) return <p className="text-center">Loading client...</p>;
  if (isError || !customer)
    return <p className="text-center text-red-500">Error loading client.</p>;

  // ✅ Status badge
  const getStatusBadge = () => {
    if (customer.isBlacklisted) {
      return <Badge variant="fail">Blacklisted</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 space-y-8">
      {/* Sticky Action Bar */}
      <div
        className="z-40 bg-background py-4 flex flex-wrap gap-2 items-center justify-between top-0 border-b border-border"
        style={{ top: headerHeight }}
      >
        <Button
          variant="outline"
          onClick={() => router.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Hammer size={16} /> Edit
          </Button>

          {customer.isBlacklisted ? (
            <Button
              variant="outline"
              onClick={() => {
                toast({
                  type: 'info',
                  title: 'Unblacklist',
                  description: 'TODO: call unblacklist API',
                });
              }}
            >
              <ProhibitInset size={16} /> Unblacklist
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                toast({
                  type: 'info',
                  title: 'Blacklist',
                  description: 'TODO: call blacklist API',
                });
              }}
            >
              <Prohibit size={16} /> Blacklist
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash size={16} /> Delete
          </Button>
        </div>
      </div>

      {/* ✅ Overview + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Client Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 border-b pb-4 mb-4">
            <User className="w-6 h-6 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold">{customer?.firstName}</h2>
              <p className="text-sm text-muted-foreground">Client Overview</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
            {/* Email */}
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium break-all !text-[12px] ">
                  {customer?.email}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{customer?.phone}</p>
              </div>
            </div>

            {/* Document */}
            <div className="flex items-start gap-2">
              <IdCard className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Document</p>
                <p className="font-medium">
                  {customer?.documentId} ({customer?.documentType})
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Status</p>
                {customer?.isBlacklisted ? (
                  <span
                    className="inline-block px-2 py-1 text-xs font-semibold rounded"
                    style={{ backgroundColor: '#EC6142', color: 'white' }}
                  >
                    Blacklisted
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Created */}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {customer?.createdAt
                    ? format(new Date(customer.createdAt), 'dd/MM/yyyy')
                    : '—'}
                </p>
              </div>
            </div>

            {/* Updated */}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="font-medium">
                  {customer?.updatedAt
                    ? format(new Date(customer.updatedAt), 'dd/MM/yyyy')
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Spending Chart */}
        <div className="lg:col-span-2 shadow-lg overflow-x-auto flex flex-col rounded-lg">
          <ClientSpendingChart rentalHistory={spendingHistory} />
        </div>
      </div>

      {/* ✅ Tabs Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="pt-4 sm:pt-6">
          <Tabs defaultValue="rentals" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="rentals">Rentals</TabsTrigger>
              <TabsTrigger value="ratings">Ratings</TabsTrigger>
              <TabsTrigger value="blacklist">Blacklist History</TabsTrigger>
            </TabsList>

            {/* Rentals */}
            <TabsContent value="rentals" className="space-y-6">
              <ClientRentalsGrid customerId={customerId} />
            </TabsContent>

            {/* Ratings */}
            <TabsContent value="ratings" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Ratings</h2>
                <Button onClick={() => setRateDialogOpen(true)}>
                  ⭐ Rate Customer
                </Button>
              </div>

              {/* Average */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-medium">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-yellow-400">
                  {'★'.repeat(Math.round(averageRating))}
                  {'☆'.repeat(5 - Math.round(averageRating))}
                </span>
                <span className="text-sm text-gray-500">
                  ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>

              {/* Ratings List with Show More / Show Less */}
              {ratings?.data?.length ? (
                <>
                  <ul className="space-y-3 transition-all duration-300">
                    {ratings.data.slice(0, ratingsToShow).map((r: any) => (
                      <li key={r.id} className="border rounded p-3 bg-gray-2 ">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">
                            {'★'.repeat(r.rating)}
                            {'☆'.repeat(5 - r.rating)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {r.comment}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {ratings.data.length > 3 && (
                    <div className="flex justify-center mt-2">
                      <span
                        onClick={() =>
                          setRatingsToShow(
                            ratingsToShow >= ratings.data.length
                              ? 3
                              : ratingsToShow + 3,
                          )
                        }
                        className="text-sm text-primary cursor-pointer hover:underline"
                      >
                        {ratingsToShow >= ratings.data.length
                          ? 'Show Less'
                          : 'Show More'}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No ratings yet.</p>
              )}
            </TabsContent>

            {/* Blacklist History */}
            <TabsContent value="blacklist" className="space-y-6">
              <h2 className="text-lg font-semibold">Blacklist History</h2>
              {(() => {
                const filtered =
                  blacklist?.data?.filter(
                    (b: any) => b.customerId === customerId,
                  ) || [];

                return filtered.length > 0 ? (
                  <>
                    <ul className="space-y-3 transition-all duration-300">
                      {filtered.slice(0, blacklistToShow).map((b: any) => (
                        <li key={b.id} className="border rounded p-3 bg-gray-2">
                          <p className="text-sm text-red-600">
                            Reason: {b.reason}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {filtered.length > 3 && (
                      <div className="flex justify-center mt-2">
                        <span
                          onClick={() =>
                            setBlacklistToShow(
                              blacklistToShow >= filtered.length
                                ? 3
                                : blacklistToShow + 3,
                            )
                          }
                          className="text-sm text-primary cursor-pointer hover:underline"
                        >
                          {blacklistToShow >= filtered.length
                            ? 'Show Less'
                            : 'Show More'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">No blacklist history.</p>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ✅ Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={async () => {
          toast({
            type: 'success',
            title: 'Deleted',
            description: 'Customer deleted successfully',
          });
          router.navigate({ to: '/clients' });
        }}
        title="Delete Customer"
        description={`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`}
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />

      {/* ✅ Edit Dialog */}
      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
      />

      {/* ✅ Rate Dialog */}
      <RateCustomerDialog
        open={rateDialogOpen}
        onOpenChange={setRateDialogOpen}
        customer={customer}
      />
    </div>
  );
}

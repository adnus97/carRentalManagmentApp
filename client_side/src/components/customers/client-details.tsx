'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getCustomerById,
  getCustomerRatings,
  getBlacklist,
  getCustomerWithFiles,
  CustomerWithFiles,
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
import {
  ArrowLeft,
  Trash,
  Hammer,
  IdCard,
  Mail,
  Eye,
  Download,
} from 'lucide-react';
import {
  Calendar,
  CheckCircle,
  Phone,
  Prohibit,
  ProhibitInset,
  User,
} from '@phosphor-icons/react';
import { getFileServeUrl, viewFile, downloadFile } from '@/api/files';

import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { toast } from '@/components/ui/toast';

import { RateCustomerDialog } from '@/components/customers/rate-customer-dialog';
import { EditClientDialog } from '@/components/customers/edit-client-form';
import { ClientRentalsGrid } from './client-rental-grid';
import { ClientSpendingChart } from './client-spending-chart';
import { format } from 'date-fns';
import { Separator } from '../../components/ui/separator';

type DocCardProps = {
  title: string;
  fileId: string;
  onDownload?: () => void;
  onView?: () => void;
};

function DocCard({ title, fileId, onDownload, onView }: DocCardProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-xl',
        'border border-gray-200 bg-white shadow-sm',
        'dark:border-gray-800 dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
        'transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
      ].join(' ')}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-semibold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            Uploaded
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-muted-foreground hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            title="Download"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Media area */}
      <button
        onClick={() => onView?.()}
        className="relative block w-full overflow-hidden"
        style={{ aspectRatio: '16 / 9' }}
        aria-label={`View ${title}`}
      >
        {!failed && (
          <img
            src={getFileServeUrl(fileId)}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setFailed(true)}
          />
        )}

        {/* Fallback only when image failed */}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 dark:from-slate-900 dark:to-slate-950">
            <div className="text-center">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full border border-dashed border-slate-400/40 p-3">
                <svg
                  viewBox="0 0 24 24"
                  className="h-full w-full opacity-70"
                  fill="none"
                >
                  <path
                    d="M4 17V7a3 3 0 013-3h7l6 6v7a3 3 0 01-3 3H7a3 3 0 01-3-3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <p className="text-xs opacity-70">
                Preview not available. Click to view.
              </p>
            </div>
          </div>
        )}

        {/* Hover overlay + eye always */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/35" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={[
              'grid place-items-center rounded-full backdrop-blur',
              'bg-white/70 text-slate-800 shadow-lg ring-1 ring-black/5',
              'h-14 w-14 opacity-0 scale-90',
              'transition-all duration-300 group-hover:opacity-100 group-hover:scale-100',
              'dark:bg-white/15 dark:text-white dark:ring-white/10',
            ].join(' ')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

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
  } = useQuery<CustomerWithFiles>({
    queryKey: ['customerDetails', customerId],
    queryFn: () => getCustomerWithFiles(customerId),
    placeholderData: (previousData) => previousData,
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

  const handleViewDocument = (fileId?: string, title?: string) => {
    if (!fileId) {
      toast({
        type: 'error',
        title: 'Document not available',
        description: `${title || 'Document'} has not been uploaded yet.`,
      });
      return;
    }

    try {
      viewFile(fileId);
      toast({
        type: 'success',
        title: 'Opening document',
        description: `Opening ${title || 'document'}...`,
      });
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        type: 'error',
        title: 'Error loading file',
        description: `Could not load ${title || 'document'}. Please try again.`,
      });
    }
  };
  const handleDownloadDocument = (fileId?: string, title?: string) => {
    if (!fileId) {
      toast({
        type: 'error',
        title: 'Document not available',
        description: `${title || 'Document'} has not been uploaded yet.`,
      });
      return;
    }

    try {
      downloadFile(fileId, title);
      toast({
        type: 'success',
        title: 'Downloading...',
        description: `Downloading ${title || 'document'}...`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        type: 'error',
        title: 'Error downloading file',
        description: `Could not download ${title || 'document'}. Please try again.`,
      });
    }
  };
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
      {/* Sticky Action Bar - remains the same */}
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
        <Card
          className={[
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            // Light mode
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            // Dark mode (Insurance style)
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          {/* Dark-mode glow orbs */}
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />

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
          <div className="w-full flex justify-center">
            <Separator className="my-2 w-1/2" />
          </div>
          {/* ✅ Updated Document Images Section */}
          {(customer?.idCardFile || customer?.driversLicenseFile) && (
            <div className="col-span-full pt-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Document Images
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {customer?.idCardFile && (
                  <DocCard
                    title="ID Card"
                    fileId={customer.idCardFile.id}
                    onView={() => viewFile(customer.idCardFile!.id)}
                    onDownload={() =>
                      downloadFile(customer.idCardFile!.id, 'ID Card')
                    }
                  />
                )}
                {customer?.driversLicenseFile && (
                  <DocCard
                    title="Driver's License"
                    fileId={customer.driversLicenseFile.id}
                    onView={() => viewFile(customer.driversLicenseFile!.id)}
                    onDownload={() =>
                      downloadFile(
                        customer.driversLicenseFile!.id,
                        "Driver's License",
                      )
                    }
                  />
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Spending Chart */}
        <div className="lg:col-span-2 shadow-lg overflow-x-auto flex flex-col rounded-lg">
          <ClientSpendingChart rentalHistory={spendingHistory} />
        </div>
      </div>

      {/* Rest of the component remains the same... */}
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

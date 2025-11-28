'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerById,
  getCustomerRatings,
  getBlacklist,
  getCustomerWithFiles,
  CustomerWithFiles,
  unblacklistCustomer,
} from '@/api/customers';
import { getRentsByCustomer } from '@/api/customers';
import { useLayoutContext } from '@/contexts/layout-context';
import { useNavigationContext } from '@/contexts/navigation-context';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { getFileServeUrl, viewFile, downloadFile } from '@/api/files';

import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { toast } from '@/components/ui/toast';

import { RateCustomerDialog } from '@/components/customers/rate-customer-dialog';
import { EditClientDialog } from '@/components/customers/edit-client-form';
import { BlacklistDialog } from '@/components/customers/blacklist-dialog';
import { ClientRentalsGrid } from './client-rental-grid';
import { ClientSpendingChart } from './client-spending-chart';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

type DocCardProps = {
  title: string;
  fileId: string;
  onDownload?: () => void;
  onView?: () => void;
};

function DocCard({ title, fileId, onDownload, onView }: DocCardProps) {
  const [failed, setFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setImageLoaded(false);
  }, [fileId]);

  const imageUrl = getFileServeUrl(fileId);

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-xl',
        'border border-gray-200 bg-white shadow-sm',
        'dark:border-gray-800 dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
        'transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
      ].join(' ')}
    >
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

      <button
        onClick={() => onView?.()}
        className="relative block w-full overflow-hidden"
        style={{ aspectRatio: '16 / 9' }}
        aria-label={`View ${title}`}
      >
        {!failed && (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={title}
            className={[
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
              !imageLoaded ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.error(`Failed to load image for ${title}:`, imageUrl);
              setFailed(true);
            }}
            loading="eager"
          />
        )}

        {!failed && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950">
            <div className="text-center">
              <div className="mx-auto mb-2 h-12 w-12 animate-pulse rounded-full border border-dashed border-slate-400/40 p-3">
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
              <p className="text-xs opacity-70">Loading...</p>
            </div>
          </div>
        )}

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
  const { t } = useTranslation('client');
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [ratingsToShow, setRatingsToShow] = useState(3);
  const [blacklistToShow, setBlacklistToShow] = useState(3);

  const {
    data: customer,
    isLoading,
    isError,
    error,
  } = useQuery<CustomerWithFiles>({
    queryKey: ['customerDetails', customerId],
    queryFn: async () => {
      console.log('🚀 Fetching customer with files for ID:', customerId);

      const basicCustomer = await getCustomerById(customerId);
      console.log('📦 Basic customer data:', basicCustomer);

      let result = await getCustomerWithFiles(customerId);
      console.log('✅ API Response from /with-files:', result);

      if (!result.idCardFile && basicCustomer.idCardId) {
        console.log('🔧 Manually adding idCardFile');
        result.idCardFile = {
          id: basicCustomer.idCardId,
          name: 'ID Card',
          url: getFileServeUrl(basicCustomer.idCardId),
          type: 'image',
          size: 0,
        };
      }

      if (!result.driversLicenseFile && basicCustomer.driversLicenseId) {
        console.log('🔧 Manually adding driversLicenseFile');
        result.driversLicenseFile = {
          id: basicCustomer.driversLicenseId,
          name: 'Drivers License',
          url: getFileServeUrl(basicCustomer.driversLicenseId),
          type: 'image',
          size: 0,
        };
      }

      console.log('✅ Final result:', {
        hasIdCard: !!result.idCardFile,
        hasLicense: !!result.driversLicenseFile,
        idCardFile: result.idCardFile,
        driversLicenseFile: result.driversLicenseFile,
      });

      return result;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: ratings } = useQuery({
    queryKey: ['customerRatings', customerId],
    queryFn: () => getCustomerRatings(customerId, 1, 100),
  });

  const { data: blacklist } = useQuery({
    queryKey: ['blacklistHistory', customerId],
    queryFn: () => getBlacklist(1, 100),
  });

  const { data: rents } = useQuery({
    queryKey: ['customerRentsForChart', customerId],
    queryFn: () => getRentsByCustomer(customerId, 1, 100),
  });

  // ✅ Add unblacklist mutation
  const unblacklistMutation = useMutation({
    mutationFn: unblacklistCustomer,
    onSuccess: () => {
      // Invalidate both customer details and customers list
      queryClient.invalidateQueries({
        queryKey: ['customerDetails', customerId],
      });
      queryClient.invalidateQueries({ queryKey: ['customers'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['blacklistHistory'] });

      toast({
        type: 'success',
        title: t('clients.success', 'Success!'),
        description: t(
          'clients.unblacklisted',
          'Customer unblacklisted successfully.',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: t('clients.error', 'Error'),
        description:
          error?.message ||
          t('clients.unblacklist_failed', 'Failed to unblacklist customer'),
      });
    },
  });

  const spendingHistory =
    rents?.data?.map((r: any) => ({
      startDate: r.startDate,
      endDate: r.returnedAt || r.expectedEndDate || r.startDate,
      totalPaid: r.totalPaid || 0,
    })) || [];

  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (isError) {
      console.error('❌ Query error:', error);
    }
  }, [isError, error]);

  useEffect(() => {
    if (customer) {
      console.log('🔍 Customer data loaded:', {
        firstName: customer.firstName,
        lastName: customer.lastName,
        hasIdCard: !!customer.idCardFile,
        hasDriversLicense: !!customer.driversLicenseFile,
        idCardData: customer.idCardFile,
        driversLicenseData: customer.driversLicenseFile,
      });

      console.log(
        '🖼️ About to render docs. IdCard:',
        customer?.idCardFile,
        'License:',
        customer?.driversLicenseFile,
      );
    }
  }, [customer]);

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

  if (isLoading)
    return (
      <p className="text-center">
        {t('client_details.loading', 'Loading client...')}
      </p>
    );
  if (isError || !customer)
    return (
      <p className="text-center text-red-500">
        {t('client_details.error', 'Error loading client.')}
      </p>
    );

  return (
    <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 space-y-8">
      <div
        className="z-40 bg-background py-4 flex flex-wrap gap-2 items-center justify-between top-0 border-b border-border"
        style={{ top: headerHeight }}
      >
        <Button
          variant="outline"
          onClick={() => router.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> {t('client_details.back', 'Back')}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Hammer size={16} /> {t('client_details.edit', 'Edit')}
          </Button>

          {/* ✅ Updated Blacklist/Unblacklist buttons */}
          {customer.isBlacklisted ? (
            <Button
              variant="outline"
              onClick={() => unblacklistMutation.mutate(customer.id)}
              disabled={unblacklistMutation.isPending}
              className="flex items-center gap-2 border-green-200 hover:border-green-300 hover:bg-accent-6 text-green-700"
            >
              <ProhibitInset size={16} />
              {unblacklistMutation.isPending
                ? t('clients.actions.unblacklisting', 'Unblacklisting...')
                : t('client_details.unblacklist', 'Unblacklist')}
            </Button>
          ) : (
            <BlacklistDialog customerId={customer.id} />
          )}

          <Button
            variant="secondary"
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash size={16} /> {t('client_details.delete', 'Delete')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <Card
          className={[
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />

          <div className="flex items-center gap-3 border-b pb-4 mb-4">
            <User className="w-6 h-6 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold">{customer?.firstName}</h2>
              <p className="text-sm text-muted-foreground">
                {t('client_details.overview', 'Client Overview')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">
                  {t('form.labels.email', 'Email')}
                </p>
                <p className="font-medium break-all !text-[12px]">
                  {customer?.email}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">
                  {t('form.labels.phone', 'Phone')}
                </p>
                <p className="font-medium">{customer?.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <IdCard className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">
                  {t('client_details.document', 'Document')}
                </p>
                <p className="font-medium">
                  {customer?.documentId} ({customer?.documentType})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">
                  {t('client_details.status.label', 'Status')}
                </p>
                {customer?.isBlacklisted ? (
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                    {t('client_details.status.blacklisted', 'Blacklisted')}
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {t('client_details.status.active', 'Active')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">
                  {t('client_details.created', 'Created')}
                </p>
                <p className="font-medium">
                  {customer?.createdAt
                    ? format(new Date(customer.createdAt), 'dd/MM/yyyy')
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">
                  {t('client_details.updated', 'Updated')}
                </p>
                <p className="font-medium">
                  {customer?.updatedAt
                    ? format(new Date(customer.updatedAt), 'dd/MM/yyyy')
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              {t('form.sections.docs', 'Document Images')}
            </h4>

            {!customer?.idCardFile && !customer?.driversLicenseFile ? (
              <p className="text-sm text-muted-foreground italic">
                {t('client_details.no_documents', 'No documents uploaded yet.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {customer?.idCardFile && (
                  <DocCard
                    key={`id-${customer.idCardFile.id}`}
                    title={t('form.uploads.id_card', 'ID Card Image')}
                    fileId={customer.idCardFile.id}
                    onView={() => viewFile(customer.idCardFile!.id)}
                    onDownload={() =>
                      downloadFile(
                        customer.idCardFile!.id,
                        t('form.uploads.id_card', 'ID Card Image'),
                      )
                    }
                  />
                )}
                {customer?.driversLicenseFile && (
                  <DocCard
                    key={`license-${customer.driversLicenseFile.id}`}
                    title={t(
                      'form.uploads.driver_license',
                      "Driver's License Image",
                    )}
                    fileId={customer.driversLicenseFile.id}
                    onView={() => viewFile(customer.driversLicenseFile!.id)}
                    onDownload={() =>
                      downloadFile(
                        customer.driversLicenseFile!.id,
                        t(
                          'form.uploads.driver_license',
                          "Driver's License Image",
                        ),
                      )
                    }
                  />
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2 shadow-lg overflow-x-auto flex flex-col rounded-lg">
          <ClientSpendingChart rentalHistory={spendingHistory} />
        </div>
      </div>

      {/* Tabs Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="pt-4 sm:pt-6">
          <Tabs defaultValue="rentals" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="rentals">
                {t('client_details.tabs.rentals', 'Rentals')}
              </TabsTrigger>
              <TabsTrigger value="ratings">
                {t('client_details.tabs.ratings', 'Ratings')}
              </TabsTrigger>
              <TabsTrigger value="blacklist">
                {t('client_details.tabs.blacklist', 'Blacklist History')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rentals" className="space-y-6">
              <ClientRentalsGrid customerId={customerId} />
            </TabsContent>

            <TabsContent value="ratings" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {t('client_details.tabs.ratings', 'Ratings')}
                </h2>
                <Button onClick={() => setRateDialogOpen(true)}>
                  ⭐ {t('client_details.rate_customer', 'Rate Customer')}
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-medium">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-yellow-400">
                  {'★'.repeat(Math.round(averageRating))}
                  {'☆'.repeat(5 - Math.round(averageRating))}
                </span>
                <span className="text-sm text-gray-500">
                  ({totalReviews}{' '}
                  {totalReviews === 1
                    ? t('client_details.reviews.one', 'review')
                    : t('client_details.reviews.many', 'reviews')}
                  )
                </span>
              </div>

              {ratings?.data?.length ? (
                <>
                  <ul className="space-y-3 transition-all duration-300">
                    {ratings.data.slice(0, ratingsToShow).map((r: any) => (
                      <li key={r.id} className="border rounded p-3 bg-gray-2">
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
                          ? t('client_details.show_less', 'Show Less')
                          : t('client_details.show_more', 'Show More')}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">
                  {t('client_details.no_ratings', 'No ratings yet.')}
                </p>
              )}
            </TabsContent>

            <TabsContent value="blacklist" className="space-y-6">
              <h2 className="text-lg font-semibold">
                {t('client_details.tabs.blacklist', 'Blacklist History')}
              </h2>
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
                            {t('blacklist.labels.reason', 'Blacklist Reason')}:{' '}
                            {b.reason}
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
                            ? t('client_details.show_less', 'Show Less')
                            : t('client_details.show_more', 'Show More')}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">
                    {t('client_details.no_blacklist', 'No blacklist history.')}
                  </p>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={async () => {
          toast({
            type: 'success',
            title: t('client_details.deleted', 'Deleted'),
            description: t(
              'client_details.deleted_desc',
              'Customer deleted successfully',
            ),
          });
          router.navigate({ to: '/clients' });
        }}
        title={t('client_details.delete_title', 'Delete Customer')}
        description={t(
          'client_details.delete_desc',
          'Are you sure you want to delete {{name}}?',
          { name: `${customer.firstName} ${customer.lastName}` },
        )}
        confirmText={t('client_details.delete', 'Delete')}
        cancelText={t('client_details.cancel', 'Cancel')}
        loadingText={t('client_details.deleting', 'Deleting...')}
        variant="destructive"
      />

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
      />

      <RateCustomerDialog
        open={rateDialogOpen}
        onOpenChange={setRateDialogOpen}
        customer={customer}
      />
    </div>
  );
}

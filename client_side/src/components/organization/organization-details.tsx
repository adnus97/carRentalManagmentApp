'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { UpdateOrganizationForm } from './update-organization-form';
import { getOrganizationByUser } from '@/api/organization';
import { getFileServeUrl, viewFile, downloadFile } from '@/api/files';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Image as ImageIcon,
  CalendarClock,
  Building2,
  AlertCircle,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

type DocType = 'pdf' | 'image';

interface OrganizationDocument {
  label: string;
  fileId?: string;
  type: DocType;
}

const ImageFallback = ({ name }: { name: string }) => (
  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
    {name?.charAt(0).toUpperCase() || '?'}
  </div>
);

export function OrganizationDetails() {
  const { t } = useTranslation('organization');
  const [editMode, setEditMode] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organization', 'user'],
    queryFn: getOrganizationByUser,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-14">
        <Card className="p-6 sm:p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-14">
        <Card className="p-6 sm:p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('org.empty_title', 'No Organization Found')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('org.empty_desc', "You haven't created an organization yet.")}
          </p>
        </Card>
      </div>
    );
  }

  const organization = data[0];

  const documents: OrganizationDocument[] = [
    {
      label: t('org.docs.rc', 'RC (Registre de Commerce)'),
      fileId: organization?.rcFileId,
      type: 'pdf',
    },
    {
      label: t('org.docs.status', 'Status'),
      fileId: organization?.statusFileId,
      type: 'pdf',
    },
    {
      label: t('org.docs.decision', 'Decision'),
      fileId: organization?.decisionFileId,
      type: 'pdf',
    },
    {
      label: t('org.docs.ceo_id', 'CEO ID Card'),
      fileId: organization?.ceoIdCardFileId,
      type: 'image',
    },
    {
      label: t('org.docs.fleet', 'Fleet List'),
      fileId: organization?.fleetListFileId,
      type: 'pdf',
    },
    {
      label: t('org.docs.model_g', 'Model G'),
      fileId: organization?.modelGFileId,
      type: 'pdf',
    },
    {
      label: t('org.docs.tax_id', 'Identifiant Fiscale'),
      fileId: organization?.identifiantFiscaleFileId,
      type: 'pdf',
    },
    {
      label: t('org.docs.bilan', 'Bilan'),
      fileId: organization?.bilanFileId,
      type: 'pdf',
    },
  ];

  const handleView = (fileId?: string, label?: string) => {
    if (!fileId) {
      toast({
        title: t(
          'client_details.doc.not_available_title',
          'Document not available',
        ),
        type: 'error',
        description: t(
          'client_details.doc.not_available_desc',
          '{{title}} has not been uploaded yet.',
          {
            title: label || t('org.document', 'Document'),
          },
        ),
      });
      return;
    }
    try {
      viewFile(fileId);
      toast({
        title: t('client_details.doc.opening_title', 'Opening document'),
        type: 'success',
        description: t(
          'client_details.doc.opening_desc',
          'Opening {{title}}...',
          {
            title: label || t('org.document', 'document'),
          },
        ),
      });
    } catch (error) {
      toast({
        title: t('client_details.doc.error_title', 'Error loading file'),
        type: 'error',
        description: t(
          'client_details.doc.error_desc',
          'Could not load {{title}}. Please try again.',
          {
            title: label || t('org.document', 'document'),
          },
        ),
      });
    }
  };

  const handleDownload = (fileId?: string, label?: string) => {
    if (!fileId) {
      toast({
        title: t(
          'client_details.doc.not_available_title',
          'Document not available',
        ),
        type: 'error',
        description: t(
          'client_details.doc.not_available_desc',
          '{{title}} has not been uploaded yet.',
          {
            title: label || t('org.document', 'Document'),
          },
        ),
      });
      return;
    }
    try {
      downloadFile(fileId, label);
      toast({
        title: t('client_details.doc.downloading_title', 'Downloading...'),
        type: 'success',
        description: t(
          'client_details.doc.downloading_desc',
          'Downloading {{title}}...',
          {
            title: label || t('org.document', 'document'),
          },
        ),
      });
    } catch (error) {
      toast({
        title: t(
          'client_details.doc.error_download_title',
          'Error downloading file',
        ),
        type: 'error',
        description: t(
          'client_details.doc.error_download_desc',
          'Could not download {{title}}. Please try again.',
          {
            title: label || t('org.document', 'document'),
          },
        ),
      });
    }
  };

  if (editMode) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <UpdateOrganizationForm
          organization={organization}
          onCancel={() => setEditMode(false)}
          onSuccess={() => setEditMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-border dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900 dark:text-gray-100 dark:shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:block" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 hidden h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:block" />

        <div className="relative p-4 sm:p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border bg-white overflow-hidden flex items-center justify-center dark:bg-gray-950">
                {organization?.imageFileId ? (
                  <img
                    src={getFileServeUrl(organization.imageFileId)}
                    alt={`${organization?.name || t('org.org', 'Organization')} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className =
                          'w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold';
                        fallback.textContent = (organization?.name || '?')
                          .charAt(0)
                          .toUpperCase();
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <ImageFallback name={organization?.name || ''} />
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight break-words">
                  {organization?.name || t('org.org', 'Organization')}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarClock className="w-4 h-4" />
                    <span>
                      {t('org.created', 'Created')}{' '}
                      {organization?.createdAt
                        ? new Date(organization.createdAt).toLocaleDateString()
                        : t('org.unknown', 'Unknown')}
                    </span>
                  </div>
                  {organization?.email && (
                    <span className="truncate">{organization.email}</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setEditMode(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <Edit className="w-4 h-4" />
              {t('org.edit_btn', 'Edit Organization')}
            </Button>
          </div>
        </div>
      </div>

      {/* Organization Info */}
      {(organization?.website ||
        organization?.phone ||
        organization?.address) && (
        <Card className="border-gray-200 dark:border-border">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('org.details.title', 'Organization Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {organization?.website && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t('org.details.website', 'Website')}
                  </label>
                  <p className="mt-1 break-words">
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {organization.website}
                    </a>
                  </p>
                </div>
              )}
              {organization?.phone && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t('org.details.phone', 'Phone')}
                  </label>
                  <p className="mt-1">{organization.phone}</p>
                </div>
              )}
              {organization?.address && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t('org.details.address', 'Address')}
                  </label>
                  <p className="mt-1 break-words">{organization.address}</p>
                </div>
              )}
            </div>
            {(organization?.rcNumber ||
              organization?.cnssNumber ||
              organization?.iceNumber) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t('org.details.rc', 'RC')}
                  </label>
                  <p className="mt-1 break-words">
                    {organization.rcNumber || '—'}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t('org.details.cnss', 'CNSS')}
                  </label>
                  <p className="mt-1 break-words">
                    {organization.cnssNumber || '—'}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t('org.details.ice', 'ICE')}
                  </label>
                  <p className="mt-1 break-words">
                    {organization.iceNumber || '—'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legal Documents */}
      <Card className="border-gray-200 dark:border-border">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">⚖️</span>{' '}
            {t('org.docs.title', 'Legal Documents')}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t(
              'org.docs.subtitle',
              'All organization documents consolidated here.',
            )}
          </p>
        </div>

        <CardContent className="pt-3 sm:pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 sm:p-4 hover:shadow-sm transition bg-gray-50/60 dark:bg-gray-900/40 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-medium text-sm">{doc.label}</h3>
                  <Badge variant={doc.fileId ? 'default' : 'secondary'}>
                    {doc.fileId
                      ? t('uploader.status.uploaded', 'Uploaded')
                      : t('org.docs.missing', 'Missing')}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  {doc.type === 'pdf' ? (
                    <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                  ) : (
                    <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {doc.type.toUpperCase()}{' '}
                    {t('org.docs.document', 'Document')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(doc.fileId, doc.label)}
                    disabled={!doc.fileId}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    {t('org.docs.view', 'View')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.fileId, doc.label)}
                    disabled={!doc.fileId}
                    aria-label={t('org.docs.download', 'Download')}
                    title={t('org.docs.download', 'Download')}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

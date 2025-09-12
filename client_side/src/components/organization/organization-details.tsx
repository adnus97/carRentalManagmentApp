'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { UpdateOrganizationForm } from './update-organization-form';
import { getOrganizationByUser, Organization } from '@/api/organization';
import {
  getFileServeUrl,
  getFileDownloadUrl,
  viewFile,
  downloadFile,
} from '@/api/files';
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
import { useUser } from '@/contexts/user-context';

type DocType = 'pdf' | 'image';

interface OrganizationDocument {
  label: string;
  fileId?: string;
  type: DocType;
}

// Fixed fallback component for broken images
const ImageFallback = ({ name }: { name: string }) => (
  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
    {name?.charAt(0).toUpperCase() || '?'}
  </div>
);

export function OrganizationDetails() {
  const [editMode, setEditMode] = useState(false);
  const { user } = useUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organization', 'user'],
    queryFn: getOrganizationByUser,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="p-10 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="p-10 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Organization Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You haven't created an organization yet.
          </p>
        </Card>
      </div>
    );
  }

  const organization = data[0];

  // All documents with their file IDs
  const documents: OrganizationDocument[] = [
    {
      label: 'RC (Registre de Commerce)',
      fileId: organization?.rcFileId,
      type: 'pdf',
    },
    {
      label: 'Status',
      fileId: organization?.statusFileId,
      type: 'pdf',
    },
    {
      label: 'Decision',
      fileId: organization?.decisionFileId,
      type: 'pdf',
    },
    {
      label: 'CEO ID Card',
      fileId: organization?.ceoIdCardFileId,
      type: 'image',
    },
    {
      label: 'Fleet List',
      fileId: organization?.fleetListFileId,
      type: 'pdf',
    },
    {
      label: 'Model G',
      fileId: organization?.modelGFileId,
      type: 'pdf',
    },
    {
      label: 'Identifiant Fiscale',
      fileId: organization?.identifiantFiscaleFileId,
      type: 'pdf',
    },
    {
      label: 'Bilan',
      fileId: organization?.bilanFileId,
      type: 'pdf',
    },
  ];

  const handleView = (fileId?: string, label?: string) => {
    if (!fileId) {
      toast({
        title: 'Document not available',
        type: 'error',
        description: `${label || 'Document'} has not been uploaded yet.`,
      });
      return;
    }

    try {
      viewFile(fileId);
      toast({
        title: 'Opening document',
        type: 'success',
        description: `Opening ${label || 'document'}...`,
      });
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: 'Error loading file',
        type: 'error',
        description: `Could not load ${label || 'document'}. Please try again.`,
      });
    }
  };

  const handleDownload = (fileId?: string, label?: string) => {
    if (!fileId) {
      toast({
        title: 'Document not available',
        type: 'error',
        description: `${label || 'Document'} has not been uploaded yet.`,
      });
      return;
    }

    try {
      downloadFile(fileId, label);
      toast({
        title: 'Downloading...',
        type: 'success',
        description: `Downloading ${label || 'document'}...`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error downloading file',
        type: 'error',
        description: `Could not download ${label || 'document'}. Please try again.`,
      });
    }
  };

  if (editMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <UpdateOrganizationForm
          organization={organization}
          onCancel={() => setEditMode(false)}
          onSuccess={() => setEditMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-border dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900 dark:text-gray-100 dark:shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:block" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 hidden h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:block" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border bg-white overflow-hidden flex items-center justify-center dark:bg-gray-950">
                {organization?.imageFileId ? (
                  <img
                    src={getFileServeUrl(organization.imageFileId)}
                    alt={`${organization?.name || 'Organization'} logo`}
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
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                  {organization?.name || 'Organization'}
                </h1>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarClock className="w-4 h-4" />
                    <span>
                      Created{' '}
                      {organization?.createdAt
                        ? new Date(organization.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                  {organization?.email && <span>{organization.email}</span>}
                </div>
              </div>
            </div>

            <Button onClick={() => setEditMode(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit Organization
            </Button>
          </div>
        </div>
      </div>

      {/* Organization Info */}
      {(organization?.website ||
        organization?.phone ||
        organization?.address) && (
        <Card className="border-gray-200 dark:border-border">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {organization?.website && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Website
                  </label>
                  <p className="mt-1">
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
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="mt-1">{organization.phone}</p>
                </div>
              )}
              {organization?.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Address
                  </label>
                  <p className="mt-1">{organization.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Documents */}
      <Card className="border-gray-200 dark:border-border">
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">⚖️</span> Legal Documents
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            All organization documents consolidated here.
          </p>
        </div>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:shadow-sm transition bg-gray-50/60 dark:bg-gray-900/40 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">{doc.label}</h3>
                  <Badge variant={doc.fileId ? 'default' : 'secondary'}>
                    {doc.fileId ? 'Uploaded' : 'Missing'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {doc.type === 'pdf' ? (
                    <FileText className="w-8 h-8 text-red-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {doc.type.toUpperCase()} Document
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
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.fileId, doc.label)}
                    disabled={!doc.fileId}
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

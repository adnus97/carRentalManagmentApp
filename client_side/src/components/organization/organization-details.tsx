'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { UpdateOrganizationForm } from './update-organization-form';
import { getOrganizationByUser, Organization } from '@/api/organization';
import { getFile } from '@/api/files';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Image as ImageIcon,
  CalendarClock,
  Building2,
} from 'lucide-react';

type DocType = 'pdf' | 'image';

interface OrganizationDocument {
  label: string;
  fileId?: string;
  type: DocType;
}

export function OrganizationDetails() {
  const [editMode, setEditMode] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organization', 'user'],
    queryFn: getOrganizationByUser,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="p-10 text-center">Loading organization...</Card>
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="p-10 text-center text-red-600">
          No organization found.
        </Card>
      </div>
    );
  }

  const organization = data[0];

  // All documents with their file IDs
  const documents: OrganizationDocument[] = [
    {
      label: 'RC (Registre de Commerce)',
      fileId: organization.rcFileId,
      type: 'pdf',
    },
    {
      label: 'Status',
      fileId: organization.statusFileId,
      type: 'pdf',
    },
    {
      label: 'Decision',
      fileId: organization.decisionFileId,
      type: 'pdf',
    },
    {
      label: 'CEO ID Card',
      fileId: organization.ceoIdCardFileId,
      type: 'image',
    },
    {
      label: 'Fleet List',
      fileId: organization.fleetListFileId,
      type: 'pdf',
    },
    {
      label: 'Model G',
      fileId: organization.modelGFileId,
      type: 'pdf',
    },
    {
      label: 'Identifiant Fiscale',
      fileId: organization.identifiantFiscaleFileId,
      type: 'pdf',
    },
    {
      label: 'Bilan',
      fileId: organization.bilanFileId,
      type: 'pdf',
    },
  ];

  const handleView = async (fileId?: string, label?: string) => {
    if (!fileId) {
      toast({
        title: 'Document not available',
        type: 'error',
        description: `${label} has not been uploaded yet.`,
      });
      return;
    }

    try {
      const file = await getFile(fileId);
      window.open(file.url, '_blank');
    } catch (error) {
      toast({
        title: 'Error loading file',
        type: 'error',
        description: `Could not load ${label}`,
      });
    }
  };

  const handleDownload = async (fileId?: string, label?: string) => {
    if (!fileId) {
      toast({
        title: 'Document not available',
        type: 'error',
        description: `${label} has not been uploaded yet.`,
      });
      return;
    }

    try {
      const file = await getFile(fileId);
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: 'Error downloading file',
        type: 'error',
        description: `Could not download ${label}`,
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
                {organization.imageFileId ? (
                  <img
                    src={`/api/v1/files/${organization.imageFileId}/serve`}
                    alt={`${organization.name} logo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-gray-9" />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                  {organization.name}
                </h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="w-4 h-4" />
                  <span>
                    Created{' '}
                    {new Date(organization.createdAt).toLocaleDateString()}
                  </span>
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
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{doc.label}</h3>
                  <Badge variant={doc.fileId ? 'default' : 'secondary'}>
                    {doc.fileId ? 'Uploaded' : 'Missing'}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {doc.type === 'pdf' ? (
                    <FileText className="w-8 h-8 text-red-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {doc.type.toUpperCase()} Document
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
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
                  {doc.type === 'pdf' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.fileId, doc.label)}
                      disabled={!doc.fileId}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

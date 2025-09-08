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
  field: keyof Organization;
  type: DocType;
  url?: string;
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

  // All items consolidated under Legal Documents
  const documents: OrganizationDocument[] = [
    // Legal core
    {
      label: 'RC (Registre de Commerce)',
      field: 'rc',
      type: 'pdf',
      url: organization.rc,
    },
    { label: 'Status', field: 'status', type: 'pdf', url: organization.status },
    {
      label: 'Decision',
      field: 'decision',
      type: 'pdf',
      url: organization.decision,
    },
    {
      label: 'CEO ID Card',
      field: 'ceoIdCard',
      type: 'image',
      url: organization.ceoIdCard,
    },

    // Previously Fleet
    {
      label: 'Fleet List',
      field: 'fleetList',
      type: 'pdf',
      url: organization.fleetList,
    },
    {
      label: 'Model G',
      field: 'modelG',
      type: 'pdf',
      url: organization.modelG,
    },

    // Previously Financial
    {
      label: 'Identifiant Fiscale',
      field: 'identifiantFiscale',
      type: 'pdf',
      url: organization.identifiantFiscale,
    },
    { label: 'Bilan', field: 'bilan', type: 'pdf', url: organization.bilan },
  ];

  const handleView = (url?: string, label?: string) => {
    if (!url) {
      toast({
        title: 'Document not available',
        type: 'error',
        description: `${label} has not been uploaded yet.`,
      });
      return;
    }
    window.open(url, '_blank');
  };

  const handleDownload = (url?: string, label?: string) => {
    if (!url) {
      toast({
        title: 'Document not available',
        type: 'error',
        description: `${label} has not been uploaded yet.`,
      });
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `${label?.replace(/\s+/g, '_')}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      {/* Header Card with your exact style */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-border dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900 dark:text-gray-100 dark:shadow-lg">
        {/* Decorative glow in dark mode */}
        <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:block" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 hidden h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:block" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border bg-white overflow-hidden flex items-center justify-center dark:bg-gray-950">
                {organization.image ? (
                  <img
                    src={organization.image}
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

      {/* Single section: Legal Documents (includes all items) */}
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
            {documents.map((doc) => (
              <div
                key={doc.field as string}
                className="border rounded-lg p-4 hover:shadow-sm transition bg-gray-50/60 dark:bg-gray-900/40 dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{doc.label}</h3>
                  <Badge variant={doc.url ? 'default' : 'secondary'}>
                    {doc.url ? 'Uploaded' : 'Missing'}
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
                    onClick={() => handleView(doc.url, doc.label)}
                    disabled={!doc.url}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  {doc.type === 'pdf' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.url, doc.label)}
                      disabled={!doc.url}
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

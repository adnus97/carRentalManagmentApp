'use client';

import { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import {
  FileText,
  X,
  Eye,
  Loader2,
  AlertCircle,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '../ui/toast';
import { useR2Upload, useFileValidation } from '../../hooks/useR2Upload';
import { File as ApiFile, viewFile } from '@/api/files';
import { useTranslation } from 'react-i18next';

interface Props {
  label: string;
  accept: string;
  folder: string;
  onUploadSuccess: (file: ApiFile) => void;
  onUploadProgress?: (uploading: boolean) => void;
  currentFile?: string;
  required?: boolean;
  description?: string;
  isPublic?: boolean;
  disabled?: boolean;
}

/**
 * FileUploaderStyled (localized)
 * - Uses client namespace for all UI strings
 * - Drop-in replacement for your FileUploader with improved styling
 * - Programmatic file input click for reliable dialog opening
 */
export function FileUploaderStyled({
  label,
  accept,
  folder,
  onUploadSuccess,
  onUploadProgress,
  currentFile,
  required,
  description,
  disabled = false,
}: Props) {
  const { t } = useTranslation('client');

  const [uploadedFile, setUploadedFile] = useState<ApiFile | null>(null);
  const { uploadFile, uploading, progress, error, reset } = useR2Upload();
  const { validateFile } = useFileValidation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const effectiveDisabled = disabled || uploading;

  const getAllowedTypes = () => {
    if (accept.includes('.pdf')) return ['application/pdf'];
    if (
      accept.includes('.jpg') ||
      accept.includes('.jpeg') ||
      accept.includes('.png') ||
      accept.includes('.webp')
    ) {
      return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    }
    return [];
  };

  const handleChoose = () => {
    if (effectiveDisabled) return;
    inputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 25 * 1024 * 1024,
      allowedTypes: getAllowedTypes(),
      allowedExtensions: accept.split(',').map((ext) => ext.trim()),
    });

    if (!validation.isValid) {
      toast({
        title: t('uploader.invalid.title', 'Invalid file'),
        type: 'error',
        description:
          validation.errors.join(', ') ||
          t('uploader.invalid.desc', 'The selected file is not allowed.'),
      });
      e.target.value = '';
      return;
    }

    reset();

    try {
      onUploadProgress?.(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');
      formData.append('type', 'organization');
      formData.append('folder', folder);
      formData.append('ids', JSON.stringify({}));

      const result = await uploadFile(formData);
      if (result) {
        setUploadedFile(result);
        onUploadSuccess(result);
        toast({
          title: t('uploader.success.title', 'Success!'),
          type: 'success',
          description: t(
            'uploader.success.desc',
            '{{label}} uploaded successfully.',
            {
              label,
            },
          ),
        });
      }
    } catch (err: any) {
      toast({
        title: t('uploader.error.title', 'Upload failed'),
        type: 'error',
        description:
          err?.message ||
          t('uploader.error.desc', 'Failed to upload file. Please try again.'),
      });
    } finally {
      onUploadProgress?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleView = () => {
    if (uploadedFile) viewFile(uploadedFile.id);
    else if (currentFile) window.open(currentFile, '_blank');
  };

  const clear = () => {
    setUploadedFile(null);
    reset();
  };

  const hasFile = uploadedFile || currentFile;
  const fileName =
    uploadedFile?.name ||
    currentFile ||
    t('uploader.no_file', 'No file chosen');

  return (
    <div className="space-y-2">
      <Label className="text-sm ">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      <div
        className={`
          flex items-center justify-between gap-3
          rounded-md border bg-background px-3 py-2
          ${error ? 'border-red-500' : 'border-gray-700'}
          ${effectiveDisabled ? 'opacity-60' : ''}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-sm text-muted-foreground">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {uploadedFile && !uploading ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              {t('uploader.status.uploaded', 'Uploaded')}
            </span>
          ) : error ? (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error.message}
            </span>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileUpload}
            className="hidden"
            disabled={effectiveDisabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={effectiveDisabled}
            onClick={handleChoose}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('uploader.status.uploading', 'Uploading…')}
              </>
            ) : (
              t('uploader.actions.choose', 'Choose File')
            )}
          </Button>
        </div>
      </div>

      {uploading && progress > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}%{' '}
            {t('uploader.status.uploading_plain', 'uploading...')}
          </p>
        </div>
      )}

      {hasFile && !uploading && (
        <div className="flex items-center gap-2 p-3 bg-gray-50/5 dark:bg-gray-800/50 border border-gray-700 rounded-md">
          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm flex-1 truncate text-gray-200">
            {uploadedFile?.name || currentFile}
          </span>
          <div className="flex gap-1">
            {(uploadedFile || currentFile) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleView}
                className="h-8 w-8 p-0 hover:bg-gray-200/10"
                title={t('uploader.actions.view_tooltip', 'View file')}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            {uploadedFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="h-8 w-8 p-0 hover:bg-gray-200/10"
                title={t('uploader.actions.clear_tooltip', 'Clear file')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

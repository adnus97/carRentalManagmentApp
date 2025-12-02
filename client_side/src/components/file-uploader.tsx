'use client';

import { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FileText, X, Eye, Loader2, AlertCircle, Upload } from 'lucide-react';
import { toast } from './ui/toast';
import { useR2Upload, useFileValidation } from '../hooks/useR2Upload';
import { Progress } from './ui/progress';
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
}

export function FileUploader({
  label,
  accept,
  folder,
  onUploadSuccess,
  onUploadProgress,
  currentFile,
  required,
  description,
}: Props) {
  const { t } = useTranslation('client');

  const [uploadedFile, setUploadedFile] = useState<ApiFile | null>(null);
  const { uploadFile, uploading, progress, error, reset } = useR2Upload();
  const { validateFile } = useFileValidation();

  // New: keep a ref to the hidden input and a local name for display
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');

  // Determine allowed types based on accept prop
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedName(file?.name || '');
    if (!file) return;

    // Validate file before upload
    const validation = validateFile(file, {
      maxSize: 25 * 1024 * 1024, // 25MB
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
      if (inputRef.current) inputRef.current.value = '';
      setSelectedName('');
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
            { label },
          ),
        });
      }
    } catch (err: any) {
      toast({
        title: t('uploader.error.title', 'Upload failed'),
        type: 'error',
        description:
          err.message ||
          t('uploader.error.desc', 'Failed to upload file. Please try again.'),
      });
    } finally {
      onUploadProgress?.(false);
      if (inputRef.current) inputRef.current.value = '';
      // Do not clear selectedName; keep visible until preview replaces it
    }
  };

  const handleView = () => {
    if (uploadedFile) {
      viewFile(uploadedFile.id);
    } else if (currentFile) {
      window.open(currentFile, '_blank');
    }
  };

  const clear = () => {
    setUploadedFile(null);
    setSelectedName('');
    reset();
  };

  const hasFile = uploadedFile || currentFile;
  const fileName =
    uploadedFile?.name || t('uploader.current_file', 'Current file');

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Custom, translatable chooser */}
      <div className="flex items-center gap-2">
        {/* Hidden native input (keeps accessibility and system picker) */}
        <div className="border border-solid border-accent-6 p-1 rounded-md w-full">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileUpload}
            disabled={uploading}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            aria-label={t('uploader.actions.choose', 'Choose File')}
            title={t('uploader.actions.choose', 'Choose File')}
          >
            <Upload className="h-4 w-4" />
            {t('uploader.actions.choose', 'Choose File')}
          </Button>

          <span className="text-sm text-muted-foreground truncate ml-4">
            {selectedName || t('uploader.no_file', 'No file chosen')}
          </span>
        </div>
        {uploading && (
          <div className="ml-auto flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs text-blue-500">
              {t('uploader.status.uploading', 'Uploading…')}
            </span>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">
            {error.message}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}%{' '}
            {t('uploader.status.uploading_plain', 'uploading...')}
          </p>
        </div>
      )}

      {/* File preview */}
      {hasFile && !uploading && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
          <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-sm flex-1 truncate text-gray-900 dark:text-gray-100">
            {fileName}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              title={t('uploader.actions.view_tooltip', 'View file')}
            >
              <Eye className="h-3 w-3" />
            </Button>
            {uploadedFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
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

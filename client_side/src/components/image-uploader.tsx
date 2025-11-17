// components/image-uploader.tsx
import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { X, Upload, Loader2, Eye, AlertCircle } from 'lucide-react';
import { toast } from './ui/toast';
import {
  useR2Upload,
  useFileValidation,
  useFilePreview,
} from '../hooks/useR2Upload';
import { File as ApiFile, getFileServeUrl, viewFile } from '@/api/files';
import { useTranslation } from 'react-i18next';

interface Props {
  currentImage?: string;
  onUploadProgress?: (uploading: boolean) => void;
  onUploadSuccess: (file: ApiFile) => void;
}

export function UploadComponent({
  currentImage,
  onUploadProgress,
  onUploadSuccess,
}: Props) {
  const { t } = useTranslation(['client', 'organization']);

  const [uploadedFile, setUploadedFile] = useState<ApiFile | null>(null);
  const { uploadFile, uploading, error, reset } = useR2Upload();
  const { validateFile } = useFileValidation();
  const { previews, generatePreview, clearPreview } = useFilePreview();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewKey = 'logo-upload';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    });

    if (!validation.isValid) {
      toast({
        title:
          t('uploader.invalid.title', {
            ns: 'organization',
            defaultValue: '',
          }) ||
          t('uploader.invalid.title', {
            ns: 'client',
            defaultValue: 'Invalid file',
          }),
        type: 'error',
        description:
          validation.errors.join(', ') ||
          t('uploader.invalid.desc', {
            ns: 'organization',
            defaultValue: t('uploader.invalid.desc', {
              ns: 'client',
              defaultValue: 'The selected file is not allowed.',
            }),
          }),
      });
      e.target.value = '';
      return;
    }

    generatePreview(file, previewKey);
    reset();

    try {
      onUploadProgress?.(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');
      formData.append('type', 'organization');
      formData.append('folder', 'organizations/logos');
      formData.append('ids', JSON.stringify({}));

      const result = await uploadFile(formData);
      if (result) {
        setUploadedFile(result);
        onUploadSuccess(result);
        toast({
          title:
            t('uploader.success.title', {
              ns: 'organization',
              defaultValue: '',
            }) ||
            t('uploader.success.title', {
              ns: 'client',
              defaultValue: 'Success!',
            }),
          type: 'success',
          description: t('org.logo.upload_success', {
            ns: 'organization',
            defaultValue: t('org.logo.upload_success', {
              ns: 'client',
              defaultValue: 'Organization logo uploaded successfully.',
            }),
          }),
        });
      }
    } catch (err: any) {
      toast({
        title:
          t('uploader.error.title', { ns: 'organization', defaultValue: '' }) ||
          t('uploader.error.title', {
            ns: 'client',
            defaultValue: 'Upload failed',
          }),
        type: 'error',
        description:
          err.message ||
          t('org.logo.upload_error', {
            ns: 'organization',
            defaultValue: t('org.logo.upload_error', {
              ns: 'client',
              defaultValue: 'Failed to upload image. Please try again.',
            }),
          }),
      });
      clearPreview(previewKey);
    } finally {
      onUploadProgress?.(false);
      e.target.value = '';
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const clearAll = () => {
    setUploadedFile(null);
    clearPreview(previewKey);
    reset();
  };

  const handleViewImage = () => {
    if (uploadedFile) viewFile(uploadedFile.id);
    else if (currentImage) window.open(currentImage, '_blank');
  };

  const displayImage =
    previews[previewKey] ||
    (uploadedFile ? getFileServeUrl(uploadedFile.id) : currentImage);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={uploading}
        className="hidden"
      />

      <Button
        variant="outline"
        onClick={openFilePicker}
        disabled={uploading}
        className="gap-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('uploader.status.uploading', {
              ns: 'organization',
              defaultValue: t('uploader.status.uploading', {
                ns: 'client',
                defaultValue: 'Uploading…',
              }),
            })}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {t('org.logo.choose', {
              ns: 'organization',
              defaultValue: t('org.logo.choose', {
                ns: 'client',
                defaultValue: 'Choose Image',
              }),
            })}
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">
            {error.message}
          </span>
        </div>
      )}

      {displayImage && (
        <div className="relative">
          <div className="relative w-24 h-24 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
            <img
              src={displayImage}
              alt={t('org.logo.alt', {
                ns: 'organization',
                defaultValue: t('org.logo.alt', {
                  ns: 'client',
                  defaultValue: 'Organization logo',
                }),
              })}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/%3E%3Ccircle cx="12" cy="13" r="3"/%3E%3C/svg%3E';
              }}
            />
          </div>

          <div className="flex gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewImage}
              className="h-6 text-xs"
              title={t('uploader.actions.view_tooltip', {
                ns: 'organization',
                defaultValue: t('uploader.actions.view_tooltip', {
                  ns: 'client',
                  defaultValue: 'View file',
                }),
              })}
            >
              <Eye className="h-3 w-3 mr-1" />
              {t('uploader.actions.view_tooltip', {
                ns: 'organization',
                defaultValue: t('uploader.actions.view_tooltip', {
                  ns: 'client',
                  defaultValue: 'View file',
                }),
              })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 text-xs"
              title={t('uploader.actions.clear_tooltip', {
                ns: 'organization',
                defaultValue: t('uploader.actions.clear_tooltip', {
                  ns: 'client',
                  defaultValue: 'Clear file',
                }),
              })}
            >
              <X className="h-3 w-3 mr-1" />
              {t('uploader.actions.clear_tooltip', {
                ns: 'organization',
                defaultValue: t('uploader.actions.clear_tooltip', {
                  ns: 'client',
                  defaultValue: 'Clear file',
                }),
              })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

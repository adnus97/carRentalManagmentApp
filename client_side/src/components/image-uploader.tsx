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
  const [uploadedFile, setUploadedFile] = useState<ApiFile | null>(null);
  const { uploadFile, uploading, error, reset } = useR2Upload();
  const { validateFile } = useFileValidation();
  const { previews, generatePreview, clearPreview } = useFilePreview();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewKey = 'logo-upload';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB for images
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    });

    if (!validation.isValid) {
      toast({
        title: 'Invalid file',
        type: 'error',
        description: validation.errors.join(', '),
      });
      e.target.value = '';
      return;
    }

    // Generate preview
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
          title: 'Success!',
          type: 'success',
          description: 'Organization logo uploaded successfully.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        type: 'error',
        description: err.message || 'Failed to upload image. Please try again.',
      });
      clearPreview(previewKey);
    } finally {
      onUploadProgress?.(false);
      e.target.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clearAll = () => {
    setUploadedFile(null);
    clearPreview(previewKey);
    reset();
  };

  const handleViewImage = () => {
    if (uploadedFile) {
      viewFile(uploadedFile.id);
    } else if (currentImage) {
      window.open(currentImage, '_blank');
    }
  };

  const displayImage =
    previews[previewKey] ||
    (uploadedFile ? getFileServeUrl(uploadedFile.id) : currentImage);

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={uploading}
        className="hidden"
      />

      {/* Upload button */}
      <Button
        variant="outline"
        onClick={openFilePicker}
        disabled={uploading}
        className="gap-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Choose Image
          </>
        )}
      </Button>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">
            {error.message}
          </span>
        </div>
      )}

      {/* Preview/Current image */}
      {displayImage && (
        <div className="relative">
          <div className="relative w-24 h-24 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
            <img
              src={displayImage}
              alt="Organization logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', displayImage);
                const target = e.target as HTMLImageElement;
                target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/%3E%3Ccircle cx="12" cy="13" r="3"/%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewImage}
              className="h-6 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

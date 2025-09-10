// components/image-uploader.tsx
import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from './ui/toast';
import { useR2Upload } from '../hooks/useR2Upload';
import { File } from '@/api/files';

interface Props {
  currentImage?: string;
  onUploadProgress?: (uploading: boolean) => void;
  onUploadSuccess: (file: File) => void;
}

export function UploadComponent({
  currentImage,
  onUploadProgress,
  onUploadSuccess,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const { uploadFile, uploading } = useR2Upload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        type: 'error',
        description: 'Please select an image file (PNG, JPG, WEBP)',
      });
      e.target.value = '';
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      onUploadProgress?.(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');
      formData.append('type', 'organization');
      formData.append('ids', JSON.stringify({}));

      const result = await uploadFile(formData);
      if (result) {
        onUploadSuccess(result);
        toast({
          title: 'Uploaded',
          type: 'success',
          description: 'Organization logo uploaded successfully.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        type: 'error',
        description: err.message || 'Failed to upload image',
      });
      setPreview(null);
    } finally {
      onUploadProgress?.(false);
      e.target.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    setPreview(null);
  };

  const displayImage = preview || currentImage;

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

      {/* Your existing styled button */}
      <Button
        variant="outline"
        onClick={openFilePicker}
        disabled={uploading}
        className="gap-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
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

      {/* Preview/Current image */}
      {displayImage && (
        <div className="relative w-24 h-24 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
          <img
            src={displayImage}
            alt="Organization logo"
            className="w-full h-full object-cover"
          />
          {preview && (
            <Button
              size="sm"
              onClick={clearPreview}
              className="absolute top-1 right-1 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

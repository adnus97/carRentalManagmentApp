'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X,
  Upload,
  Camera,
  AlertCircle,
  Eye,
  Trash2,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface CarImageUploadProps {
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  existingImages?: Array<{
    id: string;
    url: string;
    name: string;
    path?: string;
  }>;
  disabled?: boolean;
  className?: string;
}

export function CarImageUpload({
  onImagesChange,
  maxImages = 4,
  existingImages = [],
  disabled = false,
  className = '',
}: CarImageUploadProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      console.log('Files dropped:', acceptedFiles.length);
      setError('');
      acceptedFiles.forEach((file, idx) => {
        console.log(`   File ${idx + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          constructor: file.constructor.name,
          isFile: file instanceof File,
        });
      });

      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map((file: any) =>
          file.errors.map((e: any) => e.message).join(', '),
        );
        setError(`Some files were rejected: ${errors.join('; ')}`);
      }

      const totalImages =
        selectedImages.length + existingImages.length + acceptedFiles.length;

      if (totalImages > maxImages) {
        setError(
          `Maximum ${maxImages} images allowed. Currently have ${
            selectedImages.length + existingImages.length
          } images.`,
        );
        return;
      }

      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > 10 * 1024 * 1024) {
          setError(
            (prev) => prev + ` File ${file.name} is too large (max 10MB).`,
          );
          return false;
        }
        if (!file.type.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
          setError(
            (prev) =>
              prev +
              ` File ${file.name} is not a valid image format (JPG/PNG/WEBP/GIF).`,
          );
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        const newImages = [...selectedImages, ...validFiles];
        const newPreviews = [...previews];
        console.log(
          '🔍 CarImageUpload - Setting new images:',
          newImages.length,
        );
        console.log(
          '   New images are File objects:',
          newImages.every((f) => f instanceof File),
        );

        validFiles.forEach((file) => {
          const url = URL.createObjectURL(file);
          newPreviews.push(url);
        });

        console.log('Setting new images:', newImages.length);
        setSelectedImages(newImages);
        setPreviews(newPreviews);
        onImagesChange(newImages); // Make sure this is called
      }
    },
    [
      selectedImages,
      previews,
      onImagesChange,
      maxImages,
      existingImages.length,
    ],
  );
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    multiple: true,
    disabled,
    maxFiles: maxImages - existingImages.length,
    noClick: true,
    noKeyboard: true,
  });

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    URL.revokeObjectURL(previews[index]);

    setSelectedImages(newImages);
    setPreviews(newPreviews);
    onImagesChange(newImages);
    setError('');
  };

  const removeAllImages = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviews([]);
    onImagesChange([]);
    setError('');
  };

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const totalImages = selectedImages.length + existingImages.length;
  const canAddMore = totalImages < maxImages && !disabled;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-accent-8" />
          <label className="text-sm font-medium">
            Car Photos ({totalImages}/{maxImages})
          </label>
          <Badge
            variant={totalImages === maxImages ? 'secondary' : 'outline'}
            className="h-5 text-xs px-2"
          >
            {totalImages === maxImages
              ? 'Full'
              : `${maxImages - totalImages} left`}
          </Badge>
        </div>

        {(selectedImages.length > 0 || existingImages.length > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeAllImages}
            className="h-8 px-3 text-red-600 hover:text-red-700 self-start sm:self-auto"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="py-2 px-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Existing images - Responsive Grid */}
      {existingImages.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Current Images:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {existingImages.map((img) => (
              <div key={img.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => setPreviewImage(img.url)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setPreviewImage(img.url)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New images - Responsive Grid */}
      {selectedImages.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">New Images:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedImages.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-dashed border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/20">
                  <img
                    src={previews[index]}
                    alt={file.name}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => setPreviewImage(previews[index])}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropzone - Responsive */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg px-4 py-6 sm:py-8 text-center transition-all cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''} ${
          !canAddMore ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-3">
          <div
            className={`rounded-full p-3 ${
              isDragActive
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>

          {isDragActive ? (
            <div className="space-y-1">
              <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400 font-medium">
                Drop images here...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                Drag & drop car images here
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Support: JPG, PNG, WEBP, GIF up to 10MB each
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <Badge variant="outline" className="text-xs">
                  {maxImages - totalImages} slots remaining
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={open}
                  disabled={disabled || !canAddMore}
                  className="h-8 px-4 text-xs"
                >
                  Browse Files
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal - Responsive */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

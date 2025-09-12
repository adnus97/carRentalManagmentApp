// hooks/useR2Upload.ts
import { useState, useCallback } from 'react';
import { createFile, File as ApiFile } from '../api/files';

interface UploadError {
  message: string;
  code?: string;
  details?: any;
}

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);

  const uploadFile = useCallback(
    async (body: FormData): Promise<ApiFile | undefined> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 20;
          });
        }, 100);

        const res = await createFile(body);

        clearInterval(progressInterval);
        setProgress(100);

        return res;
      } catch (err: any) {
        console.error('Upload error:', err);

        let errorMessage = 'Upload failed. Please try again.';
        let errorCode = 'UNKNOWN_ERROR';

        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }

        if (err.response?.status) {
          switch (err.response.status) {
            case 400:
              errorCode = 'BAD_REQUEST';
              break;
            case 401:
              errorCode = 'UNAUTHORIZED';
              errorMessage = 'Please log in to upload files.';
              break;
            case 413:
              errorCode = 'FILE_TOO_LARGE';
              errorMessage = 'File is too large. Please choose a smaller file.';
              break;
            case 415:
              errorCode = 'UNSUPPORTED_MEDIA_TYPE';
              errorMessage = 'File type not supported.';
              break;
            case 429:
              errorCode = 'RATE_LIMIT_EXCEEDED';
              errorMessage = 'Too many uploads. Please wait and try again.';
              break;
            case 500:
              errorCode = 'SERVER_ERROR';
              errorMessage = 'Server error. Please try again later.';
              break;
          }
        }

        const uploadError: UploadError = {
          message: errorMessage,
          code: errorCode,
          details: err.response?.data,
        };

        setError(uploadError);
        throw new Error(errorMessage);
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    uploadFile,
    uploading,
    progress,
    error,
    reset,
  };
}

// Hook for file validation before upload
export function useFileValidation() {
  const validateFile = useCallback(
    (
      file: File,
      options: {
        maxSize?: number;
        allowedTypes?: string[];
        allowedExtensions?: string[];
      } = {},
    ) => {
      const errors: string[] = [];

      const maxSize = options.maxSize || 25 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(
          `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
        );
      }

      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed`);
      }

      if (options.allowedExtensions) {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!options.allowedExtensions.includes(extension)) {
          errors.push(
            `File extension must be one of: ${options.allowedExtensions.join(', ')}`,
          );
        }
      }

      if (
        file.name.includes('..') ||
        file.name.includes('/') ||
        file.name.includes('\\')
      ) {
        errors.push('Invalid file name');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [],
  );

  return { validateFile };
}

// Fixed file preview hook with proper File type
export function useFilePreview() {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const generatePreview = useCallback((file: File, key: string) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviews((prev) => ({
          ...prev,
          [key]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const clearPreview = useCallback((key: string) => {
    setPreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[key];
      return newPreviews;
    });
  }, []);

  const clearAllPreviews = useCallback(() => {
    setPreviews({});
  }, []);

  return {
    previews,
    generatePreview,
    clearPreview,
    clearAllPreviews,
  };
}

// Multiple file upload hook
export function useMultiFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, UploadError>>({});
  const [completed, setCompleted] = useState<Record<string, ApiFile>>({});

  const uploadFiles = useCallback(
    async (
      files: { key: string; formData: FormData }[],
    ): Promise<Record<string, ApiFile | undefined>> => {
      setUploading(true);
      setProgress({});
      setErrors({});
      setCompleted({});

      const results: Record<string, ApiFile | undefined> = {};

      const uploadPromises = files.map(async ({ key, formData }) => {
        try {
          const progressInterval = setInterval(() => {
            setProgress((prev) => ({
              ...prev,
              [key]: Math.min((prev[key] || 0) + Math.random() * 15, 90),
            }));
          }, 100);

          const result = await createFile(formData);

          clearInterval(progressInterval);
          setProgress((prev) => ({ ...prev, [key]: 100 }));
          setCompleted((prev) => ({ ...prev, [key]: result }));

          results[key] = result;
          return result;
        } catch (err: any) {
          const uploadError: UploadError = {
            message: err.message || 'Upload failed',
            code: 'UPLOAD_ERROR',
            details: err.response?.data,
          };

          setErrors((prev) => ({ ...prev, [key]: uploadError }));
          results[key] = undefined;
          return undefined;
        }
      });

      await Promise.allSettled(uploadPromises);
      setUploading(false);

      return results;
    },
    [],
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({});
    setErrors({});
    setCompleted({});
  }, []);

  return {
    uploadFiles,
    uploading,
    progress,
    errors,
    completed,
    reset,
  };
}

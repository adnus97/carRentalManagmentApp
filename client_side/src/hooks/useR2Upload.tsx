import { useState } from 'react';

const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

export interface UploadResult {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    folder: string,
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      // 1) Get presigned URL
      const res = await fetch(`${API_BASE}/upload/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if you have authentication
          // 'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Failed to get presigned URL: ${res.status} ${errorText}`,
        );
      }

      const { presignedUrl, key, url } = await res.json();
      console.log('Presigned URL received:', { presignedUrl, key, url });

      setProgress(50);

      // 2) Upload to R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Upload failed: ${uploadRes.status} ${errorText}`);
      }

      setProgress(100);

      return {
        key,
        url,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, progress };
}

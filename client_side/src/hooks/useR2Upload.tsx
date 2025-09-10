// hooks/useR2Upload.ts
import { useState } from 'react';
import { createFile, File } from '../api/files';

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (body: FormData): Promise<File | undefined> => {
    setUploading(true);
    setProgress(0);
    try {
      const res = await createFile(body);
      setProgress(100);
      return res;
    } catch (err) {
      console.log(err);
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, progress };
}

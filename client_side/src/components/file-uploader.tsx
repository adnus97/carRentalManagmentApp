// components/file-uploader.tsx (updated with dark mode styling)
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileText, X, Eye, Loader2 } from 'lucide-react';
import { toast } from './ui/toast';
import { useR2Upload } from '../hooks/useR2Upload';
import { Progress } from './ui/progress';
import { File } from '@/api/files';

interface Props {
  label: string;
  accept: string;
  folder: string;
  onUploadSuccess: (file: File) => void;
  onUploadProgress?: (uploading: boolean) => void;
  currentFile?: string;
  required?: boolean;
  description?: string;
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { uploadFile, uploading, progress } = useR2Upload();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const exts = accept.split(',').map((s) => s.trim());
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!exts.includes(ext)) {
      toast({
        title: 'Invalid file type',
        type: 'error',
        description: `Allowed: ${accept}`,
      });
      e.target.value = '';
      return;
    }

    try {
      onUploadProgress?.(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');
      formData.append('type', 'organization');
      formData.append('ids', JSON.stringify({}));

      const result = await uploadFile(formData);
      if (result) {
        setUploadedFile(result);
        onUploadSuccess(result);
        toast({
          title: 'Uploaded',
          type: 'success',
          description: `${label} uploaded.`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        type: 'error',
        description: err.message || '',
      });
    } finally {
      onUploadProgress?.(false);
      e.target.value = '';
    }
  };

  const view = (url: string) => window.open(url, '_blank')?.focus();
  const clear = () => setUploadedFile(null);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileUpload}
          disabled={uploading}
          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        />
        {uploading && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs text-blue-500">Uploading...</span>
          </div>
        )}
      </div>

      {uploading && progress > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {(uploadedFile || currentFile) && !uploading && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
          <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm flex-1 truncate text-gray-900 dark:text-gray-100">
            {uploadedFile?.name || 'Current file'}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => view(uploadedFile?.url || currentFile!)}
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Eye className="h-3 w-3" />
            </Button>
            {uploadedFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
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

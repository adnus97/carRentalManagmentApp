import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, Loader2, Upload, X } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { File as ApiFile } from '@/api/files';
import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/toast';

interface Props {
  onUploadSuccess: (img: ApiFile) => void;
  onUploadProgress?: (uploading: boolean) => void;
  currentImage?: string;
}

export function UploadComponent({
  onUploadSuccess,
  onUploadProgress,
  currentImage,
}: Props) {
  const [image, setImage] = useState<ApiFile | null>(null);
  const { uploadFile, uploading, progress } = useR2Upload();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      toast({
        title: 'Invalid type',
        type: 'error',
        description: 'Upload an image file.',
      });
      e.target.value = ''; // This is fine for input elements
      return;
    }

    try {
      onUploadProgress?.(true);

      // ✅ Create FormData properly
      const formData = new FormData();
      formData.append('file', f);
      formData.append('type', 'organization');
      formData.append('folder', 'organizations/logos');

      // ✅ Call uploadFile with only FormData
      const result = await uploadFile(formData);

      if (result) {
        setImage(result);
        onUploadSuccess(result);
        toast({
          title: 'Success!',
          type: 'success',
          description: 'Logo uploaded!',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Upload failed',
        type: 'error',
        description: e.message || 'Upload failed',
      });
    } finally {
      onUploadProgress?.(false);
      // ✅ Clear the input value safely
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const view = (url: string) => window.open(url, '_blank')?.focus();
  const clear = () => setImage(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          id="logo-input"
          type="file"
          accept="image/*"
          onChange={onChange}
          disabled={uploading}
          className="hidden"
        />
        <Label
          htmlFor="logo-input"
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span className="text-sm">
            {uploading ? 'Uploading...' : 'Choose Image'}
          </span>
        </Label>
      </div>

      {uploading && progress > 0 && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {(currentImage || image) && !uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {image ? 'New Image' : 'Current Image'}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => view(image?.url || currentImage!)}
                className="h-8 w-8 p-0"
                title="View image"
              >
                <Eye className="h-3 w-3" />
              </Button>
              {image && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="h-8 w-8 p-0"
                  title="Clear image"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={image?.url || currentImage}
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

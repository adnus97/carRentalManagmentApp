import { IKContext, IKUpload } from 'imagekitio-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchData } from '../api/imagekit';

interface UploadComponentProps {
  onUploadSuccess?: (imageData: any) => void;
  onUploadProgress?: (isUploading: boolean) => void; // Pass boolean instead of progress percentage
}

export function UploadComponent({
  onUploadSuccess,
  onUploadProgress,
}: UploadComponentProps) {
  const [fileName, setFileName] = useState('');

  const [isUploading, setIsUploading] = useState(false); // Track upload state
  const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;

  // ✅ Check if data is available before extracting signature, token, etc.
  const authenticator = async () => {
    try {
      const data = await fetchData();
      return {
        token: data.token,
        expire: data.expire,
        signature: data.signature,
      };
    } catch (e) {
      throw new Error(`Request failed: ${e}`);
    }
  };

  const onError = (err: any) => {
    console.log('Error', err);
    setIsUploading(false); // Reset state on error
    onUploadProgress && onUploadProgress(false);
  };
  const onSuccess = (res: any) => {
    console.log('✅ Upload Success:', res);
    if (onUploadSuccess) onUploadSuccess(res);

    // 🔴 Instead of setting isUploading = false immediately, delay it
    setTimeout(() => {
      console.log('⏳ Delayed: Setting isUploading to false');
      if (onUploadProgress) onUploadProgress(false);
    }, 500); // ✅ Small delay (500ms) to avoid flickering
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFileName(event.target.files[0].name); // Get the selected file's name
    }
  };
  // ✅ Track upload progress
  // const handleUploadProgress = (
  //   evt: ProgressEvent<XMLHttpRequestEventTarget>,
  // ) => {
  //   const progress = (evt.loaded / evt.total) * 100;
  //   const isUploadingNow = progress > 0 && progress < 100;
  //   if (isUploading !== isUploadingNow) {
  //     setIsUploading(isUploadingNow);
  //     if (onUploadProgress) onUploadProgress(isUploadingNow);
  //   }
  // };
  const handleUploadProgress = (event: ProgressEvent) => {
    if (event.lengthComputable) {
      const progressPercent = (event.loaded / event.total) * 100;
      console.log(`Upload Progress: ${progressPercent.toFixed(2)}%`);

      if (onUploadProgress) {
        const isUploading = progressPercent > 0 && progressPercent < 100;
        console.log('Setting isUploading to:', isUploading); // 🔍 Debug log
        onUploadProgress(isUploading);
      }
    }
  };
  return (
    <div className="">
      {false ? (
        <p>Loading authentication...</p>
      ) : false ? (
        <p>Error loading authentication</p>
      ) : (
        <IKContext
          publicKey={publicKey}
          urlEndpoint={urlEndpoint}
          authenticator={authenticator}
        >
          <IKUpload
            className="bg-transparent border-2 border-dotted border-gray-300  rounded p-2 cursor-pointer"
            onChange={handleFileChange}
            fileName={fileName}
            onSuccess={onSuccess}
            onUploadProgress={handleUploadProgress}
            onError={onError}
            overwriteFile={true}
          />
        </IKContext>
      )}
    </div>
  );
}

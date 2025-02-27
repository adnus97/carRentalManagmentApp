import { useState, ChangeEvent } from 'react';
import { Input } from './ui/input';

export function FileUploader({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile); // Pass file to parent
    }
  }

  return (
    <div>
      <Input type="file" onChange={handleFileChange} />
    </div>
  );
}

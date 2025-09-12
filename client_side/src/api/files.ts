// api/files.ts
import { api } from './api';
import config from '@/lib/config';

export interface CreateFile {
  buffer: Buffer;
  name: string;
  path: string;
  type: string;
  size: number;
  is_public: boolean;
  file_type: 'rents' | 'customers' | 'organization';
  ids: {
    customerId?: string;
    rentsId?: string;
  };
}

export interface File {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  url: string;
  isPublic: boolean;
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  checksum?: string;
}

export const createFile = async (data: FormData) => {
  const response = await api.post<File>('/files', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get file metadata (JSON response)
export const getFileMetadata = async (id: string) => {
  const response = await api.get<File>(`/files/${id}`);
  return response.data;
};

// Generate file serve URL (for viewing/displaying files)
export const getFileServeUrl = (id?: string): string => {
  if (!id) return '';
  return `${config.filesBaseUrl}/${id}/serve`;
};

// Generate file download URL
export const getFileDownloadUrl = (id?: string): string => {
  if (!id) return '';
  return `${config.filesBaseUrl}/${id}/download`;
};

// For backward compatibility and when you need file metadata
export const getFile = async (id: string) => {
  return await getFileMetadata(id);
};

export const getAllFiles = async () => {
  const response = await api.get<File[]>('/files');
  return response.data;
};

export const deleteFile = async (id: string) => {
  const response = await api.post(`/files/${id}/delete`);
  return response.data;
};

// Utility function to open file in new tab
export const viewFile = (id?: string) => {
  if (!id) {
    console.warn('No file ID provided for viewing');
    return;
  }
  const url = getFileServeUrl(id);
  window.open(url, '_blank');
};

// Utility function to download file
export const downloadFile = (id?: string, filename?: string) => {
  if (!id) {
    console.warn('No file ID provided for download');
    return;
  }
  const url = getFileDownloadUrl(id);
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

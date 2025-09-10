// api/files.ts
import { api } from './api';

export interface CreateFile {
  buffer: Buffer;
  name: string;
  path: string;
  type: string;
  size: number;
  is_public: boolean;
  file_type: 'rents' | 'customers' | 'organization'; // Added 'organization'
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
}

export const createFile = async (data: FormData) => {
  const response = await api.post<File>('/files', data, {});
  return response.data;
};

export const getFile = async (id: string) => {
  const response = await api.get<File>(`/files/${id}`);
  return response.data;
};

export const getAllFiles = async () => {
  const response = await api.get<File[]>('/files');
  return response.data;
};

export const deleteFile = async (id: string) => {
  const response = await api.post(`/files/${id}/delete`);
  return response.data;
};

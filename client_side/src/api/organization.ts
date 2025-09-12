// api/organization.ts
import { api } from './api';

export interface Organization {
  id: string;
  name: string;
  userId: string;
  email?: string;
  website?: string;
  phone?: string;
  address?: string;
  imageFile?: {
    id?: string;
    name?: string;
    size?: number;
    type?: string;
    url?: string;
  };
  // File ID fields (what's actually stored in DB)
  imageFileId?: string;
  fleetListFileId?: string;
  modelGFileId?: string;
  rcFileId?: string;
  statusFileId?: string;
  identifiantFiscaleFileId?: string;
  decisionFileId?: string;
  ceoIdCardFileId?: string;
  bilanFileId?: string;

  createdAt: string;
  updatedAt: string;
}

// Extended interface for when files are populated (from findOneWithFiles)
export interface OrganizationWithFiles extends Organization {
  imageFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  fleetListFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  modelGFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  rcFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  statusFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  identifiantFiscaleFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  decisionFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  ceoIdCardFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  bilanFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

export interface CreateOrganizationDto {
  name: string;
  email?: string;
  website?: string;
  phone?: string;
  address?: string;
  imageFileId?: string;
  fleetListFileId?: string;
  modelGFileId?: string;
  rcFileId?: string;
  statusFileId?: string;
  identifiantFiscaleFileId?: string;
  decisionFileId?: string;
  ceoIdCardFileId?: string;
  bilanFileId?: string;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {}

export interface OrganizationStats {
  hasOrganization: boolean;
  organizationId?: string;
  organizationName?: string;
  documentsUploaded: number;
  totalDocuments: number;
  completionPercentage: number;
  missingDocuments?: number;
  hasCompleteProfile?: boolean;
}

export const createOrganization = async (data: CreateOrganizationDto) => {
  const response = await api.post<Organization>('/organizations', data);
  return response.data;
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get<Organization[]>('/organizations');
  return response.data;
};

export const getOrganizationByUser = async (): Promise<Organization[]> => {
  const response = await api.get<Organization[]>('/organizations/user');
  return response.data;
};

export const getOrganization = async (id: string): Promise<Organization> => {
  const response = await api.get<Organization>(`/organizations/${id}`);
  return response.data;
};

export const getOrganizationWithFiles = async (
  id: string,
): Promise<OrganizationWithFiles> => {
  const response = await api.get<OrganizationWithFiles>(
    `/organizations/${id}/with-files`,
  );
  return response.data;
};

export const updateOrganization = async (
  id: string,
  data: UpdateOrganizationDto,
): Promise<Organization> => {
  const response = await api.patch<Organization>(`/organizations/${id}`, data);
  return response.data;
};

export const deleteOrganization = async (id: string) => {
  const response = await api.delete(`/organizations/${id}`);
  return response.data;
};

// Get organization statistics (from your backend service)
export const getOrganizationStats = async (): Promise<OrganizationStats> => {
  const response = await api.get<OrganizationStats>('/organizations/stats');
  return response.data;
};

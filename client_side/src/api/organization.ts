import { api } from './api';

export interface Organization {
  id: string;
  name: string;
  userId: string;
  image?: string;
  fleetList?: string;
  modelG?: string;
  rc?: string;
  status?: string;
  identifiantFiscale?: string;
  decision?: string;
  ceoIdCard?: string;
  bilan?: string;
  createdAt: string;
  updatedAt: string;
}

export const createOrganization = async (data: {
  name: string;
  image?: string;
  fleetList?: string;
  modelG?: string;
  rc?: string;
  status?: string;
  identifiantFiscale?: string;
  decision?: string;
  ceoIdCard?: string;
  bilan?: string;
}) => {
  const response = await api.post('/organization', data);
  return response.data;
};

export const getOrganizationByUser = async (): Promise<Organization[]> => {
  const response = await api.get('/organization/user');
  return response.data;
};

export const updateOrganization = async (
  id: string,
  data: Partial<Organization>,
) => {
  const response = await api.patch(`/organization/${id}`, data);
  return response.data;
};

import { api } from './api';

export const getOrganizationsByUserId = async () => {
  const response = await api.get('/organization/user');
  return response.data;
};

export const createOrganization = async (data: {
  name: string;
  image?: string;
}) => {
  const response = await api.post('/organization', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

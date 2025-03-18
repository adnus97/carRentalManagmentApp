import { api } from './api';

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

import { api } from './api';

export const getCustomers = async () => {
  const response = await api.get('/customers/org');
  return response.data;
};

import { api } from './api';

export const fetchData = async () => {
  const { data } = await api.get('/imagekitAuth');
  return data;
};

import api from './api';

export async function updateMyLocale(locale: string) {
  const { data } = await api.patch('/users/me/locale', { locale });
  return data;
}

import axios from 'axios';

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

export const addUser = async ({ user }: { user: NewUser }) => {
  const response = await axios.post('http://localhost:3000/auth', user);
  return response.data;
};

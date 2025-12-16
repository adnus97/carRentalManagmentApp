// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_REACT_API_URL + '/auth' ||
    'http://localhost:3000/api/v1/auth',
  credentials: 'include',
});

export const {
  signIn,
  signUp,
  useSession,
  resetPassword,
  changeEmail,
  changePassword,
  deleteUser,
  unlinkAccount,
  linkSocial,
  listAccounts,
  verifyEmail,
  updateUser,
  sendVerificationEmail,
  requestPasswordReset,
} = authClient;

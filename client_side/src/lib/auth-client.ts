import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000/api/v1/auth', // your Nest+BetterAuth base
});
export const {
  signIn,
  signUp,
  useSession,
  resetPassword,
  changeEmail,
  changePassword,
  forgetPassword,
  deleteUser,
  unlinkAccount,
  linkSocial,
  listAccounts,
  verifyEmail,
  updateUser,
  sendVerificationEmail,
} = createAuthClient();

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateUser as updateUserApi,
  changeEmail as changeEmailApi,
  changePassword as changePasswordApi,
  listAccounts,
  linkSocial,
  unlinkAccount,
  deleteUser as deleteUserApi,
} from '@/lib/auth-client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { Loader } from '@/components/loader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { User } from '../../types/user';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type UpdateProfileFields = z.infer<typeof updateProfileSchema>;
type ChangeEmailFields = z.infer<typeof changeEmailSchema>;
type ChangePasswordFields = z.infer<typeof changePasswordSchema>;

type LinkedAccount = {
  id: string;
  providerId: string;
  providerAccountId: string;
};

// The raw shape your API returns (adjust if needed)
type ApiAccount = {
  id: string;
  provider: string;
  accountId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  scopes?: string[];
};

function mapApiToLinkedAccount(a: ApiAccount): LinkedAccount {
  return {
    id: a.id,
    providerId: a.provider,
    providerAccountId: a.accountId,
  };
}

export function AccountSettings() {
  const { user, setUser } = useUser();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileForm = useForm<UpdateProfileFields>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || '',
      image: user?.image || '',
    },
  });

  const emailForm = useForm<ChangeEmailFields>({
    resolver: zodResolver(changeEmailSchema),
  });

  const passwordForm = useForm<ChangePasswordFields>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingAccounts(true);
      try {
        const res = await listAccounts();
        if (!active) return;
        const apiItems = Array.isArray(res?.data)
          ? (res.data as ApiAccount[])
          : [];
        const items = apiItems.map(mapApiToLinkedAccount);
        setAccounts(items);
      } catch {
        if (active) setAccounts([]);
      } finally {
        if (active) setLoadingAccounts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onUpdateProfile = async (data: UpdateProfileFields) => {
    setIsSubmitting(true);
    try {
      await updateUserApi({
        name: data.name,
        image: data.image || undefined,
      });

      setUser((prev: User | null): User | null => {
        if (!prev) return prev; // nothing to merge
        const nextUser: User = {
          ...prev,
          name: data.name,
          image: data.image || prev.image || '',
        };
        localStorage.setItem('authUser', JSON.stringify(nextUser));
        return nextUser;
      });

      toast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated',
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message ?? 'Failed to update profile',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeEmail = async (data: ChangeEmailFields) => {
    setIsSubmitting(true);
    try {
      await changeEmailApi({
        newEmail: data.newEmail,
        callbackURL: '/account-settings',
      });
      toast({
        type: 'success',
        title: 'Verification Email Sent',
        description: 'Check your current email to approve the change',
      });
      emailForm.reset();
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message ?? 'Failed to change email',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordFields) => {
    setIsSubmitting(true);
    try {
      await changePasswordApi({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: true,
      });
      toast({
        type: 'success',
        title: 'Password Changed',
        description: 'Your password has been successfully changed',
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message ?? 'Failed to change password',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkSocial = async (provider: 'google') => {
    try {
      await linkSocial({
        provider,
        callbackURL: '/account-settings',
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message ?? `Failed to link ${provider} account`,
      });
    }
  };

  const refreshAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await listAccounts();
      const apiItems = Array.isArray(res?.data)
        ? (res.data as ApiAccount[])
        : [];
      const items = apiItems.map(mapApiToLinkedAccount);
      setAccounts(items);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleUnlinkAccount = async (providerId: string) => {
    try {
      await unlinkAccount({ providerId });
      await refreshAccounts();
      toast({
        type: 'success',
        title: 'Account Unlinked',
        description: `${providerId} account has been unlinked`,
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message ?? `Failed to unlink ${providerId} account`,
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserApi();
      toast({
        type: 'success',
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted',
      });
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message ?? 'Failed to delete account',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="accounts">Linked Accounts</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit(onUpdateProfile)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    {...profileForm.register('name')}
                    className={
                      profileForm.formState.errors.name ? 'border-red-600' : ''
                    }
                  />
                  {profileForm.formState.errors.name && (
                    <span className="text-red-600 text-sm">
                      {profileForm.formState.errors.name.message}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ''} disabled />
                  <p className="text-[12px] text-amber-600">
                    To change your email, use the Security tab.
                  </p>
                </div>

                <div>
                  <Label htmlFor="image">Profile Image URL</Label>
                  <Input
                    id="image"
                    placeholder="https://example.com/image.jpg"
                    {...profileForm.register('image')}
                    className={
                      profileForm.formState.errors.image ? 'border-red-600' : ''
                    }
                  />
                  {profileForm.formState.errors.image && (
                    <span className="text-red-600 text-sm">
                      {profileForm.formState.errors.image.message}
                    </span>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Email</CardTitle>
              <CardDescription>
                Change your account email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={emailForm.handleSubmit(onChangeEmail)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="newEmail">New Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    {...emailForm.register('newEmail')}
                    className={
                      emailForm.formState.errors.newEmail
                        ? 'border-red-600'
                        : ''
                    }
                  />
                  {emailForm.formState.errors.newEmail && (
                    <span className="text-red-600 text-sm">
                      {emailForm.formState.errors.newEmail.message}
                    </span>
                  )}
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Change Email'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit(onChangePassword)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register('currentPassword')}
                    className={
                      passwordForm.formState.errors.currentPassword
                        ? 'border-red-600'
                        : ''
                    }
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <span className="text-red-600 text-sm">
                      {passwordForm.formState.errors.currentPassword.message}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register('newPassword')}
                    className={
                      passwordForm.formState.errors.newPassword
                        ? 'border-red-600'
                        : ''
                    }
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <span className="text-red-600 text-sm">
                      {passwordForm.formState.errors.newPassword.message}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    className={
                      passwordForm.formState.errors.confirmPassword
                        ? 'border-red-600'
                        : ''
                    }
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <span className="text-red-600 text-sm">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>Changing...</span>
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Linked Accounts</CardTitle>
              <CardDescription>
                Manage your connected social accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Connected Accounts</h4>
                {loadingAccounts ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : accounts.length > 0 ? (
                  accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="capitalize">{account.providerId}</span>
                        <span className="text-sm text-muted-foreground">
                          {account.providerAccountId}
                        </span>
                      </div>
                      {accounts.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUnlinkAccount(account.providerId)
                          }
                        >
                          Unlink
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No linked accounts</p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Link New Account</h4>
                {!accounts.some((acc) => acc.providerId === 'google') && (
                  <Button
                    variant="outline"
                    onClick={() => handleLinkSocial('google')}
                    className="w-full justify-start"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Link Google Account
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions. Please be careful.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleDeleteAccount}
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

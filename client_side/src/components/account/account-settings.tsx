import { useEffect, useMemo, useState } from 'react';
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
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'account.validators.name_min'),
  image: z
    .string()
    .url('account.validators.image_url')
    .optional()
    .or(z.literal('')),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email('account.validators.email_invalid'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'account.validators.current_required'),
    newPassword: z.string().min(8, 'account.validators.password_min'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'account.validators.passwords_mismatch',
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileDefaults = useMemo(
    () => ({
      name: user?.name ?? '',
      image: user?.image ?? '',
    }),
    [user?.name, user?.image],
  );

  const profileForm = useForm<UpdateProfileFields>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: profileDefaults,
  });

  useEffect(() => {
    profileForm.reset(profileDefaults);
  }, [profileDefaults, profileForm]);

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

      if (user) {
        const nextUser: User = {
          ...user,
          name: data.name,
          image: data.image || user.image || '',
        };
        localStorage.setItem('authUser', JSON.stringify(nextUser));
        setUser(nextUser);
      }

      toast({
        type: 'success',
        title: t('account.profile.updated_toast_title'),
        description: t('account.profile.updated_toast_desc'),
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: t('account.profile.error_toast_title'),
        description: error?.message ?? t('account.profile.error_update_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeEmail = async (data: ChangeEmailFields) => {
    setIsSubmitting(true);
    try {
      const res: unknown = await changeEmailApi({
        newEmail: data.newEmail,
        callbackURL: '/account-settings',
      });

      // Normalize: extract status/code/message from common shapes
      const status =
        (res as any)?.status ??
        (res as any)?.response?.status ??
        (res as any)?.data?.status;

      const code =
        (res as any)?.code ??
        (res as any)?.error?.code ??
        (res as any)?.data?.code;

      const message =
        (res as any)?.message ??
        (res as any)?.error?.message ??
        (res as any)?.data?.message;

      // If server reported an error or an HTTP error, treat as failure
      if (code || (typeof status === 'number' && status >= 400)) {
        const friendly =
          message ||
          (code === 'EMAIL_SAME'
            ? 'Email is the same'
            : code === 'EMAIL_EXISTS'
              ? 'Email already exists'
              : t('account.email.error_change_desc'));
        const err = Object.assign(new Error(friendly), { code, status });
        throw err;
      }

      // Some wrappers use { ok: boolean }
      if ((res as any)?.ok === false) {
        throw new Error(t('account.email.error_change_desc'));
      }

      // Success
      toast({
        type: 'success',
        title: t('account.email.sent_toast_title'),
        description: t('account.email.sent_toast_desc'),
      });
      emailForm.reset();
    } catch (error: any) {
      const code =
        error?.code ?? error?.response?.data?.code ?? error?.data?.code;

      const msg =
        error?.message ||
        (code === 'EMAIL_IS_THE_SAME'
          ? 'Email is the same'
          : code === 'COULDNT_UPDATE_YOUR_EMAIL'
            ? 'Email already exists'
            : t('account.email.error_change_desc'));

      toast({
        type: 'error',
        title: t('account.profile.error_toast_title'),
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  type ApiErrorShape = { code?: string; message?: string; status?: number };

  const onChangePassword = async (data: ChangePasswordFields) => {
    setIsSubmitting(true);
    try {
      const res: unknown = await changePasswordApi({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword,
        revokeOtherSessions: true,
      });

      const status =
        (res as any)?.status ??
        (res as any)?.response?.status ??
        (res as any)?.data?.status;

      const code =
        (res as any)?.code ??
        (res as any)?.error?.code ??
        (res as any)?.data?.code;

      const message =
        (res as any)?.message ??
        (res as any)?.error?.message ??
        (res as any)?.data?.message;

      if (code || (typeof status === 'number' && status >= 400)) {
        const friendly =
          code === 'INVALID_PASSWORD'
            ? t('account.password.invalid_current')
            : message || t('account.password.error_change_desc');
        const err: ApiErrorShape & Error = Object.assign(new Error(friendly), {
          code,
          status,
        });
        throw err;
      }

      if ((res as any)?.ok === false) {
        throw new Error(t('account.password.error_change_desc'));
      }

      toast({
        type: 'success',
        title: t('account.password.changed_toast_title'),
        description: t('account.password.changed_toast_desc'),
      });

      passwordForm.reset();
      try {
        localStorage.removeItem('authUser');
      } catch {}
      try {
        setUser?.(null as any);
      } catch {}

      navigate({ to: '/login' });
    } catch (error: any) {
      const code =
        error?.code ?? error?.response?.data?.code ?? error?.data?.code;

      const message =
        code === 'INVALID_PASSWORD'
          ? t('account.password.invalid_current')
          : error?.message || t('account.password.error_change_desc');

      toast({
        type: 'error',
        title: t('account.profile.error_toast_title'),
        description: message,
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
        title: t('account.profile.error_toast_title'),
        description:
          error?.message ??
          t('account.linked_accounts.link_error_desc', { provider }),
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
        title: t('account.linked_accounts.unlink_success_title'),
        description: t('account.linked_accounts.unlink_success_desc', {
          provider: providerId,
        }),
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: t('account.profile.error_toast_title'),
        description:
          error?.message ??
          t('account.linked_accounts.unlink_error_desc', {
            provider: providerId,
          }),
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserApi();
      toast({
        type: 'success',
        title: t('account.danger.deleted_toast_title'),
        description: t('account.danger.deleted_toast_desc'),
      });
      navigate({ to: '/login' });
    } catch (error: any) {
      toast({
        type: 'error',
        title: t('account.profile.error_toast_title'),
        description: error?.message ?? t('account.danger.delete_error_desc'),
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('account.title')}</h1>
        <p className="text-muted-foreground">{t('account.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">{t('account.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="security">
            {t('account.tabs.security')}
          </TabsTrigger>
          <TabsTrigger value="danger">{t('account.tabs.danger')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('account.profile.card_title')}</CardTitle>
              <CardDescription>
                {t('account.profile.card_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit(onUpdateProfile)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="name">{t('account.profile.name')}</Label>
                  <Input
                    id="name"
                    {...profileForm.register('name')}
                    className={
                      profileForm.formState.errors.name ? 'border-red-600' : ''
                    }
                  />
                  {profileForm.formState.errors.name && (
                    <span className="text-red-600 text-sm">
                      {t(profileForm.formState.errors.name.message as any)}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">{t('account.profile.email')}</Label>
                  <Input id="email" value={user?.email ?? ''} disabled />
                  <p className="text-[12px] text-amber-600">
                    {t('account.profile.email_hint')}
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>{t('account.profile.updating')}</span>
                    </>
                  ) : (
                    t('account.profile.update_btn')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('account.email.card_title')}</CardTitle>
              <CardDescription>{t('account.email.card_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={emailForm.handleSubmit(onChangeEmail)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="newEmail">
                    {t('account.email.new_email')}
                  </Label>
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
                      {t(emailForm.formState.errors.newEmail.message as any)}
                    </span>
                  )}
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>{t('account.email.sending')}</span>
                    </>
                  ) : (
                    t('account.email.change_btn')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('account.password.card_title')}</CardTitle>
              <CardDescription>
                {t('account.password.card_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit(onChangePassword)}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="currentPassword">
                    {t('account.password.current')}
                  </Label>
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
                      {t(
                        passwordForm.formState.errors.currentPassword
                          .message as any,
                      )}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="newPassword">
                    {t('account.password.new')}
                  </Label>
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
                      {t(
                        passwordForm.formState.errors.newPassword
                          .message as any,
                      )}
                    </span>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">
                    {t('account.password.confirm')}
                  </Label>
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
                      {t(
                        passwordForm.formState.errors.confirmPassword
                          .message as any,
                      )}
                    </span>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>{t('account.password.changing')}</span>
                    </>
                  ) : (
                    t('account.password.change_btn')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>{t('account.linked_accounts.card_title')}</CardTitle>
              <CardDescription>
                {t('account.linked_accounts.card_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">
                  {t('account.linked_accounts.connected_heading')}
                </h4>
                {loadingAccounts ? (
                  <p className="text-muted-foreground">
                    {t('account.linked_accounts.loading')}
                  </p>
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
                          {t('account.linked_accounts.unlink')}
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    {t('account.linked_accounts.none')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">
                  {t('account.linked_accounts.link_new_heading')}
                </h4>
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
                    {t('account.linked_accounts.link_google')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">
                {t('account.danger.title')}
              </CardTitle>
              <CardDescription>{t('account.danger.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost">
                    {t('account.danger.delete_btn')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('account.danger.dialog_title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('account.danger.dialog_desc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t('account.danger.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleDeleteAccount}
                    >
                      {t('account.danger.confirm_delete')}
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

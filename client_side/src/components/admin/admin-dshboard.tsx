// src/components/admin/admin-dashboard.tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  DollarSign,
  AlertCircle,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Loader } from '@/components/loader';
import {
  getDashboardStats,
  getUsers,
  activateSubscription,
  deactivateSubscription,
} from '@/api/admin';

export function AdminDashboard() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ Query for dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getDashboardStats,
    staleTime: 30000,
    retry: 1,
  });

  // ✅ Query for users list
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ['admin-users', page, limit, search, statusFilter],
    queryFn: () =>
      getUsers({
        page,
        limit,
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }),
    staleTime: 10000,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  // ✅ Mutation for activating subscription
  const activateMutation = useMutation({
    mutationFn: ({ userId, years }: { userId: string; years: number }) =>
      activateSubscription(userId, years),
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Success',
        description: 'Subscription activated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to activate subscription';
      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  // ✅ Mutation for deactivating subscription
  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => deactivateSubscription(userId),
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Success',
        description: 'Subscription deactivated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to deactivate subscription';
      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  // Handle errors
  if (statsError || usersError) {
    const error = statsError || usersError;
    const axiosError = error as any;

    if (
      axiosError?.response?.status === 401 ||
      axiosError?.response?.status === 403
    ) {
      navigate({ to: '/login' });
      return null;
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleActivate = (userId: string, years: number = 1) => {
    activateMutation.mutate({ userId, years });
  };

  const handleDeactivate = (userId: string) => {
    deactivateMutation.mutate(userId);
  };

  const users = usersData?.data || [];
  const total = usersData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const loading = statsLoading || usersLoading;

  if (loading && !users.length && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <Badge variant="default" className="text-sm w-fit">
              🛡️ Super Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ... all your stat cards ... */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.users?.totalUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered accounts
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Active Subscriptions
                </CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.users?.activeSubscriptions || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Expiring Soon
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.subscriptions?.expiringSoon || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Within 30 days
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats?.revenue?.totalRevenue?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.revenue?.totalRentals || 0} rentals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Users Management Card */}
          <Card className="mb-6">
            {/* Header with Search */}
            <CardHeader className="border-b">
              <div className="flex flex-col lg:flex-row gap-4 justify-between">
                <CardTitle className="text-xl">User Management</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            {/* User List */}
            <CardContent className="p-4">
              {usersLoading && !users.length ? (
                <div className="flex justify-center py-12">
                  <Loader />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No users found
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-base truncate">
                            {user.name}
                          </div>
                          {user.role === 'super_admin' && (
                            <Badge variant="secondary" className="text-xs">
                              🛡️ Admin
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge
                            variant={
                              user.subscriptionStatus === 'active'
                                ? 'default'
                                : user.subscriptionStatus === 'expired'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {user.subscriptionStatus}
                          </Badge>
                          {user.subscriptionEndDate && (
                            <span className="text-xs text-muted-foreground">
                              {user.daysRemaining > 0
                                ? `${user.daysRemaining} days left`
                                : 'Expired'}
                            </span>
                          )}
                          {user.needsRenewal && (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-600"
                            >
                              ⚠️ Needs Renewal
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {user.subscriptionStatus !== 'active' ? (
                          <Button
                            size="sm"
                            onClick={() => handleActivate(user.id)}
                            disabled={
                              activateMutation.isPending &&
                              activateMutation.variables?.userId === user.id
                            }
                            className="min-w-[100px]"
                          >
                            {activateMutation.isPending &&
                            activateMutation.variables?.userId === user.id ? (
                              <Loader className="h-4 w-4" />
                            ) : (
                              'Activate'
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(user.id)}
                            disabled={
                              deactivateMutation.isPending &&
                              deactivateMutation.variables === user.id
                            }
                            className="min-w-[100px]"
                          >
                            {deactivateMutation.isPending &&
                            deactivateMutation.variables === user.id ? (
                              <Loader className="h-4 w-4" />
                            ) : (
                              'Deactivate'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1} to{' '}
                      {Math.min(page * limit, total)} of {total} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || usersLoading}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center px-3 text-sm font-medium">
                        Page {page} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages || usersLoading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

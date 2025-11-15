// src/components/admin/admin-dashboard.tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
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
  Loader2,
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getDashboardStats,
    staleTime: 30000,
  });

  // Infinite query for users
  const {
    data: usersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: usersLoading,
  } = useInfiniteQuery({
    queryKey: ['admin-users', search, statusFilter],
    queryFn: ({ pageParam = 1 }) =>
      getUsers({
        page: pageParam,
        limit: 10,
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  // Mutations
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
      toast({
        type: 'error',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to activate',
      });
    },
  });

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
      toast({
        type: 'error',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to deactivate',
      });
    },
  });

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const allUsers = usersData?.pages.flatMap((page) => page.data) || [];
  const loading = statsLoading || usersLoading;

  if (loading && allUsers.length === 0 && !stats) {
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  Subscription Revenue
                </CardTitle>
                <div className="text-muted-foreground">MAD</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.revenue?.totalRevenue?.toLocaleString() || 0}{' '}
                  {stats?.revenue?.currency || 'MAD'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.revenue?.activeSubscriptions || 0} active ×{' '}
                  {stats?.revenue?.pricePerSubscription || 1500} MAD
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Users Management */}
          <Card>
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

            <CardContent className="p-4">
              {usersLoading && allUsers.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader />
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No users found
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {allUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-all"
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold truncate">
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
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={
                                user.subscriptionStatus === 'active'
                                  ? 'default'
                                  : user.subscriptionStatus === 'expired'
                                    ? 'destructive'
                                    : 'secondary'
                              }
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
                                className="text-yellow-600"
                              >
                                ⚠️ Renewal
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {user.subscriptionStatus !== 'active' ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                activateMutation.mutate({
                                  userId: user.id,
                                  years: 1,
                                })
                              }
                              disabled={
                                activateMutation.isPending &&
                                activateMutation.variables?.userId === user.id
                              }
                            >
                              {activateMutation.isPending &&
                              activateMutation.variables?.userId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Activate'
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateMutation.mutate(user.id)}
                              disabled={
                                deactivateMutation.isPending &&
                                deactivateMutation.variables === user.id
                              }
                            >
                              {deactivateMutation.isPending &&
                              deactivateMutation.variables === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Deactivate'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasNextPage && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

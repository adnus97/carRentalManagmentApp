// src/components/notifications/NotificationSummary.tsx
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useNotificationSummary } from '../../hooks/useNotifications';
import { getCategoryIcon, CATEGORY_COLORS } from '../../utils/notifications';
import { NotificationCategory } from '../../types/notifications';

export function NotificationSummary() {
  const { data: summary, isLoading } = useNotificationSummary();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const categoryEntries = Object.entries(summary.byCategory) as [
    NotificationCategory,
    number,
  ][];
  const priorityEntries = Object.entries(summary.byPriority);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Notifications
          <Badge variant={summary.unread > 0 ? 'destructive' : 'secondary'}>
            {summary.unread} unread
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Categories */}
        <div>
          <h4 className="text-sm font-medium mb-2">By Category</h4>
          <div className="space-y-1">
            {categoryEntries
              .filter(([_, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const Icon = getCategoryIcon(category);
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={CATEGORY_COLORS[category]} />
                      <span className="capitalize">
                        {category.toLowerCase()}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Priorities */}
        {priorityEntries.some(([_, count]) => Number(count) > 0) && (
          <div>
            <h4 className="text-sm font-medium mb-2">By Priority</h4>
            <div className="space-y-1">
              {priorityEntries
                .filter(([_, count]) => Number(count) > 0)
                .sort(([a], [b]) => {
                  const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                  return (
                    (order[a as keyof typeof order] || 4) -
                    (order[b as keyof typeof order] || 4)
                  );
                })
                .map(([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{priority.toLowerCase()}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        priority === 'URGENT'
                          ? 'border-red-500 text-red-700'
                          : priority === 'HIGH'
                            ? 'border-orange-500 text-orange-700'
                            : 'border-gray-500 text-gray-700'
                      }`}
                    >
                      {count}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t text-xs text-gray-500">
          Total: {summary.total} notifications
        </div>
      </CardContent>
    </Card>
  );
}

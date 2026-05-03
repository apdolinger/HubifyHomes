import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckSquare } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { format } from 'date-fns';

interface PortalTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  propertyId: number | null;
  propertyName: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'outline',
};

export default function MyTasks() {
  const { token, user } = usePortalAuth();
  const { data, isLoading } = useQuery<PortalTask[]>({
    queryKey: ['/api/portal/tasks', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load tasks');
      return res.json();
    },
    enabled: !!token && !!user?.id,
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="empty-tasks">
        <CardContent className="py-10 text-center text-muted-foreground">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tasks at your properties right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {data.map((t) => {
          const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'cancelled';
          return (
            <div key={t.id} className="p-4 flex items-center justify-between gap-4" data-testid={`task-${t.id}`}>
              <div className="min-w-0">
                <p className="font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.propertyName || 'Unknown property'}
                  {t.dueDate ? ` • Due ${format(new Date(t.dueDate), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {overdue && <Badge variant="destructive">Overdue</Badge>}
                <Badge variant={STATUS_VARIANT[t.status] || 'secondary'} className="capitalize">
                  {t.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

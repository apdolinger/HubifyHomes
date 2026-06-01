import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, FileText } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { format } from 'date-fns';

interface PortalInspection {
  id: number;
  title: string;
  status: string;
  completedAt: string | null;
  dueDate: string | null;
  propertyId: number | null;
  propertyName: string | null;
}

export default function MyInspections() {
  const { token, user } = usePortalAuth();

  const { data, isLoading } = useQuery<PortalInspection[]>({
    queryKey: ['/api/portal/inspections', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/inspections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load inspections');
      return res.json();
    },
    enabled: !!token && !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="empty-inspections">
        <CardContent className="py-10 text-center text-muted-foreground">
          <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No completed inspection reports yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {data.map((inspection) => (
          <div
            key={inspection.id}
            className="p-4 flex items-center justify-between gap-4"
            data-testid={`inspection-${inspection.id}`}
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{inspection.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {inspection.propertyName || 'Unknown property'}
                {inspection.completedAt
                  ? ` • Completed ${format(new Date(inspection.completedAt), 'MMM d, yyyy')}`
                  : inspection.dueDate
                  ? ` • ${format(new Date(inspection.dueDate), 'MMM d, yyyy')}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700 dark:text-green-400">
                Completed
              </Badge>
              <Link href={`/portal/inspections/${inspection.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  View Report
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

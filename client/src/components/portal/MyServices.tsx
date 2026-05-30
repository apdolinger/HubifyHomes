import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { format } from 'date-fns';

interface PortalService {
  id: number;
  propertyId: number | null;
  propertyName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  customPriceCents: number | null;
  billingFrequencyOverride: string | null;
  serviceName: string | null;
  serviceCategory: string | null;
  serviceDefaultPriceCents: number | null;
  serviceBillingFrequency: string | null;
}

function formatCents(cents: number | null): string {
  if (cents == null) return '';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatFrequency(freq: string | null): string {
  if (!freq) return '';
  return freq.charAt(0).toUpperCase() + freq.slice(1).toLowerCase().replace(/_/g, ' ');
}

export default function MyServices() {
  const { token, user } = usePortalAuth();
  const { data, isLoading } = useQuery<PortalService[]>({
    queryKey: ['/api/portal/services', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/services', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load services');
      return res.json();
    },
    enabled: !!token && !!user?.id,
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="empty-services">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No active services across your properties.</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = data.reduce<Record<string, PortalService[]>>((acc, svc) => {
    const key = svc.propertyName ?? 'Unknown property';
    if (!acc[key]) acc[key] = [];
    acc[key].push(svc);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="my-services">
      {Object.entries(grouped).map(([propertyName, services]) => (
        <div key={propertyName}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {propertyName}
          </h3>
          <Card>
            <CardContent className="p-0 divide-y">
              {services.map((svc) => {
                const priceCents = svc.customPriceCents ?? svc.serviceDefaultPriceCents;
                const freq = svc.billingFrequencyOverride ?? svc.serviceBillingFrequency;
                return (
                  <div
                    key={svc.id}
                    className="p-4 flex items-center justify-between gap-4"
                    data-testid={`service-${svc.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{svc.serviceName ?? 'Unnamed service'}</p>
                      <p className="text-xs text-muted-foreground">
                        {svc.serviceCategory ? `${svc.serviceCategory}` : ''}
                        {svc.startDate
                          ? ` • Started ${format(new Date(svc.startDate), 'MMM d, yyyy')}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      {priceCents != null && (
                        <span className="text-sm font-medium">
                          {formatCents(priceCents)}
                          {freq ? `/${formatFrequency(freq)}` : ''}
                        </span>
                      )}
                      <Badge variant="secondary" className="capitalize">
                        {svc.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

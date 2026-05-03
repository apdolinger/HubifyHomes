import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';

interface PortalProperty {
  id: number;
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  type: string;
  imageUrl: string | null;
}

export default function MyProperties() {
  const { token } = usePortalAuth();
  const { data, isLoading } = useQuery<PortalProperty[]>({
    queryKey: ['/api/portal/properties'],
    queryFn: async () => {
      const res = await fetch('/api/portal/properties', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load properties');
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="empty-properties">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No properties are linked to your account yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <Card key={p.id} data-testid={`property-${p.id}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{p.name}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div>{p.address1}{p.address2 ? `, ${p.address2}` : ''}</div>
                <div>{p.city}, {p.state} {p.zip}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 capitalize">{p.type.replace(/[-_]/g, ' ')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

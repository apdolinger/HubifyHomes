import { useEffect } from 'react';
import { useLocation, useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, MapPin, Loader2, Wrench } from 'lucide-react';

interface PortalProperty {
  id: number;
  name: string;
  type: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  units: number | null;
  squareFootage: number | null;
  description: string | null;
  imageUrl: string | null;
}

interface PortalService {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  customPriceCents: number | null;
  billingFrequencyOverride: string | null;
  serviceName: string;
  serviceCategory: string | null;
  serviceDefaultPriceCents: number | null;
  serviceBillingFrequency: string | null;
}

function formatCents(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatFrequency(freq: string | null | undefined): string {
  if (!freq) return '';
  return freq.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PortalPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isLoading: authLoading } = usePortalAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation('/portal/login');
  }, [user, authLoading, setLocation]);

  const { data, isLoading, isError } = useQuery<PortalProperty>({
    queryKey: ['/api/portal/properties', user?.id, id],
    queryFn: async () => {
      const res = await fetch(`/api/portal/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load property');
      return res.json();
    },
    enabled: !!token && !!user?.id && !!id,
  });

  const { data: services, isLoading: servicesLoading } = useQuery<PortalService[]>({
    queryKey: ['/api/portal/properties', user?.id, id, 'services'],
    queryFn: async () => {
      const res = await fetch(`/api/portal/properties/${id}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load services');
      return res.json();
    },
    enabled: !!token && !!user?.id && !!id,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2">
          <Link href="/portal">
            <Button variant="ghost" size="sm" data-testid="back-to-portal">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Property details</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError || !data ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              We couldn't find that property.
            </CardContent>
          </Card>
        ) : (
          <Card data-testid={`property-detail-${data.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{data.name}</CardTitle>
                  {data.type && (
                    <p className="text-sm text-muted-foreground capitalize mt-1">
                      {data.type.replace(/[-_]/g, ' ')}
                    </p>
                  )}
                </div>
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div>{data.address1}{data.address2 ? `, ${data.address2}` : ''}</div>
                  <div className="text-muted-foreground">{data.city}, {data.state} {data.zip}</div>
                </div>
              </div>
              {(data.units || data.squareFootage) && (
                <div className="flex flex-wrap gap-6 text-sm">
                  {data.units != null && (
                    <div><span className="text-muted-foreground">Units: </span>{data.units}</div>
                  )}
                  {data.squareFootage != null && (
                    <div><span className="text-muted-foreground">Sq ft: </span>{data.squareFootage.toLocaleString()}</div>
                  )}
                </div>
              )}
              {data.description && (
                <p className="text-sm leading-relaxed">{data.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Services section */}
        <Card data-testid="portal-property-services">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Services</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !services || services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active services assigned to this property.</p>
            ) : (
              <ul className="divide-y" data-testid="services-list">
                {services.map((svc) => {
                  const price = svc.customPriceCents ?? svc.serviceDefaultPriceCents;
                  const freq = svc.billingFrequencyOverride ?? svc.serviceBillingFrequency;
                  return (
                    <li key={svc.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{svc.serviceName}</p>
                        {svc.serviceCategory && (
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">
                            {svc.serviceCategory.replace(/[-_]/g, ' ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        {price != null && (
                          <div className="text-sm">
                            <span className="font-medium">{formatCents(price)}</span>
                            {freq && (
                              <span className="text-muted-foreground text-xs ml-1">/ {formatFrequency(freq)}</span>
                            )}
                          </div>
                        )}
                        <Badge variant="secondary" className="capitalize text-xs">
                          {svc.status}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

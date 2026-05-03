import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, ExternalLink } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { format } from 'date-fns';

interface PortalInvoice {
  id: string;
  invoiceNumber: string | null;
  amountCents: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  sentAt: string | null;
  description: string | null;
  hostedInvoiceUrl: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  open: 'secondary',
  void: 'outline',
  uncollectible: 'destructive',
};

function fmtMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function MyInvoices() {
  const { token } = usePortalAuth();
  const { data, isLoading } = useQuery<PortalInvoice[]>({
    queryKey: ['/api/portal/invoices'],
    queryFn: async () => {
      const res = await fetch('/api/portal/invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load invoices');
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!data || data.length === 0) {
    return (
      <Card data-testid="empty-invoices">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>You don't have any invoices yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {data.map((inv) => {
          const overdue = inv.status === 'open' && inv.dueDate && new Date(inv.dueDate) < new Date();
          return (
            <div key={inv.id} className="p-4 flex items-center justify-between gap-4" data-testid={`invoice-${inv.invoiceNumber || inv.id}`}>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {inv.invoiceNumber || `Invoice ${inv.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {inv.description || 'Invoice'}
                  {inv.dueDate ? ` • Due ${format(new Date(inv.dueDate), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold">{fmtMoney(inv.amountCents, inv.currency)}</span>
                {overdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant={STATUS_VARIANT[inv.status] || 'secondary'} className="capitalize">
                    {inv.status}
                  </Badge>
                )}
                {inv.hostedInvoiceUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                      View <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

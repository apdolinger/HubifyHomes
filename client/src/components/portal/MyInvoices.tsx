import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Receipt, ExternalLink, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { useToast } from '@/hooks/use-toast';
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

interface PayIntentResponse {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
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

function isPayable(inv: PortalInvoice) {
  return inv.status === 'open' && inv.paymentStatus !== 'succeeded';
}

function PayNowForm({
  invoice,
  onPaid,
  onCancel,
}: {
  invoice: PortalInvoice;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/portal?paid=${invoice.id}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        const msg = error.message || 'Payment failed. Please check your card details and try again.';
        setErrorMessage(msg);
        toast({ title: 'Payment failed', description: msg, variant: 'destructive' });
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        toast({ title: 'Payment successful', description: 'Your invoice has been paid.' });
        onPaid();
      } else if (paymentIntent?.status === 'processing') {
        toast({
          title: 'Payment processing',
          description: 'Your payment is processing. We will update the invoice once it clears.',
        });
        onPaid();
      } else {
        const msg = `Payment status: ${paymentIntent?.status || 'unknown'}`;
        setErrorMessage(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error while processing payment.';
      setErrorMessage(msg);
      toast({ title: 'Payment error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-pay-invoice">
      <PaymentElement />
      {errorMessage && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
          data-testid="text-pay-error"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || submitting} data-testid="button-confirm-pay">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? 'Processing…' : `Pay ${fmtMoney(invoice.amountCents, invoice.currency)}`}
        </Button>
      </div>
    </form>
  );
}

function PayInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onPaid,
}: {
  invoice: PortalInvoice;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPaid: () => void;
}) {
  const { token } = usePortalAuth();
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: payIntent, isLoading } = useQuery<PayIntentResponse>({
    queryKey: ['/api/portal/invoices', invoice.id, 'pay-intent'],
    queryFn: async () => {
      setLoadError(null);
      const res = await fetch(`/api/portal/invoices/${invoice.id}/pay-intent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.message || 'Failed to start payment';
        setLoadError(msg);
        throw new Error(msg);
      }
      return res.json();
    },
    enabled: open && !!token,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const stripePromise = useMemo<Promise<StripeJs | null> | null>(() => {
    if (payIntent?.publishableKey) return loadStripe(payIntent.publishableKey);
    return null;
  }, [payIntent?.publishableKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-pay-invoice">
        <DialogHeader>
          <DialogTitle>
            Pay {invoice.invoiceNumber || `Invoice ${invoice.id.slice(0, 8)}`}
          </DialogTitle>
          <DialogDescription>
            {fmtMoney(invoice.amountCents, invoice.currency)}
            {invoice.dueDate ? ` • Due ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {loadError && !isLoading && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
            data-testid="text-pay-load-error"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {!isLoading && !loadError && payIntent?.clientSecret && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: payIntent.clientSecret,
              appearance: { theme: 'stripe' },
            }}
          >
            <PayNowForm
              invoice={invoice}
              onPaid={() => {
                onOpenChange(false);
                onPaid();
              }}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function MyInvoices() {
  const { token, user } = usePortalAuth();
  const queryClient = useQueryClient();
  const [payingInvoice, setPayingInvoice] = useState<PortalInvoice | null>(null);

  const { data, isLoading } = useQuery<PortalInvoice[]>({
    queryKey: ['/api/portal/invoices', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load invoices');
      return res.json();
    },
    enabled: !!token && !!user?.id,
    refetchOnWindowFocus: true,
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

  const handlePaid = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/portal/invoices', user?.id] });
    // Poll briefly for the webhook to flip the row.
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      queryClient.invalidateQueries({ queryKey: ['/api/portal/invoices', user?.id] });
      if (attempts < 8) setTimeout(tick, 1500);
    };
    setTimeout(tick, 1500);
  };

  return (
    <>
      <Card>
        <CardContent className="p-0 divide-y">
          {data.map((inv) => {
            const overdue = inv.status === 'open' && inv.dueDate && new Date(inv.dueDate) < new Date();
            const payable = isPayable(inv);
            return (
              <div
                key={inv.id}
                className="p-4 flex items-center justify-between gap-4"
                data-testid={`invoice-${inv.invoiceNumber || inv.id}`}
              >
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
                  {payable && (
                    <Button
                      size="sm"
                      onClick={() => setPayingInvoice(inv)}
                      data-testid={`button-pay-${inv.invoiceNumber || inv.id}`}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pay Now
                    </Button>
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

      {payingInvoice && (
        <PayInvoiceDialog
          invoice={payingInvoice}
          open={!!payingInvoice}
          onOpenChange={(v) => {
            if (!v) setPayingInvoice(null);
          }}
          onPaid={handlePaid}
        />
      )}
    </>
  );
}

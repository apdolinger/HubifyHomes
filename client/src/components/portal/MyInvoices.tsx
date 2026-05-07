import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Receipt, ExternalLink, CreditCard, Loader2, AlertCircle, Plus, Trash2, CheckCircle2, Building2 } from 'lucide-react';
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
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  receiptUrl: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  sentAt: string | null;
  description: string | null;
  hostedInvoiceUrl: string | null;
}

interface SavedPaymentMethod {
  id: string;
  paymentMethodType: string;
  last4: string | null;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
  bankName: string | null;
  isDefault: boolean;
}

interface PayIntentResponse {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
}

interface SetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
  publishableKey: string;
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

function formatPaymentMethod(pm: SavedPaymentMethod) {
  if (pm.paymentMethodType === 'card') {
    const brand = pm.brand ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) : 'Card';
    const expiry = pm.expMonth && pm.expYear
      ? ` · Expires ${String(pm.expMonth).padStart(2, '0')}/${String(pm.expYear).slice(-2)}`
      : '';
    return `${brand} ···· ${pm.last4}${expiry}`;
  }
  if (pm.paymentMethodType === 'us_bank_account') {
    return `${pm.bankName || 'Bank'} ···· ${pm.last4}`;
  }
  return `···· ${pm.last4}`;
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

function AddCardForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
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
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/portal`,
        },
        redirect: 'if_required',
      });
      if (error) {
        const msg = error.message || 'Failed to save card. Please try again.';
        setErrorMessage(msg);
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Card saved', description: 'Your card has been saved for future payments.' });
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error saving card.';
      setErrorMessage(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-add-card">
      <PaymentElement />
      {errorMessage && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || submitting} data-testid="button-confirm-add-card">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? 'Saving…' : 'Save Card'}
        </Button>
      </div>
    </form>
  );
}

function AddCardDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const { token } = usePortalAuth();
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: setupIntent, isLoading } = useQuery<SetupIntentResponse>({
    queryKey: ['/api/portal/payment-methods/setup-intent', open],
    queryFn: async () => {
      setLoadError(null);
      const res = await fetch('/api/portal/payment-methods/setup-intent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.message || 'Failed to initialize card form';
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
    if (setupIntent?.publishableKey) return loadStripe(setupIntent.publishableKey);
    return null;
  }, [setupIntent?.publishableKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" data-testid="dialog-add-card">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            Save a credit or debit card for one-click invoice payments.
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
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {!isLoading && !loadError && setupIntent?.clientSecret && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: setupIntent.clientSecret,
              appearance: { theme: 'stripe' },
            }}
          >
            <AddCardForm
              onSuccess={() => {
                onOpenChange(false);
                onAdded();
              }}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onPaid,
  savedMethods,
}: {
  invoice: PortalInvoice;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPaid: () => void;
  savedMethods: SavedPaymentMethod[];
}) {
  const { token } = usePortalAuth();
  const { toast } = useToast();
  const defaultMethod = savedMethods.find((m) => m.isDefault) ?? savedMethods[0] ?? null;
  const [useMode, setUseMode] = useState<'saved' | 'new'>(defaultMethod ? 'saved' : 'new');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chargingWithSaved, setChargingWithSaved] = useState(false);

  // Sync useMode when savedMethods arrive after the dialog has already mounted
  // (e.g. methods query resolves after dialog open state is set)
  useEffect(() => {
    if (savedMethods.length > 0 && useMode === 'new') {
      setUseMode('saved');
    }
  }, [savedMethods.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: payIntent, isLoading } = useQuery<PayIntentResponse>({
    queryKey: ['/api/portal/invoices', invoice.id, 'pay-intent', useMode],
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
    enabled: open && !!token && useMode === 'new',
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const stripePromise = useMemo<Promise<StripeJs | null> | null>(() => {
    if (payIntent?.publishableKey) return loadStripe(payIntent.publishableKey);
    return null;
  }, [payIntent?.publishableKey]);

  const handleChargeWithSaved = async () => {
    if (!defaultMethod) return;
    setChargingWithSaved(true);
    try {
      const res = await fetch(`/api/portal/invoices/${invoice.id}/pay-saved`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: defaultMethod.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Payment failed', description: body?.message || 'Could not charge your saved card.', variant: 'destructive' });
        return;
      }
      if (body.status === 'succeeded') {
        toast({ title: 'Payment successful', description: 'Your invoice has been paid.' });
        onOpenChange(false);
        onPaid();
      } else if (body.status === 'processing') {
        toast({ title: 'Payment processing', description: 'Your payment is being processed. We will update the invoice once it clears.' });
        onOpenChange(false);
        onPaid();
      } else if (body.status === 'requires_action') {
        // Off-session charges can't complete 3DS authentication — fall back to new-card flow
        toast({
          title: 'Card requires verification',
          description: 'Your bank requires additional verification. Please enter your card details to complete payment.',
          variant: 'destructive',
        });
        setUseMode('new');
      } else {
        toast({ title: 'Payment initiated', description: 'We will update the invoice status shortly.' });
        onOpenChange(false);
        onPaid();
      }
    } catch (err: any) {
      toast({ title: 'Payment error', description: err?.message || 'Unexpected error.', variant: 'destructive' });
    } finally {
      setChargingWithSaved(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-pay-invoice">
        <DialogHeader>
          <DialogTitle>
            Pay {invoice.invoiceNumber || `Invoice ${invoice.id.slice(0, 8)}`}
          </DialogTitle>
          <DialogDescription>
            {fmtMoney(invoice.amountCents, invoice.currency)}
            {invoice.dueDate ? ` · Due ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Saved card option */}
        {defaultMethod && (
          <div className="space-y-3">
            <div
              className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${useMode === 'saved' ? 'border-primary bg-primary/5' : 'border-border'}`}
              onClick={() => setUseMode('saved')}
              data-testid="option-use-saved-card"
            >
              <div className="flex items-center gap-3">
                {useMode === 'saved'
                  ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium">{formatPaymentMethod(defaultMethod)}</p>
                  {defaultMethod.isDefault && (
                    <p className="text-xs text-muted-foreground">Default card</p>
                  )}
                </div>
              </div>
              {defaultMethod.paymentMethodType === 'card'
                ? <CreditCard className="h-4 w-4 text-muted-foreground" />
                : <Building2 className="h-4 w-4 text-muted-foreground" />
              }
            </div>

            <div
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${useMode === 'new' ? 'border-primary bg-primary/5' : 'border-border'}`}
              onClick={() => setUseMode('new')}
              data-testid="option-use-new-card"
            >
              {useMode === 'new'
                ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground shrink-0" />
              }
              <p className="text-sm font-medium">Use a different card</p>
            </div>
          </div>
        )}

        {/* Pay with saved card */}
        {useMode === 'saved' && defaultMethod && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={chargingWithSaved}>
              Cancel
            </Button>
            <Button
              onClick={handleChargeWithSaved}
              disabled={chargingWithSaved}
              data-testid="button-confirm-pay-saved"
            >
              {chargingWithSaved && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {chargingWithSaved ? 'Processing…' : `Pay ${fmtMoney(invoice.amountCents, invoice.currency)}`}
            </Button>
          </div>
        )}

        {/* Pay with new card (Elements) */}
        {useMode === 'new' && (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodsSection() {
  const { token, user } = usePortalAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: methods, isLoading } = useQuery<SavedPaymentMethod[]>({
    queryKey: ['/api/portal/payment-methods', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load payment methods');
      return res.json();
    },
    enabled: !!token && !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portal/payment-methods/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Failed to remove card');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portal/payment-methods', user?.id] });
      toast({ title: 'Card removed', description: 'Your saved card has been removed.' });
      setDeletingId(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to remove card', variant: 'destructive' });
      setDeletingId(null);
    },
  });

  const methodToDelete = deletingId ? methods?.find((m) => m.id === deletingId) : null;

  return (
    <Card data-testid="section-payment-methods">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Payment Methods</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddCardOpen(true)}
          data-testid="button-add-card"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Card
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && <Skeleton className="h-12 w-full" />}

        {!isLoading && (!methods || methods.length === 0) && (
          <p className="text-sm text-muted-foreground py-2">
            No saved cards yet. Add one for faster invoice payments.
          </p>
        )}

        {!isLoading && methods && methods.length > 0 && (
          <div className="space-y-2">
            {methods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between rounded-lg border p-3"
                data-testid={`payment-method-${pm.id}`}
              >
                <div className="flex items-center gap-3">
                  {pm.paymentMethodType === 'card'
                    ? <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-medium">{formatPaymentMethod(pm)}</p>
                    {pm.isDefault && (
                      <Badge variant="secondary" className="text-xs mt-0.5">Default</Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeletingId(pm.id)}
                  data-testid={`button-remove-card-${pm.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddCardDialog
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        onAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/portal/payment-methods', user?.id] });
          toast({ title: 'Card saved', description: 'Your card is ready for one-click payments.' });
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove card?</AlertDialogTitle>
            <AlertDialogDescription>
              {methodToDelete
                ? `Remove ${formatPaymentMethod(methodToDelete)} from your saved cards?`
                : 'Remove this card from your saved cards?'
              }
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Keep card</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-card"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
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

  const { data: savedMethods } = useQuery<SavedPaymentMethod[]>({
    queryKey: ['/api/portal/payment-methods', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/portal/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !!user?.id,
  });

  const handlePaid = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/portal/invoices', user?.id] });
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      queryClient.invalidateQueries({ queryKey: ['/api/portal/invoices', user?.id] });
      if (attempts < 8) setTimeout(tick, 1500);
    };
    setTimeout(tick, 1500);
  };

  return (
    <div className="space-y-6">
      <PaymentMethodsSection />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.length === 0 ? (
        <Card data-testid="empty-invoices">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>You don't have any invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
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
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {inv.invoiceNumber || `Invoice ${inv.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.description || 'Invoice'}
                      {inv.status === 'paid' && inv.paymentDate
                        ? ` · Paid ${format(new Date(inv.paymentDate), 'MMM d')}`
                        : inv.dueDate
                          ? ` · Due ${format(new Date(inv.dueDate), 'MMM d, yyyy')}`
                          : ''}
                      {inv.status === 'paid'
                        ? inv.paymentMethodBrand && inv.paymentMethodLast4
                          ? ` · ${inv.paymentMethodBrand.charAt(0).toUpperCase() + inv.paymentMethodBrand.slice(1)} \u00B7\u00B7\u00B7\u00B7${inv.paymentMethodLast4}`
                          : inv.paymentMethod
                            ? ` · ${inv.paymentMethod.charAt(0).toUpperCase() + inv.paymentMethod.slice(1)}`
                            : ' · Card on file'
                        : ''}
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
                    {inv.receiptUrl ? (
                      <Button asChild variant="outline" size="sm" data-testid={`button-receipt-${inv.invoiceNumber || inv.id}`}>
                        <a href={inv.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <Receipt className="h-3 w-3 mr-1" />
                          Receipt
                        </a>
                      </Button>
                    ) : inv.status === 'paid' && inv.hostedInvoiceUrl ? (
                      <Button asChild variant="outline" size="sm" data-testid={`button-receipt-${inv.invoiceNumber || inv.id}`}>
                        <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                          <Receipt className="h-3 w-3 mr-1" />
                          Receipt
                        </a>
                      </Button>
                    ) : !inv.receiptUrl && inv.hostedInvoiceUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {payingInvoice && (
        <PayInvoiceDialog
          invoice={payingInvoice}
          open={!!payingInvoice}
          onOpenChange={(v) => {
            if (!v) setPayingInvoice(null);
          }}
          onPaid={handlePaid}
          savedMethods={savedMethods ?? []}
        />
      )}
    </div>
  );
}

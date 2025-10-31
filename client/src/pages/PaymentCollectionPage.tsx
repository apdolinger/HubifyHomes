import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Building2, CheckCircle2 } from 'lucide-react';
import PaymentMethodCollectionModal from '@/components/PaymentMethodCollectionModal';

export default function PaymentCollectionPage() {
  const [, params] = useRoute('/payment-collection/:token');
  const token = params?.token;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentAdded, setPaymentAdded] = useState(false);

  const { data: clientInfo, isLoading, error } = useQuery({
    queryKey: ['/api/payment-collection', token],
    enabled: !!token,
  });

  useEffect(() => {
    if (clientInfo && !paymentAdded) {
      setIsModalOpen(true);
    }
  }, [clientInfo, paymentAdded]);

  const handlePaymentSuccess = () => {
    setPaymentAdded(true);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading payment information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !clientInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <CreditCard className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Invalid Payment Link</CardTitle>
            <CardDescription className="text-base">
              {(error as any)?.message || 'This payment link is invalid, expired, or has already been used.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Please contact your property manager for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentAdded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Method Added</CardTitle>
            <CardDescription className="text-base">
              Your payment information has been securely saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You're all set! You can now close this page.
            </p>
            <p className="text-xs text-muted-foreground">
              Your property manager will use this payment method for future billing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim() || clientInfo.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Add Payment Method</CardTitle>
          <CardDescription className="text-base">
            Securely add your payment information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Account Holder</p>
            <p className="text-base">{clientName}</p>
            {clientInfo.email && (
              <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Click "Add Payment Method" to securely provide your card or bank account information.
            </p>
            <p className="text-xs">
              Your information is encrypted and processed securely through Stripe.
            </p>
          </div>
        </CardContent>
      </Card>

      {clientInfo && token && (
        <PaymentMethodCollectionModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clientId={clientInfo.clientId}
          clientName={clientName}
          onSuccess={handlePaymentSuccess}
          paymentToken={token}
        />
      )}
    </div>
  );
}

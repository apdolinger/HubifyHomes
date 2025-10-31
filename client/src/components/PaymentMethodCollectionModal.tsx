import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Building2 } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentMethodCollectionModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

interface SetupIntentResponse {
  clientSecret: string;
  publishableKey: string;
}

function PaymentMethodForm({ 
  clientId, 
  onSuccess, 
  paymentMethodType 
}: { 
  clientId: string; 
  onSuccess: () => void;
  paymentMethodType: 'card' | 'us_bank_account';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing/payment-methods/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to add payment method",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment method added successfully",
        });
        onSuccess();
      }
    } catch (err) {
      console.error("Error confirming setup:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          data-testid="button-confirm-payment-method"
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isProcessing ? "Processing..." : "Add Payment Method"}
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodCollectionModal({
  open,
  onClose,
  clientId,
  clientName,
}: PaymentMethodCollectionModalProps) {
  const { toast } = useToast();
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'us_bank_account'>('card');

  // Create setup intent when modal opens
  const { data: setupIntent, isLoading: isLoadingSetupIntent } = useQuery<SetupIntentResponse>({
    queryKey: ['/api/clients', clientId, 'setup-intent', paymentMethodType],
    queryFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/clients/${clientId}/setup-intent`,
        { 
          paymentMethodTypes: paymentMethodType === 'card' ? ['card'] : ['us_bank_account'] 
        }
      );
      return response.json() as Promise<SetupIntentResponse>;
    },
    enabled: open,
  });

  const handleSuccess = () => {
    // Invalidate payment methods cache
    queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'payment-methods'] });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-payment-method-collection">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a payment method for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Method Type Selector */}
          <div className="space-y-2">
            <Label>Payment Method Type</Label>
            <RadioGroup
              value={paymentMethodType}
              onValueChange={(value) => setPaymentMethodType(value as 'card' | 'us_bank_account')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" data-testid="radio-card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Credit/Debit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="us_bank_account" id="bank" data-testid="radio-bank" />
                <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Bank Account (ACH)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Stripe Elements Form */}
          {isLoadingSetupIntent ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : setupIntent?.clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupIntent.clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#0070f3',
                  },
                },
              }}
            >
              <PaymentMethodForm
                clientId={clientId}
                onSuccess={handleSuccess}
                paymentMethodType={paymentMethodType}
              />
            </Elements>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to initialize payment form. Please try again.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

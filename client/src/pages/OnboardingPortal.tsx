import { useState, useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, Clock, AlertTriangle, Loader2, Lock,
  ShieldCheck, CreditCard, ArrowRight, RefreshCw, XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingDetails {
  alreadySigned: boolean;
  agreementSignedAt?: string;
  agreementSignerName?: string;
  stage?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  estimatedHomes?: number;
  teamSize?: number;
  portfolioTier?: string;
  originalMonthlyPrice?: number;
  discountPercentage?: number;
  discountedMonthlyPrice?: number;
  setupFee?: number;
  betaCohortNumber?: number;
  agreementStatus?: string;
  paymentStatus?: string | null;
  paymentCompletedAt?: string | null;
}

// ── Form schema ───────────────────────────────────────────────────────────────

const agreementSchema = z.object({
  agreeToBetaAgreement: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Hubify Homes Beta Agreement" }),
  }),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms of Service" }),
  }),
  agreeToPrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Privacy Policy" }),
  }),
  signerName: z.string().min(1, "Authorized signer name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
});
type AgreementForm = z.infer<typeof agreementSchema>;

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Agreement" },
  { n: 2, label: "Payment Setup" },
  { n: 3, label: "Initialization" },
  { n: 4, label: "Welcome" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {STEPS.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                step.n < current
                  ? "bg-teal-600 border-teal-600 text-white"
                  : step.n === current
                  ? "bg-white border-teal-600 text-teal-700"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              {step.n < current ? <CheckCircle className="w-4 h-4" /> : step.n}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                step.n === current ? "text-teal-700" : step.n < current ? "text-teal-600" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-0.5 mb-5 mx-1 ${step.n < current ? "bg-teal-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Table row helper ──────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-slate-500 text-sm align-top w-52">{label}</td>
      <td className={`py-2.5 text-sm font-medium ${accent ? "text-teal-700" : "text-slate-800"} align-top`}>{value}</td>
    </tr>
  );
}

function fmt(n?: number | null) {
  return n != null ? `$${n.toFixed(2)}` : "—";
}

// ── Error states ──────────────────────────────────────────────────────────────

function TokenError({ status, message }: { status: number; message: string }) {
  const icon =
    status === 410 ? <Clock className="w-10 h-10 text-amber-400" /> :
    <AlertTriangle className="w-10 h-10 text-red-400" />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-10 text-center">
        <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-8" />
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-slate-900 mb-3">
          {status === 410 ? "Link Expired" : "Invalid Link"}
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        <p className="mt-4 text-slate-500 text-xs">
          Need help?{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Step 1: Agreement form ─────────────────────────────────────────────────────

function AgreementStep({ data, token, onSigned }: {
  data: OnboardingDetails;
  token: string;
  onSigned: (name: string) => void;
}) {
  const { toast } = useToast();
  const form = useForm<AgreementForm>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      signerName: "",
      organizationName: data.company ?? "",
      agreeToBetaAgreement: undefined as any,
      agreeToTerms: undefined as any,
      agreeToPrivacy: undefined as any,
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (values: AgreementForm) => {
      const res = await fetch(`/api/public/onboarding/${token}/accept-agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Failed to submit agreement.");
      return body;
    },
    onSuccess: (_data, values) => onSigned(values.signerName),
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const displayName = data.firstName && data.lastName
    ? `${data.firstName} ${data.lastName}`
    : data.name ?? "—";

  return (
    <>
      {/* Membership details card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Your Beta Membership</p>
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Contact Name" value={displayName} />
            <Row label="Email" value={data.email ?? "—"} />
            {data.phone && <Row label="Phone" value={data.phone} />}
            <Row label="Company Name" value={data.company ?? "—"} />
            {data.estimatedHomes != null && <Row label="Properties Managed" value={data.estimatedHomes.toLocaleString()} />}
            {data.teamSize != null && <Row label="Staff Users Expected" value={data.teamSize.toLocaleString()} />}
            <Row label="Portfolio Tier" value={data.portfolioTier ?? "—"} />
            <Row label="Beta Cohort" value={data.betaCohortNumber != null ? `Member #${data.betaCohortNumber}` : "—"} />
            <Row label="Agreement Status" value={
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                <Clock className="w-3 h-3" />
                Pending Signature
              </span>
            } />
          </tbody>
        </table>
      </div>

      {/* Pricing card */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Beta Pricing</p>
        <table className="w-full border-collapse">
          <tbody>
            {data.originalMonthlyPrice != null && (
              <Row label="List Price" value={
                <span className="line-through text-slate-400">{fmt(data.originalMonthlyPrice)}/mo</span>
              } />
            )}
            {data.discountPercentage != null && (
              <Row label="Beta Discount" value={
                <span className="text-teal-700 font-semibold">{data.discountPercentage}% off — locked for life</span>
              } accent />
            )}
            {data.discountedMonthlyPrice != null && (
              <Row label="Your Monthly Price" value={
                <span className="text-2xl font-bold text-slate-900">
                  {fmt(data.discountedMonthlyPrice)}<span className="text-sm font-normal text-slate-500">/mo</span>
                </span>
              } />
            )}
            {data.setupFee != null && data.setupFee > 0 && (
              <Row label="Database Init Fee" value={`${fmt(data.setupFee)} one-time`} />
            )}
          </tbody>
        </table>
        <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Your beta pricing is <strong>locked in for life</strong> — as long as your subscription remains in good standing, your rate will never increase.</span>
        </div>
      </div>

      {/* Agreement form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <p className="font-semibold text-slate-900">Sign Your Beta Agreement</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => acceptMutation.mutate(v))} className="space-y-5">
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {[
                { name: "agreeToBetaAgreement" as const, label: <>I agree to the <a href="https://hubifyhomesonline.com/beta-agreement" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">Hubify Homes Beta Agreement</a></> },
                { name: "agreeToTerms" as const, label: <>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">Terms of Service</a></> },
                { name: "agreeToPrivacy" as const, label: <>I agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">Privacy Policy</a></> },
              ].map(({ name, label }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        id={name}
                        checked={field.value === true}
                        onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel htmlFor={name} className="text-sm text-slate-700 font-normal leading-snug cursor-pointer">{label}</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
              ))}
            </div>

            <FormField control={form.control} name="signerName" render={({ field }) => (
              <FormItem>
                <FormLabel>Authorized Signer Name</FormLabel>
                <FormControl><Input placeholder="Full legal name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="organizationName" render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl><Input placeholder={data.company ?? "Your company name"} {...field} /></FormControl>
                <p className="text-xs text-slate-500 mt-1">
                  Must match your approved company name: <strong>{data.company}</strong>
                </p>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-base py-5 font-semibold"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Accept & Continue</>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400">
              By clicking "Accept & Continue" you are electronically signing this agreement.
              Your IP address and browser information will be recorded for legal purposes.
            </p>
          </form>
        </Form>
      </div>
    </>
  );
}

// ── Step 2: Payment setup ─────────────────────────────────────────────────────

function PaymentStep({ data, token }: { data: OnboardingDetails; token: string }) {
  const { toast } = useToast();
  const totalDueToday = (data.setupFee ?? 0) + (data.discountedMonthlyPrice ?? 0);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Failed to create payment session.");
      return body as { checkoutUrl: string };
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (err: any) => {
      toast({ title: "Payment setup failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-indigo-600 px-6 py-5">
        <p className="text-white font-semibold text-lg">Payment Setup</p>
        <p className="text-teal-100 text-sm mt-0.5">Secure checkout via Stripe</p>
      </div>

      <div className="p-6">
        {/* Order summary */}
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Order Summary</p>
        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Hubify Homes Beta — {data.portfolioTier ?? "Standard"} Plan
              </p>
              <p className="text-xs text-slate-500">
                {data.discountPercentage ?? 0}% founding discount · Beta Cohort #{data.betaCohortNumber ?? "?"}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-800 shrink-0 ml-4">
              {fmt(data.discountedMonthlyPrice)}<span className="text-xs text-slate-400 font-normal">/mo</span>
            </span>
          </div>

          {(data.setupFee ?? 0) > 0 && (
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-800">Platform Initialization Fee</p>
                <p className="text-xs text-slate-500">One-time database setup</p>
              </div>
              <span className="text-sm font-semibold text-slate-800 shrink-0 ml-4">{fmt(data.setupFee)}</span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Total Due Today</p>
              <p className="text-xs text-slate-500">First month + setup fee</p>
            </div>
            <span className="text-xl font-bold text-teal-700">{fmt(totalDueToday)}</span>
          </div>
        </div>

        {/* Recurring note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 text-xs text-slate-500 leading-relaxed">
          After today, you'll be billed <strong className="text-slate-700">{fmt(data.discountedMonthlyPrice)}/month</strong>.
          Your beta discount of <strong className="text-slate-700">{data.discountPercentage ?? 0}%</strong> is locked in for the lifetime
          of your subscription. You may cancel at any time.
        </div>

        <Button
          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-base py-5 font-semibold"
          onClick={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe…</>
          ) : (
            <><CreditCard className="w-4 h-4 mr-2" />Continue to Secure Payment <ArrowRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>

        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          <span>Secured by Stripe · 256-bit SSL encryption</span>
        </div>
      </div>
    </div>
  );
}

// ── Locked Step 2 placeholder (agreement not signed yet) ──────────────────────

function PaymentStepLocked() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 opacity-60 select-none">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-slate-400" />
        <p className="font-semibold text-slate-500">Payment Setup</p>
      </div>
      <p className="text-slate-400 text-sm">Complete Step 1 to unlock payment setup.</p>
    </div>
  );
}

// ── Payment success / processing screen ────────────────────────────────────────

function PaymentSuccess({ data }: { data: OnboardingDetails }) {
  const isPaid = data.paymentStatus === "paid" || data.stage === "platform_initializing";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-9 h-9 text-teal-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {isPaid ? "Payment Received!" : "Payment Processing…"}
      </h2>
      <p className="text-slate-600 text-sm leading-relaxed mb-6">
        {isPaid
          ? "Your payment was successful. Your platform setup is now starting — you'll receive an email when it's ready."
          : "Your payment is being processed. This usually takes just a moment. You'll receive a confirmation email shortly."}
      </p>
      <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 text-left">
        <p className="text-teal-800 text-sm font-semibold mb-1">What happens next</p>
        <ul className="text-teal-700 text-sm space-y-1 list-disc list-inside">
          <li>Our team initializes your Hubify platform</li>
          <li>You'll receive login credentials via email</li>
          <li>Onboarding call scheduled within 2 business days</li>
        </ul>
      </div>
    </div>
  );
}

// ── Payment cancelled banner ────────────────────────────────────────────────────

function PaymentCancelledBanner() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
      <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
      <span>Your payment was cancelled and nothing was charged. You can try again when you're ready.</span>
    </div>
  );
}

// ── Verifying payment screen (shown immediately after Stripe redirect) ─────────

function VerifyingPayment({ token, onVerified }: { token: string; onVerified: () => void }) {
  const { data, isError } = useQuery<OnboardingDetails>({
    queryKey: ["/api/public/onboarding", token, "verify"],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) throw new Error("Failed to verify");
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.paymentStatus === "paid" || d?.stage === "platform_initializing") return false;
      return 2000;
    },
    retry: 5,
  });

  useEffect(() => {
    if (data?.paymentStatus === "paid" || data?.stage === "platform_initializing") {
      onVerified();
    }
  }, [data, onVerified]);

  if (isError) return (
    <div className="text-center py-10 text-slate-500 text-sm">
      <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
      Could not verify payment status. Please refresh the page or contact support.
    </div>
  );

  return (
    <div className="text-center py-10">
      <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mx-auto mb-3" />
      <p className="text-slate-600 text-sm font-medium">Verifying your payment…</p>
      <p className="text-slate-400 text-xs mt-1">This usually takes just a moment.</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPortal() {
  const { token } = useParams<{ token: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentParam = params.get("payment"); // "success" | "cancelled" | null

  const [localSigned, setLocalSigned] = useState(false);
  const [signerNameLocal, setSignerNameLocal] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<OnboardingDetails, { status: number; message: string }>({
    queryKey: ["/api/public/onboarding", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to load." }));
        const err: any = new Error(body.message ?? "Failed to load.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    retry: false,
    enabled: !!token,
  });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-8" />
          <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
          <p className="mt-3 text-slate-500 text-sm">Loading your onboarding details…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) {
    const err = error as any;
    return <TokenError status={err?.status ?? 500} message={err?.message ?? "Failed to load."} />;
  }

  // ── Derive current state ──────────────────────────────────────────────────────
  const agreementSigned = data.alreadySigned || localSigned;
  const paymentPaid = data.paymentStatus === "paid" || data.stage === "platform_initializing" || paymentVerified;

  // Determine current wizard step for the step indicator
  const currentStep = paymentPaid ? 3 : agreementSigned ? 2 : 1;

  // ── Payment success/processing redirect ───────────────────────────────────────
  if (paymentParam === "success" && !paymentPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-6" />
            <StepIndicator current={3} />
          </div>
          <VerifyingPayment token={token!} onVerified={() => {
            setPaymentVerified(true);
            refetch();
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-16 w-auto mx-auto mb-6" />
          <StepIndicator current={currentStep} />
          {!agreementSigned && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Beta Agreement Review</h1>
              <p className="text-slate-500 text-sm">Review your membership details and sign your Beta Agreement to continue.</p>
            </>
          )}
          {agreementSigned && !paymentPaid && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Complete Your Payment</h1>
              <p className="text-slate-500 text-sm">Your agreement is signed. Complete payment to activate your platform.</p>
            </>
          )}
          {paymentPaid && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Platform Initializing</h1>
              <p className="text-slate-500 text-sm">Payment received. Your platform is being set up.</p>
            </>
          )}
        </div>

        {/* Cancelled banner */}
        {paymentParam === "cancelled" && !paymentPaid && <PaymentCancelledBanner />}

        {/* Step 1: Agreement */}
        {!agreementSigned && (
          <AgreementStep
            data={data}
            token={token!}
            onSigned={(name) => {
              setSignerNameLocal(name);
              setLocalSigned(true);
            }}
          />
        )}

        {/* Step 1 done, Step 2: Payment */}
        {agreementSigned && !paymentPaid && (
          <>
            {/* Agreement done badge */}
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Step 1 complete — agreement signed
                {(data.agreementSignerName || signerNameLocal) && ` by ${data.agreementSignerName ?? signerNameLocal}`}.
              </span>
            </div>
            <PaymentStep data={data} token={token!} />
          </>
        )}

        {/* Step 2 done: Payment confirmed */}
        {paymentPaid && <PaymentSuccess data={data} />}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Questions?{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}

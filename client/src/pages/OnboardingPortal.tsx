import { useState } from "react";
import { useParams } from "wouter";
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
import { CheckCircle, Clock, AlertTriangle, Loader2, Lock, ShieldCheck } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

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
}

// ── Form schema ──────────────────────────────────────────────────────────────

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

// ── Step indicator ────────────────────────────────────────────────────────────

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

// ── Pricing row helper ────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-slate-500 text-sm align-top w-52">{label}</td>
      <td className={`py-2.5 text-sm font-medium ${accent ? "text-teal-700" : "text-slate-800"} align-top`}>{value}</td>
    </tr>
  );
}

// ── Error states ─────────────────────────────────────────────────────────────

function TokenError({ status, message }: { status: number; message: string }) {
  const icon =
    status === 410 ? <Clock className="w-10 h-10 text-amber-400" /> :
    status === 404 ? <AlertTriangle className="w-10 h-10 text-red-400" /> :
    <AlertTriangle className="w-10 h-10 text-red-400" />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-10 text-center">
        <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 w-auto mx-auto mb-8" />
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-slate-900 mb-3">
          {status === 410 ? "Link Expired" : "Invalid Link"}
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        <p className="mt-4 text-slate-500 text-xs">
          Need help? Email us at{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Already signed ────────────────────────────────────────────────────────────

function AlreadySigned({ data }: { data: OnboardingDetails }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-10 text-center">
        <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 w-auto mx-auto mb-8" />
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-teal-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Agreement Already Signed</h1>
        <p className="text-slate-600 text-sm mb-4">
          {data.agreementSignerName && (
            <><strong>{data.agreementSignerName}</strong> signed this agreement</>
          )}
          {data.agreementSignedAt && (
            <> on {new Date(data.agreementSignedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
          )}.
        </p>
        <p className="text-slate-500 text-xs">
          Your beta agreement has been accepted. The next step is payment setup. We'll be in touch soon.
        </p>
      </div>
    </div>
  );
}

// ── Signed success screen ─────────────────────────────────────────────────────

function SignedSuccess({ signerName }: { signerName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-lg w-full p-10 text-center">
        <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 w-auto mx-auto mb-8" />
        <StepIndicator current={2} />
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-teal-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Agreement Signed!</h1>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Thank you, <strong>{signerName}</strong>. Your beta agreement has been accepted.
          The next step is payment setup — our team will be in touch within one business day
          to complete your onboarding.
        </p>
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 text-left">
          <p className="text-teal-800 text-sm font-semibold mb-1">What happens next</p>
          <ul className="text-teal-700 text-sm space-y-1 list-disc list-inside">
            <li>Our team reviews your signed agreement</li>
            <li>You'll receive an email with payment setup instructions</li>
            <li>After payment, your Hubify platform will be initialized</li>
          </ul>
        </div>
        <p className="mt-6 text-slate-500 text-xs">
          Questions? Email{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [signed, setSigned] = useState(false);
  const [signerNameForSuccess, setSignerNameForSuccess] = useState("");

  const { data, isLoading, error, status: queryStatus } = useQuery<OnboardingDetails, { status: number; message: string }>({
    queryKey: ["/api/public/onboarding", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to load onboarding details." }));
        const err: any = new Error(body.message ?? "Failed to load onboarding details.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    retry: false,
    enabled: !!token,
  });

  const form = useForm<AgreementForm>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      signerName: "",
      organizationName: data?.company ?? "",
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
    onSuccess: (_data, values) => {
      setSignerNameForSuccess(values.signerName);
      setSigned(true);
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 w-auto mx-auto mb-8" />
          <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
          <p className="mt-3 text-slate-500 text-sm">Loading your onboarding details…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    const err = error as any;
    return <TokenError status={err?.status ?? 500} message={err?.message ?? "Failed to load onboarding details."} />;
  }

  // ── Already signed (loaded from server) ───────────────────────────────────
  if (data.alreadySigned) return <AlreadySigned data={data} />;

  // ── Success after submit ───────────────────────────────────────────────────
  if (signed) return <SignedSuccess signerName={signerNameForSuccess} />;

  // ── Agreement screen ───────────────────────────────────────────────────────
  const displayName = data.firstName && data.lastName
    ? `${data.firstName} ${data.lastName}`
    : data.name ?? "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 w-auto mx-auto mb-6" />
          <StepIndicator current={1} />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Beta Agreement Review</h1>
          <p className="text-slate-500 text-sm">Review your membership details and sign your Beta Agreement to continue.</p>
        </div>

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
                <Row
                  label="List Price"
                  value={<span className="line-through text-slate-400">${data.originalMonthlyPrice.toFixed(2)}/mo</span>}
                />
              )}
              {data.discountPercentage != null && (
                <Row label="Beta Discount" value={<span className="text-teal-700 font-semibold">{data.discountPercentage}% off — locked for life</span>} accent />
              )}
              {data.discountedMonthlyPrice != null && (
                <Row
                  label="Your Monthly Price"
                  value={<span className="text-2xl font-bold text-slate-900">${data.discountedMonthlyPrice.toFixed(2)}<span className="text-sm font-normal text-slate-500">/mo</span></span>}
                />
              )}
              {data.setupFee != null && data.setupFee > 0 && (
                <Row label="Database Init Fee" value={`$${data.setupFee.toFixed(2)} one-time`} />
              )}
            </tbody>
          </table>
          <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs">
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Your beta pricing is <strong>locked in for life</strong> — as long as your subscription remains in good standing, your rate will never increase.</span>
          </div>
        </div>

        {/* Agreement acceptance form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <p className="font-semibold text-slate-900">Sign Your Beta Agreement</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => acceptMutation.mutate(v))} className="space-y-5">
              {/* Checkboxes */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <FormField
                  control={form.control}
                  name="agreeToBetaAgreement"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          id="agreeToBetaAgreement"
                          checked={field.value === true}
                          onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel htmlFor="agreeToBetaAgreement" className="text-sm text-slate-700 font-normal leading-snug cursor-pointer">
                          I agree to the{" "}
                          <a href="https://hubifyhomesonline.com/beta-agreement" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
                            Hubify Homes Beta Agreement
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          id="agreeToTerms"
                          checked={field.value === true}
                          onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel htmlFor="agreeToTerms" className="text-sm text-slate-700 font-normal leading-snug cursor-pointer">
                          I agree to the{" "}
                          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
                            Hubify Homes Terms of Service
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agreeToPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          id="agreeToPrivacy"
                          checked={field.value === true}
                          onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel htmlFor="agreeToPrivacy" className="text-sm text-slate-700 font-normal leading-snug cursor-pointer">
                          I agree to the{" "}
                          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
                            Hubify Homes Privacy Policy
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Signer details */}
              <FormField
                control={form.control}
                name="signerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authorized Signer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full legal name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder={data.company ?? "Your company name"} {...field} />
                    </FormControl>
                    <p className="text-xs text-slate-500 mt-1">Must match your approved company name: <strong>{data.company}</strong></p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-base py-5 font-semibold"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Accept & Continue
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-slate-400">
                By clicking "Accept & Continue" you are electronically signing this agreement.
                Your IP address and browser information will be recorded for legal purposes.
              </p>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Questions? Email{" "}
          <a href="mailto:hello@hubifyhomesonline.com" className="text-teal-600 hover:underline">
            hello@hubifyhomesonline.com
          </a>
        </p>
      </div>
    </div>
  );
}

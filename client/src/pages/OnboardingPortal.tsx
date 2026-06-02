import { useState, useEffect, useRef } from "react";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, Clock, AlertTriangle, Loader2, Lock,
  ShieldCheck, CreditCard, ArrowRight, RefreshCw, XCircle,
  FileText, ChevronDown,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const AGREEMENT_VERSION = "v1.0";

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
    errorMap: () => ({ message: "You must review and accept the Hubify Homes Beta Agreement" }),
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

// ── Beta Agreement text ───────────────────────────────────────────────────────

function BetaAgreementText({ company }: { company?: string }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-5">
      <div>
        <p className="text-xs text-slate-400 mb-1">Version {AGREEMENT_VERSION} · Effective {today}</p>
        <p>
          This Hubify Homes Beta Participation Agreement ("<strong>Agreement</strong>") is entered into between
          Hubify Homes ("<strong>Hubify</strong>," "<strong>we</strong>," "<strong>us</strong>") and the
          organization identified during onboarding ("<strong>Beta Participant</strong>" or "<strong>you</strong>"),
          and governs your participation in the Hubify Homes closed beta program.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">1. Beta Program Access</p>
        <p>
          Subject to the terms of this Agreement, Hubify grants you a limited, non-exclusive, non-transferable
          license to access and use the Hubify platform ("<strong>Platform</strong>") solely for internal business
          purposes during the Beta Period. Access is provided on an invitation-only basis and may be revoked at
          any time in accordance with Section 9.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">2. Beta Pricing &amp; Lifetime Lock</p>
        <p>
          In consideration of your early adoption and feedback, Hubify extends a discounted monthly subscription
          rate ("<strong>Beta Price</strong>") as set forth in your approval notice. This Beta Price is
          locked in for the lifetime of your subscription, meaning Hubify will not increase your monthly rate
          above the Beta Price so long as your subscription remains in continuous good standing.
        </p>
        <p className="mt-2">
          A one-time platform initialization fee may apply as detailed in your onboarding portal. This fee is
          non-refundable after platform provisioning begins. Monthly subscription fees are billed in advance.
          You may cancel at any time; cancellations take effect at the end of the current billing cycle.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">3. Beta Nature of the Platform</p>
        <p>
          You acknowledge that the Platform is in an early-access beta state and may contain errors, bugs, or
          incomplete features. Hubify makes no guarantee of uptime, data durability, or feature availability
          during the Beta Period. We will make commercially reasonable efforts to maintain service continuity
          and notify you of planned maintenance windows.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">4. Feedback &amp; Improvements</p>
        <p>
          You agree to provide Hubify with reasonable feedback regarding your use of the Platform, including bug
          reports, feature requests, and usability observations ("<strong>Feedback</strong>"). You grant Hubify
          a perpetual, irrevocable, royalty-free license to use, incorporate, and commercialize any Feedback
          without restriction or compensation to you.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">5. Confidentiality</p>
        <p>
          The Platform, its features, pricing structure, and any non-public information disclosed to you
          constitute Confidential Information of Hubify. You agree not to disclose, publish, or share
          Confidential Information with third parties without Hubify's prior written consent, except as
          required by law. This obligation survives termination of this Agreement for a period of two (2) years.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">6. Data &amp; Privacy</p>
        <p>
          Hubify will handle your data in accordance with its{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
            Privacy Policy
          </a>
          . You represent that you have obtained all necessary consents to upload or process any personal data
          through the Platform. You retain ownership of all data you input into the Platform; Hubify receives
          a limited license to process that data solely to provide the service.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">7. Acceptable Use</p>
        <p>
          You agree to use the Platform only for lawful property management purposes and in compliance with all
          applicable laws and regulations. You will not attempt to reverse engineer, circumvent security controls,
          or use the Platform in any manner that could harm Hubify or other users.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">8. Disclaimer of Warranties</p>
        <p>
          THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" DURING THE BETA PERIOD. HUBIFY EXPRESSLY
          DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. HUBIFY DOES NOT WARRANT
          THAT THE PLATFORM WILL BE ERROR-FREE OR UNINTERRUPTED.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">9. Limitation of Liability</p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HUBIFY'S AGGREGATE LIABILITY TO YOU FOR ANY
          CLAIMS ARISING OUT OF OR RELATING TO THIS AGREEMENT OR THE PLATFORM SHALL NOT EXCEED THE TOTAL FEES
          PAID BY YOU IN THE THREE (3) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL HUBIFY BE LIABLE FOR
          INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">10. Termination</p>
        <p>
          Either party may terminate this Agreement with thirty (30) days' written notice. Hubify may
          terminate immediately upon material breach of this Agreement, including non-payment. Upon termination,
          your access to the Platform will be suspended and you may request an export of your data within
          30 days of termination.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-900 mb-1">11. General</p>
        <p>
          This Agreement is governed by the laws of the State of Florida, without regard to conflict of law
          principles. Any dispute shall be resolved by binding arbitration in accordance with the rules of the
          American Arbitration Association. This Agreement, together with the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
            Privacy Policy
          </a>
          , constitutes the entire agreement between the parties with respect to the subject matter hereof and
          supersedes all prior agreements and understandings.
        </p>
      </div>

      <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Agreement {AGREEMENT_VERSION} · Hubify Homes · hello@hubifyhomesonline.com
        {company && ` · Participant: ${company}`}
      </div>
    </div>
  );
}

// ── Agreement modal ───────────────────────────────────────────────────────────

function AgreementModal({
  open,
  onOpenChange,
  company,
  onAccept,
  scrolledToBottom,
  onScroll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company?: string;
  onAccept: () => void;
  scrolledToBottom: boolean;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: 0 });
      }, 50);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileText className="w-4 h-4 text-teal-600" />
            Hubify Homes Beta Participation Agreement
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">Version {AGREEMENT_VERSION} — Read the full agreement before accepting</p>
        </DialogHeader>

        {/* Scrollable agreement body */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-6 py-5 min-h-0"
        >
          <BetaAgreementText company={company} />
        </div>

        {/* Scroll-to-bottom nudge */}
        {!scrolledToBottom && (
          <div className="shrink-0 flex items-center justify-center gap-1.5 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            Scroll to the bottom to continue
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-slate-200 shrink-0 flex-col gap-3 sm:flex-col">
          <label
            className={`flex items-start gap-3 cursor-pointer select-none ${!scrolledToBottom ? "opacity-40 pointer-events-none" : ""}`}
          >
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              disabled={!scrolledToBottom}
              className="mt-0.5 shrink-0"
            />
            <span className="text-sm text-slate-700 leading-snug">
              I have read, understand, and agree to the Hubify Homes Beta Participation Agreement ({AGREEMENT_VERSION}).
            </span>
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={!scrolledToBottom || !confirmed}
              onClick={onAccept}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Accept Agreement
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Step 1: Agreement form ─────────────────────────────────────────────────────

function AgreementStep({ data, token, onSigned }: {
  data: OnboardingDetails;
  token: string;
  onSigned: (name: string) => void;
}) {
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [agreementViewedAt, setAgreementViewedAt] = useState<string | null>(null);
  const [agreementScrolledAt, setAgreementScrolledAt] = useState<string | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [betaAgreementAccepted, setBetaAgreementAccepted] = useState(false);

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

  const handleOpenModal = () => {
    setModalOpen(true);
    if (!agreementViewedAt) setAgreementViewedAt(new Date().toISOString());
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    if (nearBottom && !agreementScrolledAt) {
      setScrolledToBottom(true);
      setAgreementScrolledAt(new Date().toISOString());
    } else if (nearBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleAcceptFromModal = () => {
    setBetaAgreementAccepted(true);
    setModalOpen(false);
    form.setValue("agreeToBetaAgreement", true, { shouldValidate: true });
  };

  const acceptMutation = useMutation({
    mutationFn: async (values: AgreementForm) => {
      const res = await fetch(`/api/public/onboarding/${token}/accept-agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          agreementVersion: AGREEMENT_VERSION,
          agreementViewedAt,
          agreementScrolledAt,
        }),
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
      {/* Agreement modal */}
      <AgreementModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        company={data.company}
        onAccept={handleAcceptFromModal}
        scrolledToBottom={scrolledToBottom}
        onScroll={handleScroll}
      />

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

              {/* Beta Agreement — modal-gated */}
              <FormField control={form.control} name="agreeToBetaAgreement" render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    {betaAgreementAccepted ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 mt-0.5 rounded border-2 border-slate-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {betaAgreementAccepted ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-teal-700 font-medium">Beta Agreement accepted</span>
                          <button
                            type="button"
                            onClick={handleOpenModal}
                            className="text-xs text-teal-600 hover:underline underline-offset-2"
                          >
                            (review again)
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-700 mb-2 leading-snug">
                            I have read and agree to the{" "}
                            <strong className="text-slate-900">Hubify Homes Beta Agreement</strong>
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-teal-300 text-teal-700 hover:bg-teal-50 text-xs font-medium"
                            onClick={handleOpenModal}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Read &amp; Accept Beta Agreement
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </div>
                  </div>
                  <input type="hidden" {...field} />
                </FormItem>
              )} />

              {/* Terms */}
              <FormField control={form.control} name="agreeToTerms" render={({ field }) => (
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
                        Terms of Service
                      </a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />

              {/* Privacy */}
              <FormField control={form.control} name="agreeToPrivacy" render={({ field }) => (
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
                        Privacy Policy
                      </a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />
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
                <><ShieldCheck className="w-4 h-4 mr-2" />Accept &amp; Continue</>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400">
              By clicking "Accept & Continue" you are electronically signing this agreement.
              Your IP address, browser information, and agreement review timestamps will be recorded for legal purposes.
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
      <div className="bg-gradient-to-r from-teal-600 to-indigo-600 px-6 py-5">
        <p className="text-white font-semibold text-lg">Payment Setup</p>
        <p className="text-teal-100 text-sm mt-0.5">Secure checkout via Stripe</p>
      </div>

      <div className="p-6">
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

// ── Locked Step 2 placeholder ──────────────────────────────────────────────────

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

// ── Verifying payment screen ─────────────────────────────────────────────────

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
  const paymentParam = params.get("payment");

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

  if (error || !data) {
    const err = error as any;
    return <TokenError status={err?.status ?? 500} message={err?.message ?? "Failed to load."} />;
  }

  const agreementSigned = data.alreadySigned || localSigned;
  const paymentPaid = data.paymentStatus === "paid" || data.stage === "platform_initializing" || paymentVerified;
  const currentStep = paymentPaid ? 3 : agreementSigned ? 2 : 1;

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

        {paymentParam === "cancelled" && !paymentPaid && <PaymentCancelledBanner />}

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

        {agreementSigned && !paymentPaid && (
          <>
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

        {paymentPaid && <PaymentSuccess data={data} />}

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

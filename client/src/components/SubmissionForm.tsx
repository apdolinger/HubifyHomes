import { useState } from "react";
import { useEmbedResize } from "@/lib/embedResize";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import type { ComponentType } from "react";
import { CheckCircle, Loader2, Building2, Users, MapPin, Home, ClipboardList, Star } from "lucide-react";

// ── Embed helper ─────────────────────────────────────────────────────────────

function postMessageIfEmbed() {
  if (new URLSearchParams(window.location.search).get("embed") === "true") {
    window.parent.postMessage({ type: "hubify:form_submitted" }, "*");
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type SubmissionIntent =
  | "get_started"
  | "need_demo"
  | "beta_application"
  | "contact"
  | "pricing_starter"
  | "pricing_growth"
  | "pricing_professional"
  | "pricing_operator"
  | "pricing_enterprise";

export interface SubmissionFormProps {
  onSuccess?: () => void;
  compact?: boolean;
  initialIntent?: SubmissionIntent;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRICING_TIER_MAP: Record<string, string> = {
  pricing_starter:      "Starter Portfolio",
  pricing_growth:       "Growth Portfolio",
  pricing_professional: "Professional Portfolio",
  pricing_operator:     "Operator Portfolio",
  pricing_enterprise:   "Enterprise Portfolio",
};

function suggestTier(homes: number): string {
  if (!homes || homes <= 0) return "";
  if (homes <= 10) return "Starter Portfolio";
  if (homes <= 25) return "Growth Portfolio";
  if (homes <= 50) return "Professional Portfolio";
  if (homes <= 100) return "Operator Portfolio";
  return "Enterprise Portfolio";
}

function tierBadgeClass(tier: string): string {
  switch (tier) {
    case "Starter Portfolio": return "bg-slate-100 text-slate-700 border-slate-200";
    case "Growth Portfolio": return "bg-teal-50 text-teal-700 border-teal-200";
    case "Professional Portfolio": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Operator Portfolio": return "bg-purple-50 text-purple-700 border-purple-200";
    case "Enterprise Portfolio": return "bg-orange-50 text-orange-700 border-orange-200";
    default: return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

const SectionHeader = ({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
    <Icon className="w-4 h-4 text-teal-600" />
    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
  </div>
);

function SuccessMessage({ type }: { type: "inquiry" | "demo" | "beta" | "contact" }) {
  const configs = {
    inquiry: {
      heading: "Thank you!",
      body: "Your submission has been received. Our team will review your information and follow up shortly.",
    },
    demo: {
      heading: "Demo request received!",
      body: "We'll review your information and send you access to the Hubify demo environment shortly. Check your inbox!",
    },
    beta: {
      heading: "Beta application received!",
      body: "Thanks for applying to our founding beta program! Our team will review your application and reach out within one business day.",
    },
    contact: {
      heading: "Message sent!",
      body: "Thanks for reaching out. Our team will get back to you within one business day.",
    },
  };
  const c = configs[type];
  return (
    <div className="text-center space-y-4 py-10">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold text-gray-900">{c.heading}</h2>
      <p className="text-gray-600 max-w-sm mx-auto">{c.body}</p>
    </div>
  );
}

// ── Contact Variant ───────────────────────────────────────────────────────────

const contactModalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  company: z.string().optional(),
  notes: z.string().min(1, "Please include a message"),
});
type ContactModalValues = z.infer<typeof contactModalSchema>;

function ContactVariantForm({ onSuccess, compact }: { onSuccess?: () => void; compact?: boolean }) {
  useEmbedResize();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ContactModalValues>({
    resolver: zodResolver(contactModalSchema),
    defaultValues: { name: "", email: "", company: "", notes: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: ContactModalValues) => {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, email: values.email, company: values.company, notes: values.notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      postMessageIfEmbed();
      onSuccess?.();
    },
  });

  if (submitted) return <SuccessMessage type="contact" />;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(v => mutation.mutate(v))}
        className={compact ? "space-y-4" : "space-y-6"}
      >
        {mutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {(mutation.error as Error).message}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Full Name *</FormLabel>
                <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Email *</FormLabel>
                <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company / Organization</FormLabel>
              <FormControl><Input placeholder="Acme Property Group" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message *</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Tell us about your properties and what you're looking for..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
            : "Send Message"}
        </Button>
      </form>
    </Form>
  );
}

// ── Beta Application Variant ──────────────────────────────────────────────────

const betaSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  company: z.string().min(1, "Organization name is required"),
  estimatedHomes: z.coerce.number().min(1).optional(),
  betaTierInterest: z.enum(["founding_10", "early_access_10"], {
    required_error: "Please select a beta tier",
    invalid_type_error: "Please select a beta tier",
  }),
  notes: z.string().optional(),
});
type BetaValues = z.infer<typeof betaSchema>;

const BETA_TIERS = [
  {
    value: "founding_10" as const,
    label: "Founding 10",
    discount: "50% off",
    description: "First 10 founding members — price locked for life",
    color: "border-teal-500 bg-teal-600 text-white",
    inactiveColor: "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50",
  },
  {
    value: "early_access_10" as const,
    label: "Early Access 10",
    discount: "25% off",
    description: "Next 10 approved members — price locked for life",
    color: "border-teal-500 bg-teal-600 text-white",
    inactiveColor: "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50",
  },
];

function BetaVariantForm({ onSuccess, compact }: { onSuccess?: () => void; compact?: boolean }) {
  useEmbedResize();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<BetaValues>({
    resolver: zodResolver(betaSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      estimatedHomes: undefined as unknown as number,
      betaTierInterest: undefined as unknown as "founding_10",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BetaValues) => {
      const res = await fetch("/api/public/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, trialIntent: "beta_application" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      postMessageIfEmbed();
      onSuccess?.();
    },
  });

  if (submitted) return <SuccessMessage type="beta" />;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(v => mutation.mutate(v))}
        className={compact ? "space-y-5" : "space-y-7"}
      >
        {mutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {(mutation.error as Error).message}
          </div>
        )}

        <div>
          <SectionHeader icon={Star} title="Beta Tier Selection" />
          <FormField
            control={form.control}
            name="betaTierInterest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which beta tier are you applying for? *</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {BETA_TIERS.map((tier) => {
                    const isSelected = field.value === tier.value;
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => field.onChange(tier.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${
                          isSelected ? tier.color : tier.inactiveColor
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{tier.label}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? "bg-white/20 text-white" : "bg-teal-100 text-teal-700"
                          }`}>{tier.discount}</span>
                        </div>
                        <p className={`text-xs leading-snug ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                          {tier.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <SectionHeader icon={Users} title="Contact Information" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <div>
          <SectionHeader icon={Building2} title="Organization" />
          <div className="space-y-4">
            <FormField control={form.control} name="company" render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name *</FormLabel>
                <FormControl><Input placeholder="Acme Property Group" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="estimatedHomes" render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Homes Managed</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 25"
                    {...field}
                    onChange={e => field.onChange(e.target.valueAsNumber || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Anything else we should know?</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Tell us about your current setup, goals, or any questions..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
            : "Submit Beta Application"}
        </Button>
      </form>
    </Form>
  );
}

// ── Full Inquiry Form (Get Started / Demo / Pricing) ─────────────────────────

export const submissionSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional(),
  preferredContactMethod: z.enum(["email", "phone", "either"]).default("email"),
  company: z.string().min(1, "Organization name is required"),
  website: z.string().optional(),
  businessType: z.enum(["home_watch", "estate_management", "property_management", "other"]),
  serviceArea: z.string().optional(),
  estimatedHomes: z.coerce.number().min(1, "Please enter at least 1"),
  currentMgmtMethod: z.enum(["spreadsheets", "paper_manual", "existing_software", "none", "other"]),
  teamSize: z.coerce.number().min(1).optional(),
  trialIntent: z.string().min(1, "Please select how we can help"),
  notes: z.string().optional(),
});
export type SubmissionValues = z.infer<typeof submissionSchema>;

const PRICING_INTENTS = new Set<SubmissionIntent>(["pricing_starter", "pricing_growth", "pricing_professional", "pricing_operator", "pricing_enterprise"]);

function FullInquiryForm({
  onSuccess,
  compact,
  initialIntent,
}: {
  onSuccess?: () => void;
  compact?: boolean;
  initialIntent?: SubmissionIntent;
}) {
  useEmbedResize();
  const [submitted, setSubmitted] = useState(false);
  const isDemo = initialIntent === "need_demo";
  const isPricing = !!initialIntent && PRICING_INTENTS.has(initialIntent);
  const presetTier = isPricing ? PRICING_TIER_MAP[initialIntent!] : null;
  const hideIntentChooser = isDemo || isPricing;

  const defaultTrialIntent = isDemo
    ? "need_demo"
    : isPricing
    ? initialIntent!
    : undefined;

  const form = useForm<SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContactMethod: "email",
      company: "",
      website: "",
      businessType: undefined,
      serviceArea: "",
      estimatedHomes: undefined as unknown as number,
      currentMgmtMethod: undefined,
      teamSize: undefined,
      trialIntent: defaultTrialIntent as any,
      notes: "",
    },
  });

  const estimatedHomes = form.watch("estimatedHomes");
  const tier = presetTier ?? suggestTier(Number(estimatedHomes));

  const submitMutation = useMutation({
    mutationFn: async (values: SubmissionValues) => {
      const res = await fetch("/api/public/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      postMessageIfEmbed();
      onSuccess?.();
    },
  });

  if (submitted) {
    const successType = isDemo ? "demo" : "inquiry";
    return (
      <div className="text-center space-y-4 py-10">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">
          {isDemo ? "Demo request received!" : "Thank you!"}
        </h2>
        <p className="text-gray-600 max-w-sm mx-auto">
          {isDemo
            ? "We'll review your information and send you access to the Hubify demo environment shortly. Check your inbox!"
            : "Your submission has been received. Our team will review your information and follow up shortly."}
        </p>
        {!isDemo && tier && (
          <p className="text-sm text-gray-500">
            Based on your portfolio, you look like a great fit for the{" "}
            <span className="font-semibold text-teal-700">{tier}</span>.
          </p>
        )}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => submitMutation.mutate(v))}
        className={compact ? "space-y-6" : "space-y-8"}
      >
        {submitMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {(submitMutation.error as Error).message}
          </div>
        )}

        {/* Section 1 — Contact Info */}
        <div>
          <SectionHeader icon={Users} title="Contact Information" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="preferredContactMethod" render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Contact Method</FormLabel>
                <div className="flex gap-2">
                  {(["email", "phone", "either"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => field.onChange(opt)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        field.value === opt
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-teal-400"
                      }`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Section 2 — Organization */}
        <div>
          <SectionHeader icon={Building2} title="Organization" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl><Input placeholder="Acme Property Group" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="businessType" render={({ field }) => (
              <FormItem>
                <FormLabel>Business Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select your business type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="home_watch">Home Watch</SelectItem>
                    <SelectItem value="estate_management">Estate Management</SelectItem>
                    <SelectItem value="property_management">Property Management</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="serviceArea" render={({ field }) => (
              <FormItem>
                <FormLabel>Service Area</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input className="pl-9" placeholder="e.g. Miami, FL / Southwest Florida" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Section 3 — Portfolio Size */}
        <div>
          <SectionHeader icon={Home} title="Portfolio" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="estimatedHomes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Homes Managed *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 25"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="teamSize" render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Size</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 5"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {tier && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                isPricing ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-100"
              }`}>
                <span className="text-sm text-slate-500">
                  {isPricing ? "Selected plan tier:" : "Suggested plan tier:"}
                </span>
                <Badge
                  variant="outline"
                  className={`font-semibold ${
                    isPricing ? "bg-teal-100 text-teal-800 border-teal-300" : tierBadgeClass(tier)
                  }`}
                >
                  {tier}
                </Badge>
              </div>
            )}
            <FormField control={form.control} name="currentMgmtMethod" render={({ field }) => (
              <FormItem>
                <FormLabel>Current Management Method *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="How do you manage properties today?" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                    <SelectItem value="paper_manual">Paper / Manual</SelectItem>
                    <SelectItem value="existing_software">Existing Software</SelectItem>
                    <SelectItem value="none">No formal system</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Section 4 — Intent (hidden for demo and pricing) */}
        {hideIntentChooser ? (
          <input type="hidden" {...form.register("trialIntent")} value={defaultTrialIntent} />
        ) : (
          <div>
            <SectionHeader icon={ClipboardList} title="How Can We Help?" />
            <FormField control={form.control} name="trialIntent" render={({ field }) => (
              <FormItem>
                <FormLabel>What are you looking for? *</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "free_trial", label: "Start a Free Trial" },
                    { value: "need_demo", label: "See a Demo First" },
                    { value: "ready_onboarding", label: "Ready to Onboard" },
                    { value: "pricing_questions", label: "Pricing Questions" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium border text-left transition-colors ${
                        field.value === opt.value
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:bg-teal-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        {/* Section 5 — Notes */}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Anything else we should know?</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Share any specific challenges, questions, or goals you have..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
          ) : isDemo ? (
            "Request My Demo"
          ) : isPricing ? (
            "Get Started"
          ) : (
            "Submit My Interest"
          )}
        </Button>
      </form>
    </Form>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function SubmissionForm({ onSuccess, compact, initialIntent }: SubmissionFormProps) {
  if (initialIntent === "contact") {
    return <ContactVariantForm onSuccess={onSuccess} compact={compact} />;
  }
  if (initialIntent === "beta_application") {
    return <BetaVariantForm onSuccess={onSuccess} compact={compact} />;
  }
  return <FullInquiryForm onSuccess={onSuccess} compact={compact} initialIntent={initialIntent} />;
}

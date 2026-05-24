import { useState } from "react";
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
import { CheckCircle, Loader2, Building2, Users, MapPin, Home, ClipboardList } from "lucide-react";

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
  trialIntent: z.enum(["free_trial", "ready_onboarding", "need_demo", "pricing_questions"]),
  notes: z.string().optional(),
});
export type SubmissionValues = z.infer<typeof submissionSchema>;

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

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4">
    <Icon className="w-4 h-4 text-teal-600" />
    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
  </div>
);

export interface SubmissionFormProps {
  onSuccess?: () => void;
  compact?: boolean;
  initialIntent?: "need_demo";
}

export function SubmissionForm({ onSuccess, compact, initialIntent }: SubmissionFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const isDemo = initialIntent === "need_demo";

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
      trialIntent: initialIntent ?? undefined,
      notes: "",
    },
  });

  const estimatedHomes = form.watch("estimatedHomes");
  const tier = suggestTier(Number(estimatedHomes));

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
      onSuccess?.();
    },
  });

  if (submitted) {
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
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="preferredContactMethod"
              render={({ field }) => (
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
              )}
            />
          </div>
        </div>

        {/* Section 2 — Organization */}
        <div>
          <SectionHeader icon={Building2} title="Organization" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl><Input placeholder="Acme Property Group" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
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
              )}
            />
            <FormField
              control={form.control}
              name="serviceArea"
              render={({ field }) => (
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
              )}
            />
          </div>
        </div>

        {/* Section 3 — Portfolio Size */}
        <div>
          <SectionHeader icon={Home} title="Portfolio" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedHomes"
                render={({ field }) => (
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
                )}
              />
              <FormField
                control={form.control}
                name="teamSize"
                render={({ field }) => (
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
                )}
              />
            </div>
            {tier && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm text-slate-500">Suggested plan tier:</span>
                <Badge variant="outline" className={`font-semibold ${tierBadgeClass(tier)}`}>
                  {tier}
                </Badge>
              </div>
            )}
            <FormField
              control={form.control}
              name="currentMgmtMethod"
              render={({ field }) => (
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
              )}
            />
          </div>
        </div>

        {/* Section 4 — Intent */}
        {isDemo ? (
          <input type="hidden" {...form.register("trialIntent")} value="need_demo" />
        ) : (
          <div>
            <SectionHeader icon={ClipboardList} title="How Can We Help?" />
            <FormField
              control={form.control}
              name="trialIntent"
              render={({ field }) => (
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
              )}
            />
          </div>
        )}

        {/* Section 5 — Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
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
          )}
        />

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
          ) : isDemo ? (
            "Request My Demo"
          ) : (
            "Submit My Interest"
          )}
        </Button>
      </form>
    </Form>
  );
}

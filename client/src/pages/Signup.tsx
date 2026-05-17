import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, User, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, Home, AlertCircle, LogIn, Mail
} from "lucide-react";

interface FormData {
  company: string;
  phone: string;
  website: string;
  firstName: string;
  lastName: string;
  email: string;
}

const EMPTY_FORM: FormData = {
  company: "",
  phone: "",
  website: "",
  firstName: "",
  lastName: "",
  email: "",
};

const STEPS = [
  { label: "Company", icon: Building2 },
  { label: "Your Info", icon: User },
  { label: "Review", icon: CheckCircle },
];

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signup/config")
      .then((r) => r.json())
      .then((d) => { setSignupEnabled(!!d.enabled); setConfigLoading(false); })
      .catch(() => { setSignupEnabled(false); setConfigLoading(false); });
  }, []);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const step1Valid = form.company.trim().length >= 2;
  const step2Valid =
    form.firstName.trim().length >= 1 &&
    form.lastName.trim().length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const canNext = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          website: form.website.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Signup failed", description: data.message, variant: "destructive" });
        return;
      }
      setOrgName(data.orgName || form.company);
      setDone(true);
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!signupEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign-ups are closed</h2>
            <p className="text-slate-500 text-sm mb-6">
              New organization registrations are not available at this time. Please contact us to get access.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-10 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h2>
            <p className="text-slate-600 mb-1">
              <span className="font-medium">{orgName}</span> has been created.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              A welcome email has been sent to <span className="font-medium text-slate-700">{form.email.toLowerCase()}</span>.
              <br />
              Log in with that same email address to activate your account.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-8 space-y-2">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                <LogIn className="w-4 h-4" /> Next steps
              </p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Click the button below to log in with Replit</li>
                <li>Use the email address <span className="font-medium">{form.email.toLowerCase()}</span></li>
                <li>Your organization will be ready immediately</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => { window.location.href = "/api/login"; }}
              >
                <LogIn className="w-4 h-4 mr-2" /> Log in to Hubify
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                <Home className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="w-7 h-7 text-blue-600" />
          <span className="text-2xl font-bold text-slate-800">Hubify</span>
        </div>
        <p className="text-slate-500 text-sm">Create your organization account</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDone
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${i < step ? "bg-green-400" : "bg-slate-300"}`} />
              )}
            </div>
          );
        })}
      </div>

      <Card className="w-full max-w-md">
        {/* Step 0: Company Info */}
        {step === 0 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Company Details
              </CardTitle>
              <CardDescription>Tell us about the company you're setting up</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company Name <span className="text-red-500">*</span></Label>
                <Input
                  id="company"
                  placeholder="Acme Property Management"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                />
              </div>
              <Button
                className="w-full mt-2"
                disabled={!step1Valid}
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 1: Admin user info */}
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Your Account
              </CardTitle>
              <CardDescription>
                You'll be the admin for <span className="font-medium">{form.company}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@yourcompany.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Use the email you'll log in with — it must match your Replit account.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button disabled={!step2Valid} onClick={() => setStep(2)} className="flex-1">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" /> Review & Create
              </CardTitle>
              <CardDescription>Everything look right? We'll create your account now.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Company</span>
                  <span className="font-medium text-slate-800">{form.company}</span>
                </div>
                {form.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium text-slate-800">{form.phone}</span>
                  </div>
                )}
                {form.website && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Website</span>
                    <span className="font-medium text-slate-800">{form.website}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-slate-500">Admin Name</span>
                  <span className="font-medium text-slate-800">{form.firstName} {form.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admin Email</span>
                  <span className="font-medium text-slate-800">{form.email.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <Badge variant="secondary">Starter — Free Trial</Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} disabled={submitting} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-xs text-slate-400">
        Already have an account?{" "}
        <a href="/api/login" className="text-blue-600 hover:underline">Log in</a>
      </p>
    </div>
  );
}

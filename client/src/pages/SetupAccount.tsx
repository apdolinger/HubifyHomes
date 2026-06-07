import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Eye, EyeOff, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

interface SetupAccountData {
  email: string;
  firstName: string;
  lastName: string;
  orgName: string;
  expiresAt: string;
}

const setupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type SetupForm = z.infer<typeof setupSchema>;

function InvalidLink({ status, message, alreadyClaimed }: { status: number; message: string; alreadyClaimed?: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {alreadyClaimed ? "Account already set up" : "Link not valid"}
        </h1>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        {alreadyClaimed && (
          <a
            href="/staff/login"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Sign in to Hubify <ArrowRight className="w-4 h-4" />
          </a>
        )}
        {!alreadyClaimed && (
          <p className="text-xs text-slate-400">
            Need help?{" "}
            <a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">
              contact@hubifyhomes.com
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default function SetupAccount() {
  const { token } = useParams<{ token: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<SetupAccountData, any>({
    queryKey: ["/api/public/setup-account", token, "verify"],
    queryFn: async () => {
      const res = await fetch(`/api/public/setup-account/${token}/verify`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Invalid link." }));
        const err: any = new Error(body.message ?? "Invalid link.");
        err.status = res.status;
        err.alreadyClaimed = body.alreadyClaimed;
        throw err;
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Pre-fill name when data loads
  const firstName = data?.firstName ?? "";
  const lastName = data?.lastName ?? "";

  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async (values: SetupForm) => {
      const res = await fetch(`/api/public/setup-account/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: values.password,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(body.message ?? "Could not set up account.");
        err.alreadyClaimed = body.alreadyClaimed;
        throw err;
      }
      return body as { email: string | null };
    },
    onSuccess: (result) => {
      const emailParam = result.email ? `?email=${encodeURIComponent(result.email)}` : "";
      setLocation(`/staff/login${emailParam}`);
    },
    onError: (err: any) => {
      if (err?.alreadyClaimed) {
        setLocation("/staff/login");
        return;
      }
      toast({
        title: "Something went wrong",
        description: err?.message ?? "Could not set up account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SetupForm) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-14 w-auto mx-auto mb-8" />
          <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const err = error as any;
    return (
      <InvalidLink
        status={err?.status ?? 500}
        message={err?.message ?? "This setup link is not valid."}
        alreadyClaimed={err?.alreadyClaimed}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-14 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Set up your account</h1>
          <p className="text-slate-500 text-sm">
            Creating your admin account for <strong>{data.orgName}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-6 text-sm text-teal-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Signing in as <strong>{data.email}</strong></span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={firstName || "Jane"}
                          {...field}
                          defaultValue={firstName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={lastName || "Smith"}
                          {...field}
                          defaultValue={lastName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Create a password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Re-enter your password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…</>
                ) : (
                  <>Activate my account <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Need help?{" "}
          <a href="mailto:contact@hubifyhomes.com" className="text-teal-600 hover:underline">
            contact@hubifyhomes.com
          </a>
        </p>
      </div>
    </div>
  );
}

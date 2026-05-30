import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle, Loader2 } from "lucide-react";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";

const contactSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("A valid email is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
type ContactValues = z.infer<typeof contactSchema>;

function useEmbedMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("embed") === "true";
}

function ContactForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", company: "", phone: "", notes: "" },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: ContactValues) => {
      const res = await fetch("/api/public/contact", {
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
    onSuccess,
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Let's talk</h1>
        <p className="text-slate-500 mt-1.5 text-sm leading-relaxed">
          Tell us about your properties and what you need. We'll get back to you within one business day.
        </p>
      </div>

      {submitMutation.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {(submitMutation.error as Error).message}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(v => submitMutation.mutate(v))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium text-sm">Full Name <span className="text-teal-600">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane Smith"
                    className="border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium text-sm">Email <span className="text-teal-600">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    className="border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">Company</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Property Group"
                      className="border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium text-sm">Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1 555 000 0000"
                      className="border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium text-sm">Message</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Tell us a bit about your properties and what you're looking for..."
                    className="border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-lg resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
            ) : (
              "Send Message"
            )}
          </Button>
          <p className="text-xs text-slate-400 text-center">
            We respect your privacy. Your details are never shared.
          </p>
        </form>
      </Form>
    </>
  );
}

function SuccessState({ embed }: { embed: boolean }) {
  return (
    <div className="text-center space-y-4 py-10">
      <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-9 h-9 text-teal-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Message sent!</h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
          Thanks for reaching out. Our team will be in touch within one business day.
        </p>
      </div>
      {embed && (
        <p className="text-xs text-slate-400 mt-4">
          You can close this window.
        </p>
      )}
    </div>
  );
}

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const embed = useEmbedMode();

  useEffect(() => {
    if (!embed) return;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, [embed]);

  if (embed) {
    return (
      <div style={{ width: "100%", background: "transparent", padding: "20px 24px" }}>
        {submitted ? (
          <SuccessState embed={true} />
        ) : (
          <ContactForm onSuccess={() => {
            setSubmitted(true);
            window.parent.postMessage({ type: "hubify:form_submitted" }, "*");
          }} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">
      <header className="py-5 px-6 flex items-center justify-center border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <a href="https://hubifyhomes.com" target="_blank" rel="noopener noreferrer">
          <img
            src={HUBIFY_HOMES_LOGO_URL}
            alt={HUBIFY_HOMES_LOGO_ALT}
            className="h-9 w-auto object-contain"
          />
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {submitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10">
              <SuccessState embed={false} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-8 bg-teal-500 rounded-full" />
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-widest">Get in touch</span>
              </div>
              <ContactForm onSuccess={() => setSubmitted(true)} />
            </div>
          )}
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} Hubify Homes. All rights reserved.
        <span className="mx-2">·</span>
        <a href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</a>
      </footer>
    </div>
  );
}

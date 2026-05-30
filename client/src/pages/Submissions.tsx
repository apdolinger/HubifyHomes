import { SubmissionForm, type SubmissionIntent } from "@/components/SubmissionForm";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";

const VALID_INTENTS = new Set<string>([
  "get_started", "need_demo", "beta_application",
  "pricing_starter", "pricing_growth", "pricing_professional",
  "pricing_operator", "pricing_enterprise",
]);

const INTENT_LABELS: Record<string, string> = {
  get_started:           "Get Started",
  need_demo:             "Request a Demo",
  beta_application:      "Apply for Beta",
  pricing_starter:       "Starter Portfolio",
  pricing_growth:        "Growth Portfolio",
  pricing_professional:  "Professional Portfolio",
  pricing_operator:      "Operator Portfolio",
  pricing_enterprise:    "Enterprise Portfolio",
};

function useQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get("embed") === "true";
  const rawIntent = params.get("intent") ?? "";
  const intent: SubmissionIntent | undefined = VALID_INTENTS.has(rawIntent)
    ? (rawIntent as SubmissionIntent)
    : undefined;
  return { embed, intent };
}

export default function Submissions() {
  const { embed, intent } = useQueryParams();
  const headerLabel = intent ? (INTENT_LABELS[intent] ?? "Get Started") : "Get Started";

  if (embed) {
    return (
      <div
        className="min-h-screen flex items-start justify-center p-4 pt-6"
        style={{ background: "transparent" }}
      >
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center justify-between">
            <img
              src={HUBIFY_HOMES_LOGO_URL}
              alt={HUBIFY_HOMES_LOGO_ALT}
              className="h-7 w-auto brightness-0 invert"
            />
            <span className="text-white/80 text-xs font-medium tracking-wide uppercase">{headerLabel}</span>
          </div>
          <div className="p-6">
            <SubmissionForm initialIntent={intent} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-50 flex flex-col">
      <header className="py-5 px-6 flex justify-center border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <a href="/">
          <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="h-10 object-contain" />
        </a>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Get Started with Hubify</h1>
            <p className="mt-2 text-slate-500 text-base max-w-lg mx-auto">
              Tell us about your property management business and we'll find the right plan for you.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <SubmissionForm initialIntent={intent} />
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white/60">
        &copy; {new Date().getFullYear()} Hubify Homes. All rights reserved.
        {" · "}
        <a href="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</a>
        {" · "}
        <a href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service</a>
      </footer>
    </div>
  );
}

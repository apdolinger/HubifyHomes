import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, CheckSquare, BarChart3, Menu, X, Star, MessageCircle, ChevronRight, Sparkles } from "lucide-react";
import { openCookiePreferences } from "@/lib/cookieConsent";
import { HUBIFY_HOMES_LOGO_URL, HUBIFY_HOMES_LOGO_ALT } from "@/lib/brand";
import SubmissionModal from "@/components/SubmissionModal";
import type { SubmissionIntent } from "@/components/SubmissionForm";

const PLANS = [
  {
    name: "Starter Portfolio",
    price: "$65",
    period: "/mo",
    range: "1–10 homes",
    description: "Everything you need to get your home watch business off the ground.",
    intent: "pricing_starter" as SubmissionIntent,
    features: ["Unlimited properties (up to 10)", "Task & inspection management", "Client portal", "Invoicing & billing"],
    highlight: false,
    badge: null,
  },
  {
    name: "Growth Portfolio",
    price: "$145",
    period: "/mo",
    range: "11–25 homes",
    description: "Scale your operations with team tools and advanced workflows.",
    intent: "pricing_growth" as SubmissionIntent,
    features: ["Everything in Starter", "Team collaboration tools", "Calendar & scheduling", "Advanced reporting"],
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Professional Portfolio",
    price: "$295",
    period: "/mo",
    range: "26–50 homes",
    description: "Full-featured platform for established estate management companies.",
    intent: "pricing_professional" as SubmissionIntent,
    features: ["Everything in Growth", "Multi-property portfolios", "Custom branding", "Priority support"],
    highlight: false,
    badge: null,
  },
];

const FEATURES = [
  {
    icon: Building,
    title: "Property Management",
    description: "Manage all your properties from a single, intuitive dashboard",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "Assign, track, and complete tasks with your team efficiently",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Keep your team connected with built-in messaging and notifications",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Get real-time insights into your property operations and team performance",
  },
];

interface BetaStatusData {
  open: boolean;
  activeBetaCount: number;
  totalCap: number;
  totalRemaining: number;
  tier1Filled: number;
  tier1Cap: number;
  tier1Remaining: number;
  tier2Filled: number;
  tier2Cap: number;
  tier2Remaining: number;
}

function TierFillBar({ filled, cap }: { filled: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, Math.round((filled / cap) * 100)) : 0;
  return (
    <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 mb-1">
      <div
        className="bg-white/70 h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BetaSection({ onApply }: { onApply: () => void }) {
  const { data, isError, isLoading } = useQuery<BetaStatusData>({
    queryKey: ["/api/public/beta-status"],
    staleTime: 60_000,
    retry: false,
  });

  const tier1Full = data ? data.tier1Remaining === 0 : false;
  const tier2Full = data ? data.tier2Remaining === 0 : false;
  const betaFull  = data ? !data.open : false;

  return (
    <div className="py-16 border-t border-slate-200">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-8 sm:p-12 text-white text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-teal-200" />
            <span className="text-teal-100 text-sm font-semibold uppercase tracking-widest">Founding Beta Program</span>
            <Sparkles className="w-5 h-5 text-teal-200" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Lock In Your Founding Discount</h2>
          <p className="text-teal-100 text-lg mb-6 max-w-xl mx-auto leading-relaxed">
            We're accepting a small group of founding members who get lifetime pricing discounts in exchange for early feedback.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {/* ── Tier 1: Founding 10 ── */}
            <div className={`bg-white/15 rounded-xl px-6 py-4 text-center transition-opacity duration-300 ${tier1Full ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="text-sm font-bold text-white">Founding 10</span>
              </div>
              <div className="text-2xl font-extrabold text-white">50% off</div>
              <div className="text-teal-200 text-xs mt-0.5">price locked for life</div>
              {data && (
                <>
                  <TierFillBar filled={data.tier1Filled} cap={data.tier1Cap} />
                  <p className="text-teal-100 text-xs">
                    {tier1Full
                      ? "Full"
                      : `${data.tier1Filled} of ${data.tier1Cap} filled · ${data.tier1Remaining} left`}
                  </p>
                </>
              )}
            </div>

            {/* ── Tier 2: Early Access 10 ── */}
            <div className={`bg-white/10 rounded-xl px-6 py-4 text-center transition-opacity duration-300 ${tier2Full ? "opacity-60" : ""}`}>
              <div className="text-sm font-bold text-teal-100 mb-1">Early Access 10</div>
              <div className="text-2xl font-extrabold text-white">25% off</div>
              <div className="text-teal-200 text-xs mt-0.5">price locked for life</div>
              {data && (
                <>
                  <TierFillBar filled={data.tier2Filled} cap={data.tier2Cap} />
                  <p className="text-teal-100 text-xs">
                    {tier2Full
                      ? "Full"
                      : `${data.tier2Filled} of ${data.tier2Cap} filled · ${data.tier2Remaining} left`}
                  </p>
                </>
              )}
            </div>
          </div>

          {betaFull ? (
            <p className="text-white/70 text-base font-medium italic">Beta Program Is Currently Full</p>
          ) : (
            <Button
              onClick={onApply}
              size="lg"
              className="bg-white text-teal-700 hover:bg-teal-50 font-bold px-8"
            >
              Apply for Beta Access
            </Button>
          )}

          <p className="text-teal-200 text-xs mt-4">
            {data ? (
              data.open
                ? `${data.activeBetaCount} of ${data.totalCap} spots filled — ${data.totalRemaining} remaining · No credit card required`
                : `All ${data.totalCap} beta spots are filled · No credit card required`
            ) : isLoading ? (
              <span className="inline-block bg-white/10 rounded animate-pulse w-56 h-3 align-middle" />
            ) : isError ? (
              "Limited spots available · No credit card required"
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isBetaOpen, setIsBetaOpen] = useState(false);
  const [pricingIntent, setPricingIntent] = useState<SubmissionIntent | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = async () => {
    if (import.meta.env.DEV) {
      try {
        const response = await fetch("/api/dev/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) window.location.reload();
      } catch (error) {
        console.error("Login failed:", error);
      }
    } else {
      window.location.href = "/staff/login";
    }
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-slate-900">Hubify</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Button onClick={() => setIsSubmitOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                Get Started
              </Button>
              <Button onClick={() => setIsDemoOpen(true)} variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50">
                Request a Demo
              </Button>
              <Button onClick={() => setIsContactOpen(true)} variant="ghost" className="text-slate-600 hover:text-teal-700">
                Contact
              </Button>
              <Button onClick={handleLogin} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Sign In
              </Button>
            </div>
            <button
              className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <button onClick={() => { setIsSubmitOpen(true); closeMobile(); }} className="w-full text-left px-4 py-3 rounded-lg bg-teal-600 text-white font-semibold text-base hover:bg-teal-700 transition-colors">
                Get Started
              </button>
              <button onClick={() => { setIsDemoOpen(true); closeMobile(); }} className="w-full text-left px-4 py-3 rounded-lg border border-teal-500 text-teal-700 font-semibold text-base hover:bg-teal-50 transition-colors">
                Request a Demo
              </button>
              <button onClick={() => { setIsBetaOpen(true); closeMobile(); }} className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-colors">
                Apply for Beta
              </button>
              <button onClick={() => { setIsContactOpen(true); closeMobile(); }} className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-colors">
                Get in Touch
              </button>
              <button onClick={() => { handleLogin(); closeMobile(); }} className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 text-slate-700 font-semibold text-base hover:bg-slate-50 transition-colors">
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="pt-16 pb-4 text-center">
          <div className="h-28 sm:h-36 overflow-hidden flex justify-center items-start mx-auto max-w-xs sm:max-w-sm mb-2">
            <img src={HUBIFY_HOMES_LOGO_URL} alt={HUBIFY_HOMES_LOGO_ALT} className="w-full h-auto" />
          </div>
          <p className="mt-0 max-w-md mx-auto text-base text-slate-600 sm:text-lg md:text-xl md:max-w-3xl">
            Professional property management platform for home watch and estate management companies
          </p>
        </div>

        <div className="text-center py-14">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Streamline Your Property Operations
          </h2>
          <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
            Manage properties, coordinate tasks, collaborate with your team, and deliver exceptional service to your clients.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setIsSubmitOpen(true)} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg">
              Get Started
            </Button>
            <Button onClick={() => setIsDemoOpen(true)} size="lg" variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50 px-8 py-3 text-lg">
              Request a Demo
            </Button>
            <Button onClick={handleLogin} size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3 text-lg">
              Sign In
            </Button>
          </div>
        </div>

        {/* ── Features Grid ────────────────────────────────────────────────── */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <div className="py-16 border-t border-slate-200">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-slate-500">
              Choose the plan that fits your portfolio. Every plan includes a free trial — no credit card required.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 p-8 flex flex-col transition-shadow ${
                  plan.highlight
                    ? "border-teal-500 shadow-xl shadow-teal-100 bg-white"
                    : "border-slate-200 bg-white hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-1">{plan.range}</p>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                </div>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                      <ChevronRight className="w-4 h-4 text-teal-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setPricingIntent(plan.intent)}
                  className={
                    plan.highlight
                      ? "w-full bg-teal-600 hover:bg-teal-700 text-white"
                      : "w-full border-teal-400 text-teal-700 hover:bg-teal-50 bg-white border"
                  }
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 mt-8">
            Need more than 50 homes? <button onClick={() => setIsContactOpen(true)} className="text-teal-600 hover:underline font-medium">Contact us</button> for Operator and Enterprise plans.
          </p>
        </div>

        {/* ── Beta Program ─────────────────────────────────────────────────── */}
        <BetaSection onApply={() => setIsBetaOpen(true)} />

        {/* ── Marketing site link ───────────────────────────────────────────── */}
        <div className="text-center py-8 border-t border-slate-200">
          <p className="text-slate-500 text-sm mb-3">Looking for more information about Hubify Homes?</p>
          <a
            href="https://hubifyhomes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium text-sm border border-teal-200 hover:border-teal-400 rounded-lg px-5 py-2.5 transition-colors hover:bg-teal-50"
          >
            Visit hubifyhomes.com
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>

        {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
        <div className="text-center py-16 border-t border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900">Ready to transform your property management?</h3>
          <p className="mt-4 text-lg text-slate-600">Join professional property managers who trust Hubify</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setIsSubmitOpen(true)} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white">
              Request Access
            </Button>
            <Button onClick={() => setIsDemoOpen(true)} size="lg" variant="outline" className="border-teal-500 text-teal-700 hover:bg-teal-50">
              Request a Demo
            </Button>
            <Button onClick={() => setIsContactOpen(true)} size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              Get in Touch
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <SubmissionModal open={isSubmitOpen} onOpenChange={setIsSubmitOpen} />
      <SubmissionModal open={isDemoOpen} onOpenChange={setIsDemoOpen} initialIntent="need_demo" />
      <SubmissionModal open={isContactOpen} onOpenChange={setIsContactOpen} initialIntent="contact" />
      <SubmissionModal open={isBetaOpen} onOpenChange={setIsBetaOpen} initialIntent="beta_application" />
      <SubmissionModal
        open={!!pricingIntent}
        onOpenChange={(o) => { if (!o) setPricingIntent(null); }}
        initialIntent={pricingIntent ?? undefined}
      />

      {/* ── Floating "Get in Touch" button ────────────────────────────────── */}
      <button
        onClick={() => setIsContactOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-3 rounded-full shadow-lg transition-colors"
        aria-label="Get in Touch"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Get in Touch</span>
      </button>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-600">
            <div className="text-center sm:text-left">
              <p>
                © {new Date().getFullYear()} Hubify. All rights reserved.
                {" "}
                <a href="/privacy" className="text-teal-600 hover:underline" data-testid="link-privacy">Privacy Policy</a>
                {" · "}
                <a href="/terms" className="text-teal-600 hover:underline" data-testid="link-terms">Terms of Service</a>
                {" · "}
                <button type="button" onClick={openCookiePreferences} className="text-teal-600 hover:underline" data-testid="link-cookie-preferences">
                  Cookie preferences
                </button>
              </p>
            </div>
            <div>
              <a href="/super-admin/login" className="text-teal-600 hover:underline" data-testid="link-super-admin">
                Super Admin
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

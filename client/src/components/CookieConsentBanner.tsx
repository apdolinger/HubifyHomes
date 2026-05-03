import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X } from "lucide-react";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  COOKIE_CONSENT_SUPPRESS_EVENT,
  COOKIE_CONSENT_VERSION,
  loadConsent,
  saveConsent,
  type CookieConsentState,
} from "@/lib/cookieConsent";

export default function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    const existing = loadConsent();
    if (!existing) {
      setOpen(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  useEffect(() => {
    const onOpen = () => {
      const existing = loadConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setShowCustomize(true);
      setOpen(true);
    };
    const onSuppress = (e: Event) => {
      const detail = (e as CustomEvent<{ suppressed: boolean }>).detail;
      setSuppressed(!!detail?.suppressed);
    };
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    window.addEventListener(COOKIE_CONSENT_SUPPRESS_EVENT, onSuppress);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
      window.removeEventListener(COOKIE_CONSENT_SUPPRESS_EVENT, onSuppress);
    };
  }, []);

  const persist = async (next: CookieConsentState) => {
    try {
      await fetch("/api/me/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          version: next.version,
          essential: true,
          analytics: next.analytics,
          marketing: next.marketing,
        }),
      });
    } catch {
      // best-effort; localStorage already saved
    }
  };

  const handleAcceptAll = async () => {
    const next = saveConsent({ analytics: true, marketing: true });
    await persist(next);
    setAnalytics(true);
    setMarketing(true);
    setOpen(false);
    setShowCustomize(false);
  };

  const handleRejectNonEssential = async () => {
    const next = saveConsent({ analytics: false, marketing: false });
    await persist(next);
    setAnalytics(false);
    setMarketing(false);
    setOpen(false);
    setShowCustomize(false);
  };

  const handleSavePreferences = async () => {
    const next = saveConsent({ analytics, marketing });
    await persist(next);
    setOpen(false);
    setShowCustomize(false);
  };

  if (suppressed || !open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none"
      data-testid="cookie-consent-banner"
    >
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white shadow-lg pointer-events-auto dark:bg-gray-900 dark:border-gray-700">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">We use cookies</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                We use essential cookies to run Hubify. With your permission, we'd also like to use analytics and marketing cookies to improve the product. You can change your choice anytime from "Cookie preferences" in the footer. See our{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>

              {showCustomize && (
                <div className="mt-4 space-y-3 rounded-md border border-slate-200 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">Essential</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Required for sign-in, security, and core features. Always on.</div>
                    </div>
                    <Switch checked disabled aria-label="Essential cookies (always on)" data-testid="switch-cookie-essential" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">Analytics</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Helps us understand how Hubify is used so we can improve it.</div>
                    </div>
                    <Switch
                      checked={analytics}
                      onCheckedChange={setAnalytics}
                      aria-label="Analytics cookies"
                      data-testid="switch-cookie-analytics"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">Marketing</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Used to share product news that may be relevant to you.</div>
                    </div>
                    <Switch
                      checked={marketing}
                      onCheckedChange={setMarketing}
                      aria-label="Marketing cookies"
                      data-testid="switch-cookie-marketing"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                {!showCustomize && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomize(true)}
                    data-testid="button-cookie-customize"
                  >
                    Customize
                  </Button>
                )}
                {showCustomize ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSavePreferences}
                    data-testid="button-cookie-save"
                  >
                    Save preferences
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRejectNonEssential}
                    data-testid="button-cookie-reject"
                  >
                    Reject non-essential
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-cookie-accept"
                >
                  Accept all
                </Button>
              </div>
              <p className="sr-only">Cookie consent version {COOKIE_CONSENT_VERSION}</p>
            </div>
            <button
              type="button"
              aria-label="Close cookie banner"
              onClick={handleRejectNonEssential}
              className="ml-2 -mt-1 -mr-1 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              data-testid="button-cookie-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

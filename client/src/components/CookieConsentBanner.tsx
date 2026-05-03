import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cookie, X } from "lucide-react";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  COOKIE_CONSENT_SUPPRESS_EVENT,
  COOKIE_CONSENT_VERSION,
  loadConsent,
  saveConsent,
  type CookieConsentState,
} from "@/lib/cookieConsent";

type ServerConsent = {
  version: number;
  essential: boolean;
  analytics: boolean;
  preference: boolean;
  decidedAt?: string | Date | null;
} | null;

async function fetchServerConsent(): Promise<ServerConsent> {
  try {
    const res = await fetch("/api/me/cookie-consent", { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as ServerConsent;
      if (data) return data;
    }
  } catch {
    // ignore
  }
  try {
    const portalToken = localStorage.getItem("portal_token");
    if (portalToken) {
      const res = await fetch("/api/portal/me/cookie-consent", {
        headers: { Authorization: `Bearer ${portalToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as ServerConsent;
        if (data) return data;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export default function CookieConsentBanner() {
  const [bannerOpen, setBannerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preference, setPreference] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadConsent();
      const server = await fetchServerConsent();
      if (cancelled) return;

      if (server && server.version === COOKIE_CONSENT_VERSION) {
        const next = saveConsent({
          analytics: !!server.analytics,
          preference: !!server.preference,
        });
        setAnalytics(next.analytics);
        setPreference(next.preference);
        setBannerOpen(false);
      } else if (local) {
        setAnalytics(local.analytics);
        setPreference(local.preference);
        setBannerOpen(false);
      } else {
        setBannerOpen(true);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onOpen = () => {
      const existing = loadConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setPreference(existing.preference);
      }
      setDialogOpen(true);
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
    const body = JSON.stringify({
      version: next.version,
      essential: true,
      analytics: next.analytics,
      preference: next.preference,
    });
    try {
      await fetch("/api/me/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });
    } catch {
      // ignore
    }
    try {
      const portalToken = localStorage.getItem("portal_token");
      if (portalToken) {
        await fetch("/api/portal/me/cookie-consent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${portalToken}`,
          },
          body,
        });
      }
    } catch {
      // ignore
    }
  };

  const closeAll = () => {
    setBannerOpen(false);
    setDialogOpen(false);
  };

  const handleAcceptAll = async () => {
    const next = saveConsent({ analytics: true, preference: true });
    await persist(next);
    setAnalytics(true);
    setPreference(true);
    closeAll();
  };

  const handleRejectNonEssential = async () => {
    const next = saveConsent({ analytics: false, preference: false });
    await persist(next);
    setAnalytics(false);
    setPreference(false);
    closeAll();
  };

  const handleSavePreferences = async () => {
    const next = saveConsent({ analytics, preference });
    await persist(next);
    closeAll();
  };

  const openCustomize = () => {
    const existing = loadConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setPreference(existing.preference);
    }
    setDialogOpen(true);
  };

  if (!hydrated || suppressed) return null;

  return (
    <>
      {bannerOpen && !dialogOpen && (
        <div
          role="region"
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
                    We use essential cookies to run Hubify. With your permission, we'd also like to use preference and analytics cookies to remember your settings and improve the product. You can change your choice anytime from "Cookie preferences" in the footer. See our{" "}
                    <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                  </p>

                  <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openCustomize}
                      data-testid="button-cookie-customize"
                    >
                      Customize
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRejectNonEssential}
                      data-testid="button-cookie-reject"
                    >
                      Reject non-essential
                    </Button>
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-cookie-preferences">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-4 w-4" /> Cookie preferences
            </DialogTitle>
            <DialogDescription>
              Choose which categories of cookies Hubify can use. Essential cookies are always on. See our{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> for details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-gray-700 p-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Essential</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Required for sign-in, security, and core features. Always on.</div>
              </div>
              <Switch checked disabled aria-label="Essential cookies (always on)" data-testid="switch-cookie-essential" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-gray-700 p-3">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Preference</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Remember your settings — table layouts, dashboard widgets, calendar display, and other UI preferences.</div>
              </div>
              <Switch
                checked={preference}
                onCheckedChange={setPreference}
                aria-label="Preference cookies"
                data-testid="switch-cookie-preference"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-gray-700 p-3">
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
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRejectNonEssential}
              data-testid="button-cookie-reject"
            >
              Reject non-essential
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePreferences}
              data-testid="button-cookie-save"
            >
              Save preferences
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptAll}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-cookie-accept"
            >
              Accept all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

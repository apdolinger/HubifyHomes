import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  loadConsent,
  openCookiePreferences,
  type CookieConsentState,
} from "@/lib/cookieConsent";

export function useCookieConsent() {
  const [state, setState] = useState<CookieConsentState | null>(() => {
    if (typeof window === "undefined") return null;
    return loadConsent();
  });

  useEffect(() => {
    const refresh = () => setState(loadConsent());
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsentState>).detail;
      if (detail) setState(detail);
      else refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "hubify_cookie_consent_v1") refresh();
    };
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const open = useCallback(() => openCookiePreferences(), []);

  return {
    consent: state,
    hasDecided: !!state,
    essential: true as const,
    preference: state?.preference === true,
    analytics: state?.analytics === true,
    openPreferences: open,
  };
}

export default useCookieConsent;

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = "hubify_cookie_consent_v1";
export const COOKIE_CONSENT_OPEN_EVENT = "hubify:cookie-consent-open";
export const COOKIE_CONSENT_CHANGED_EVENT = "hubify:cookie-consent-changed";
export const COOKIE_CONSENT_SUPPRESS_EVENT = "hubify:cookie-consent-suppress";

export type CookieConsentCategories = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentState = {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function loadConsent(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (!parsed || parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return { ...parsed, essential: true };
  } catch {
    return null;
  }
}

export function saveConsent(state: Omit<CookieConsentState, "version" | "decidedAt" | "essential"> & { decidedAt?: string }): CookieConsentState {
  const next: CookieConsentState = {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    analytics: state.analytics,
    marketing: state.marketing,
    decidedAt: state.decidedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  try {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: next }));
  } catch {
    // ignore
  }
  return next;
}

export function clearConsent() {
  try {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function openCookiePreferences() {
  try {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
  } catch {
    // ignore
  }
}

export function suppressCookieBanner(suppressed: boolean) {
  try {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_SUPPRESS_EVENT, { detail: { suppressed } }));
  } catch {
    // ignore
  }
}

// Analytics gate: any future analytics scripts (GA, Segment, PostHog, etc.) must
// be initialized only when this returns true. Marketing scripts must check the
// marketing flag. Essential cookies (auth/session) require no consent.
export function isAnalyticsAllowed(): boolean {
  return loadConsent()?.analytics === true;
}

export function isMarketingAllowed(): boolean {
  return loadConsent()?.marketing === true;
}

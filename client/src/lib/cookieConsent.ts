export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = "hubify_cookie_consent_v1";
export const COOKIE_CONSENT_MIRROR_COOKIE = "hubify_consent";
export const COOKIE_CONSENT_OPEN_EVENT = "hubify:cookie-consent-open";
export const COOKIE_CONSENT_CHANGED_EVENT = "hubify:cookie-consent-changed";
export const COOKIE_CONSENT_SUPPRESS_EVENT = "hubify:cookie-consent-suppress";

export type CookieConsentCategories = {
  essential: true;
  preference: boolean;
  analytics: boolean;
};

export type CookieConsentState = {
  version: number;
  essential: true;
  preference: boolean;
  analytics: boolean;
  decidedAt: string;
};

const PREFERENCE_KEY_REGISTRY = new Set<string>();
const PREFERENCE_KEY_PREFIXES = new Set<string>();

// Pre-register the well-known preference keys used by the app today so that
// revoking the Preference category clears them even if their components have
// not yet been mounted in the current session.
[
  "taskTableColumns",
  "propertyTableColumns",
  "clientsTableColumns",
  "clientsStatsWidgets",
  "teamTableColumns",
  "teamStatsWidgets",
  "teamMemberProfileStatsWidgets",
  "vendorsTableColumns",
  "communityTableColumns",
  "dashboardWidgets",
  "fieldModeEnabled",
].forEach((k) => PREFERENCE_KEY_REGISTRY.add(k));
PREFERENCE_KEY_PREFIXES.add("calendar-settings-");

export function registerPreferenceKey(key: string) {
  PREFERENCE_KEY_REGISTRY.add(key);
}

export function registerPreferenceKeyPrefix(prefix: string) {
  PREFERENCE_KEY_PREFIXES.add(prefix);
}

export function loadConsent(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (!parsed || parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      preference: !!parsed.preference,
      analytics: !!parsed.analytics,
      decidedAt: parsed.decidedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function setMirrorCookie(state: CookieConsentState | null) {
  try {
    if (!state) {
      document.cookie = `${COOKIE_CONSENT_MIRROR_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      return;
    }
    const value = encodeURIComponent(
      JSON.stringify({
        v: state.version,
        e: 1,
        p: state.preference ? 1 : 0,
        a: state.analytics ? 1 : 0,
      }),
    );
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_CONSENT_MIRROR_COOKIE}=${value}; path=/; max-age=${oneYear}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function saveConsent(
  input: { preference: boolean; analytics: boolean; decidedAt?: string },
): CookieConsentState {
  const next: CookieConsentState = {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    preference: !!input.preference,
    analytics: !!input.analytics,
    decidedAt: input.decidedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  setMirrorCookie(next);

  // Whenever Preference cookies are not accepted, clear any previously-stored
  // preference data — covers both revoke and a first-time reject with legacy
  // keys already on disk.
  if (!next.preference) {
    clearPreferenceData();
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
  setMirrorCookie(null);
}

export function clearPreferenceData() {
  try {
    // Remove explicitly registered keys.
    const registered = Array.from(PREFERENCE_KEY_REGISTRY);
    for (let i = 0; i < registered.length; i++) {
      try { localStorage.removeItem(registered[i]); } catch { /* ignore */ }
    }
    // Sweep prefix-matched keys.
    const prefixes = Array.from(PREFERENCE_KEY_PREFIXES);
    if (prefixes.length > 0) {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        for (let p = 0; p < prefixes.length; p++) {
          if (key.startsWith(prefixes[p])) {
            toRemove.push(key);
            break;
          }
        }
      }
      for (let i = 0; i < toRemove.length; i++) {
        try { localStorage.removeItem(toRemove[i]); } catch { /* ignore */ }
      }
    }
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
// be initialized only when this returns true. Essential cookies (auth/session)
// require no consent. Preference cookies gate UI prefs (theme, table column
// configs, dashboard widget layouts, calendar display settings, etc.).
export function isAnalyticsAllowed(): boolean {
  return loadConsent()?.analytics === true;
}

export function isPreferenceAllowed(): boolean {
  return loadConsent()?.preference === true;
}

// Storage helper for non-essential preference data. Both reads and writes are
// gated on Preference consent so the app never applies stored UI preferences
// unless the user has agreed to that category. Removals always run. Each
// interacted key is auto-registered for clear-on-revoke behavior.
export const prefStorage = {
  getItem(key: string): string | null {
    registerPreferenceKey(key);
    if (!isPreferenceAllowed()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    registerPreferenceKey(key);
    if (!isPreferenceAllowed()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Analytics initialization gate. Wrap any analytics script bootstrap in this.
// Today this is a no-op since no analytics provider is wired up.
export function withAnalyticsConsent(initFn: () => void) {
  if (isAnalyticsAllowed()) {
    try { initFn(); } catch { /* ignore */ }
  }
}

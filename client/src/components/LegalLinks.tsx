import { openCookiePreferences } from "@/lib/cookieConsent";

interface LegalLinksProps {
  className?: string;
  includeCookiePreferences?: boolean;
}

export default function LegalLinks({ className = "", includeCookiePreferences = true }: LegalLinksProps) {
  return (
    <div className={`text-center text-xs text-slate-500 dark:text-slate-400 ${className}`} data-testid="legal-links">
      <a href="/privacy" className="hover:underline" data-testid="link-privacy">
        Privacy Policy
      </a>
      <span className="mx-2">·</span>
      <a href="/terms" className="hover:underline" data-testid="link-terms">
        Terms of Service
      </a>
      {includeCookiePreferences && (
        <>
          <span className="mx-2">·</span>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="hover:underline"
            data-testid="link-cookie-preferences"
          >
            Cookie preferences
          </button>
        </>
      )}
    </div>
  );
}

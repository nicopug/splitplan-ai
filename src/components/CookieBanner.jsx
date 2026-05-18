import { useState, useEffect } from 'react';

const CONSENT_KEY = 'cookieConsent';

export function getCookieConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

export default function CookieBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setVisible(false);
    onConsentChange?.('true');
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'false');
    setVisible(false);
    onConsentChange?.('false');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-700 flex-1">
          Usiamo cookie analitici (Google Analytics, PostHog) per migliorare l'esperienza.
          Puoi accettarli o continuare con i soli cookie necessari.{' '}
          <a href="/privacy" className="underline text-[var(--accent-primary)] font-medium">
            Privacy Policy
          </a>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Solo necessari
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity font-medium"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}

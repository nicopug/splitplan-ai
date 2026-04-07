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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-[var(--text-secondary)] flex-1">
          Usiamo cookie analitici (Google Analytics, PostHog) per migliorare l'esperienza.
          Puoi accettarli o continuare con i soli cookie necessari.{' '}
          <a href="/privacy" className="underline text-[var(--accent-primary)]">
            Privacy Policy
          </a>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
          >
            Solo necessari
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}

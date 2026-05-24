import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const CONSENT_KEY = 'cookieConsent';

export function getCookieConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

export default function CookieBanner({ onConsentChange }) {
  const { t } = useTranslation();
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
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm flex-1" style={{ color: 'var(--text-muted)' }}>
          {t('cookies.message', "Usiamo cookie analitici (Google Analytics, PostHog) per migliorare l'esperienza. Puoi accettarli o continuare con i soli cookie necessari.")}{' '}
          <a href="/privacy" className="underline font-medium" style={{ color: '#0066ff' }}>
            {t('cookies.privacy_link', 'Privacy Policy')}
          </a>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              backgroundColor: 'transparent',
            }}
          >
            {t('cookies.necessary_only', 'Solo necessari')}
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm rounded hover:opacity-90 transition-opacity font-medium text-white"
            style={{ backgroundColor: '#0066ff' }}
          >
            {t('cookies.accept', 'Accetta')}
          </button>
        </div>
      </div>
    </div>
  );
}

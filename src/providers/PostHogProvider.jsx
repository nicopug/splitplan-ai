import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { getCookieConsent } from '../components/CookieBanner';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;

// Inizializza PostHog solo se l'utente ha dato consenso
if (POSTHOG_KEY && POSTHOG_HOST && getCookieConsent() === 'true') {
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        person_profiles: 'always',
        capture_pageview: false,  // gestito manualmente in App.jsx
    });
    window.posthog = posthog;
}

// Funzione chiamabile da App.jsx quando l'utente accetta i cookie
export function initPostHog() {
    if (!POSTHOG_KEY || !POSTHOG_HOST) return;
    if (posthog.__loaded) return; // già inizializzato
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        person_profiles: 'always',
        capture_pageview: false,
    });
    window.posthog = posthog;
}

export default function PostHogProvider({ children }) {
    if (!POSTHOG_KEY || !POSTHOG_HOST) {
        return children;
    }
    return <PHProvider client={posthog}>{children}</PHProvider>;
}

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;

console.log('[PostHog] Initializing with key:', POSTHOG_KEY ? 'Found' : 'MISSING');

if (POSTHOG_KEY && POSTHOG_HOST) {
    posthog.init(POSTHOG_KEY, {
        api_host:         POSTHOG_HOST,
        autocapture:      true,
        person_profiles:  'always',
        capture_pageview: false,  // gestito manualmente in App.jsx
    });
    window.posthog = posthog;
}

export default function PostHogProvider({ children }) {
    if (!POSTHOG_KEY || !POSTHOG_HOST) {
        return children;
    }
    return <PHProvider client={posthog}>{children}</PHProvider>;
}

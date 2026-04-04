import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;

if (POSTHOG_KEY && POSTHOG_HOST) {
    posthog.init(POSTHOG_KEY, {
        api_host:        POSTHOG_HOST,
        autocapture:     true,
        person_profiles: 'identified_only',
        capture_pageview: false,  // gestiamo manualmente in App.jsx
    });
}

export default function PostHogProvider({ children }) {
    if (!POSTHOG_KEY || !POSTHOG_HOST) {
        return children;
    }
    return <PHProvider client={posthog}>{children}</PHProvider>;
}

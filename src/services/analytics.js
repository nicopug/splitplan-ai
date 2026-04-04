import ReactGA from 'react-ga4';

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initGA() {
    if (!MEASUREMENT_ID) return;
    ReactGA.initialize(MEASUREMENT_ID);
}

export function trackPageView(path) {
    if (!MEASUREMENT_ID) return;
    ReactGA.send({ hitType: 'pageview', page: path });
}

export function trackEvent(category, action, label) {
    if (!MEASUREMENT_ID) return;
    ReactGA.event({ category, action, label });
}

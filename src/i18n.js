import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import translationIT from '../public/locales/it/translation.json';
import translationEN from '../public/locales/en/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'it',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        resources: {
            it: { translation: translationIT },
            en: { translation: translationEN },
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        }
    });

export default i18n;

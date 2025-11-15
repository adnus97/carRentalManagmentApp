import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],

    // Load both namespaces
    ns: ['common', 'auth', 'layout', 'cars'],
    defaultNS: 'common',

    interpolation: { escapeValue: false },
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['querystring', 'localStorage', 'cookie', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      caches: ['localStorage', 'cookie'],
    },
    react: { useSuspense: true },
    debug: import.meta.env.DEV,
  });

export default i18n;

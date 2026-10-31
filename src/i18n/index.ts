import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './de.json';

export const resources = { de: { translation: de } } as const;
export type SupportedLanguage = keyof typeof resources;
export const defaultLanguage: SupportedLanguage = 'de';

/** Gerätesprache, falls unterstützt – sonst Deutsch. Vorbereitung für weitere Sprachen. */
export function detectLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode;
  return code && code in resources ? (code as SupportedLanguage) : defaultLanguage;
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: defaultLanguage,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;

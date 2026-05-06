import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import es from '../locales/es.json';

const LANG_KEY = 'pot_of_gold:language';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
const defaultLanguage = deviceLocale.startsWith('es') ? 'es' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Call once on app start — applies saved language preference over device default. */
export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'es') {
      await i18n.changeLanguage(saved);
    }
  } catch {}
}

/** Switch app language and persist the choice. */
export async function saveLanguage(lang: 'en' | 'es'): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export default i18n;

// Re-export for convenient use in screens/components
export { useTranslation } from 'react-i18next';

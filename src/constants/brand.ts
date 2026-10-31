import Constants from 'expo-constants';

/**
 * Marken-Werte zur Laufzeit. Quelle ist ausschließlich app.config.ts (extra.brand).
 * Nirgends sonst den App-Namen hart codieren.
 */
type Brand = {
  name: string;
  slug: string;
  scheme: string;
  bundleIdentifier: string;
  supportEmail: string;
};

const brand = (Constants.expoConfig?.extra as { brand?: Brand } | undefined)?.brand;

if (!brand) {
  throw new Error('extra.brand fehlt in app.config.ts');
}

export const BRAND: Brand = brand;

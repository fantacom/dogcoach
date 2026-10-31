import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Einzige Quelle für Marken-Werte (Name ist Platzhalter).
 * Die App liest sie zur Laufzeit über src/constants/brand.ts.
 */
const BRAND = {
  name: 'DogCoach',
  slug: 'dogcoach',
  scheme: 'dogcoach',
  bundleIdentifier: 'de.fantacom.dogcoach',
  supportEmail: 'info@fantacom.de',
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: BRAND.name,
  slug: BRAND.slug,
  scheme: BRAND.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: BRAND.bundleIdentifier,
  },
  android: {
    package: BRAND.bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF7F2',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  extra: {
    brand: BRAND,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});

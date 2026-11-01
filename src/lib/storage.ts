import { Platform } from 'react-native';

import { createChunkedStorage } from './secureStorage';

/** Kleiner Schlüssel-Wert-Speicher: Web = localStorage, iOS/Android = Keychain. */
export const appStorage =
  Platform.OS === 'web'
    ? {
        getItem: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        setItem: async (key: string, value: string) => {
          globalThis.localStorage?.setItem(key, value);
        },
        removeItem: async (key: string) => {
          globalThis.localStorage?.removeItem(key);
        },
      }
    : createChunkedStorage();

import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { createChunkedStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY fehlen. Siehe .env.example.',
  );
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient(url, anonKey, {
  auth: {
    // Web: localStorage (Standard von supabase-js). Native: Keychain via SecureStore.
    storage: isWeb ? undefined : createChunkedStorage(),
    autoRefreshToken: true,
    persistSession: true,
    // Den Magic-Link-Rücksprung verarbeiten wir selbst in src/app/callback.tsx.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Token-Refresh nur, solange die App im Vordergrund ist (Empfehlung von Supabase für RN).
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

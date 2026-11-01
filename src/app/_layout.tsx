import '@/global.css';
import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { subscribeToAuth } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const guest = useAuthStore((s) => s.guest);

  // Gast-Schalter wird auf iOS asynchron aus dem Keychain geladen.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const ready = initialized && hydrated;

  useEffect(() => subscribeToAuth(), []);
  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const isLoggedIn = session !== null || guest;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="login" />
            <Stack.Screen name="callback" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

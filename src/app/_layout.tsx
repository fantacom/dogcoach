import '@/global.css';
import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureSession, subscribeToAuth } from '@/lib/auth';
import { subscribeToNotificationTaps } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const bootError = useAuthStore((s) => s.bootError);

  useEffect(() => subscribeToAuth(), []);
  useEffect(() => {
    if (initialized && !session) void ensureSession();
  }, [initialized, session]);
  useEffect(() => {
    if (initialized) void SplashScreen.hideAsync();
  }, [initialized]);
  useEffect(() => (session ? subscribeToNotificationTaps() : undefined), [session]);

  let content;
  if (!initialized) content = null;
  else if (bootError) content = <ErrorView message={`${t('boot.errorTitle')}. ${t('boot.errorBody')}`} onRetry={() => void ensureSession()} />;
  else if (!session) content = <LoadingView />;
  else
    content = (
      <Stack
        screenOptions={{
          headerBackTitle: t('common.back'),
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ title: t('auth.title'), presentation: 'modal' }} />
        <Stack.Screen name="link-email" options={{ title: t('auth.linkTitle'), presentation: 'modal' }} />
        <Stack.Screen name="callback" options={{ headerShown: false }} />
        <Stack.Screen name="dog/new" options={{ title: t('dogForm.titleNew') }} />
        <Stack.Screen name="dog/[id]/edit" options={{ title: t('dogForm.titleEdit') }} />
        <Stack.Screen name="dog/[id]/temperament" options={{ title: t('temperament.title') }} />
        <Stack.Screen name="analysis/new" options={{ title: t('analysis.new') }} />
        <Stack.Screen name="analysis/[id]" options={{ title: t('analysis.result') }} />
        <Stack.Screen name="plan/[id]" options={{ title: t('plan.title') }} />
        <Stack.Screen name="community/new" options={{ title: t('community.newTitle') }} />
        <Stack.Screen name="community/[id]" options={{ title: t('community.title') }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
        <Stack.Screen name="premium" options={{ title: t('premium.title'), presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ title: t('admin.title') }} />
      </Stack>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {content}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

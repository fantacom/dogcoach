import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { ErrorView, LoadingView } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
    );
  };
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { dogs, isLoading, isError, refetch } = useCurrentDog();

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorView onRetry={() => void refetch()} />;
  if (dogs.length === 0) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.today'), tabBarIcon: icon('sunny-outline') }}
      />
      <Tabs.Screen
        name="analysis"
        options={{ title: t('tabs.analysis'), tabBarIcon: icon('camera-outline') }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: t('tabs.community'), tabBarIcon: icon('chatbubbles-outline') }}
      />
      <Tabs.Screen
        name="my-dog"
        options={{ title: t('tabs.myDog'), tabBarIcon: icon('paw-outline') }}
      />
    </Tabs>
  );
}

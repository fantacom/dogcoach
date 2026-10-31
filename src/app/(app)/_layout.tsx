import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColorValue, useColorScheme } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
    );
  };
}

export default function AppTabsLayout() {
  const { t } = useTranslation();
  const dark = useColorScheme() === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? '#7CC4A8' : '#2F6B57',
        tabBarInactiveTintColor: dark ? '#B5B0A7' : '#5E5A53',
        tabBarStyle: {
          backgroundColor: dark ? '#1F1E1B' : '#FFFFFF',
          borderTopColor: dark ? '#3A3833' : '#DDD7CD',
        },
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

import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DogForm } from '@/components/dog/DogForm';
import { Button, Screen, Text } from '@/components/ui';
import { BRAND } from '@/constants/brand';
import { useDogs } from '@/lib/api/dogs';

/** Onboarding: Begrüßung, dann ersten Hund anlegen (CLAUDE.md §3.1, PROMPTS Phase 2). */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const dogs = useDogs();
  const [step, setStep] = useState<'welcome' | 'dog'>('welcome');

  if (dogs.data && dogs.data.length > 0 && step === 'welcome') return <Redirect href="/" />;

  if (step === 'welcome') {
    const points = t('onboarding.points', { returnObjects: true }) as string[];
    return (
      <Screen className="justify-center">
        <View className="gap-6">
          <Text variant="caption" className="font-semibold uppercase tracking-widest">
            {BRAND.name}
          </Text>
          <Text variant="title">{t('onboarding.title', { name: BRAND.name })}</Text>
          <Text>{t('onboarding.body')}</Text>
          <View className="gap-2">
            {points.map((p) => (
              <Text key={p}>✓ {p}</Text>
            ))}
          </View>
          <Button
            title={t('onboarding.start')}
            onPress={() => setStep('dog')}
            testID="onboarding-start"
          />
          <Button
            title={t('settings.signInOther')}
            variant="ghost"
            onPress={() => router.push('/login')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">{t('dogForm.titleNew')}</Text>
      <DogForm
        onSaved={(dog) =>
          router.replace({
            pathname: '/dog/[id]/temperament',
            params: { id: dog.id, onboarding: '1' },
          })
        }
      />
    </Screen>
  );
}

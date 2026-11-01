import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { breedToTraits, type BreedTraits, TRAITS, type Traits, traitLevel } from '@shared/temperament.ts';
import { Button, Card, Section, Text } from '@/components/ui';
import { useBreeds } from '@/lib/api/dogs';
import { useTemperament } from '@/lib/api/temperament';
import type { Dog } from '@/types/db';

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <View className="h-2 flex-1 flex-row overflow-hidden rounded-full bg-border dark:bg-border-dark" accessibilityLabel={label}>
      <View className="bg-primary dark:bg-primary-dark" style={{ width: `${(value / 5) * 100}%` }} />
    </View>
  );
}

/** Wesensprofil als Karten mit „Was das für dich bedeutet“ (CLAUDE.md §3.1). */
export function TemperamentCards({ dog }: { dog: Dog }) {
  const { t } = useTranslation();
  const temperament = useTemperament(dog.id);
  const breeds = useBreeds();
  const breedTraits = [dog.breed_primary_id, dog.breed_secondary_id]
    .map((id) => breeds.data?.find((b) => b.id === id)?.base_traits)
    .filter(Boolean) as BreedTraits[];
  const traits: Traits | null = temperament.data?.traits ?? (breedTraits.length ? breedToTraits(breedTraits) : null);
  const fromQuestionnaire = !!temperament.data?.traits;

  return (
    <Section title={t('temperament.cardTitle')}>
      {!traits ? <Text variant="caption">{t('temperament.empty', { name: dog.name })}</Text> : null}
      {traits && !fromQuestionnaire ? <Text variant="caption">{t('temperament.breedOnly')}</Text> : null}
      {traits
        ? TRAITS.filter((k) => traits[k] !== undefined).map((k) => {
            const v = traits[k]!;
            const scale = t('temperament.scale', { value: v.toFixed(1).replace('.', ',') });
            return (
              <Card key={k}>
                <View className="flex-row items-center gap-3">
                  <Text className="w-32 font-semibold">{t(`temperament.traits.${k}.label` as never)}</Text>
                  <Meter value={v} label={scale} />
                </View>
                <Text variant="caption">{t('temperament.meaning')}</Text>
                <Text>{t(`temperament.traits.${k}.${traitLevel(v)}` as never, { name: dog.name })}</Text>
              </Card>
            );
          })
        : null}
      <Button
        title={fromQuestionnaire ? t('temperament.redo') : t('temperament.start')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/dog/[id]/temperament', params: { id: dog.id } })}
      />
    </Section>
  );
}

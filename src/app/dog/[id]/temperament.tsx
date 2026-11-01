import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { type Answers, type BreedTraits, QUESTIONS } from '@shared/temperament.ts';
import { Button, Chip, ErrorView, LoadingView, Screen, Text } from '@/components/ui';
import { useBreeds, useDog } from '@/lib/api/dogs';
import { useSaveTemperament, useTemperament } from '@/lib/api/temperament';

/** Wesens-Fragebogen (12 Fragen, Multiple Choice). */
export default function TemperamentScreen() {
  const { t } = useTranslation();
  const { id, onboarding } = useLocalSearchParams<{ id: string; onboarding?: string }>();
  const { data: dog, isLoading } = useDog(id);
  const breeds = useBreeds();
  const existing = useTemperament(id);
  const save = useSaveTemperament(id);
  const [changes, setAnswers] = useState<Answers>({});
  const answers: Answers = { ...(existing.data?.answers ?? {}), ...changes };
  const [index, setIndex] = useState(0);

  if (isLoading || existing.isLoading) return <LoadingView />;
  if (!dog) return <ErrorView />;

  const q = QUESTIONS[index]!;
  const last = index === QUESTIONS.length - 1;
  const finish = () => (onboarding ? router.replace('/') : router.back());

  async function submit() {
    const breedTraits = [dog!.breed_primary_id, dog!.breed_secondary_id]
      .map((bid) => breeds.data?.find((b) => b.id === bid)?.base_traits)
      .filter(Boolean) as BreedTraits[];
    await save.mutateAsync({ answers, breeds: breedTraits });
    finish();
  }

  return (
    <Screen>
      {index === 0 ? (
        <Text variant="caption">{t('temperament.intro', { name: dog.name })}</Text>
      ) : null}
      <Text variant="caption" accessibilityLiveRegion="polite">
        {t('temperament.progress', { current: index + 1, total: QUESTIONS.length })}
      </Text>
      <Text variant="subtitle" accessibilityRole="header">
        {t(`temperament.questions.${q.key}.q` as never, { name: dog.name })}
      </Text>
      <View className="gap-2">
        {q.options.map((o) => (
          <Chip
            key={o.key}
            label={t(`temperament.questions.${q.key}.options.${o.key}` as never)}
            selected={answers[q.key] === o.key}
            onPress={() => {
              setAnswers({ ...answers, [q.key]: o.key });
              if (!last) setIndex(index + 1);
            }}
          />
        ))}
      </View>
      <View className="mt-4 flex-row gap-3">
        {index > 0 ? (
          <Button
            className="flex-1"
            title={t('common.back')}
            variant="secondary"
            onPress={() => setIndex(index - 1)}
          />
        ) : null}
        {last ? (
          <Button
            className="flex-1"
            title={t('temperament.finish')}
            onPress={submit}
            loading={save.isPending}
            disabled={!answers[q.key]}
          />
        ) : (
          <Button
            className="flex-1"
            title={t('common.next')}
            variant="secondary"
            onPress={() => setIndex(index + 1)}
          />
        )}
      </View>
      {onboarding ? <Button title={t('common.done')} variant="ghost" onPress={finish} /> : null}
    </Screen>
  );
}

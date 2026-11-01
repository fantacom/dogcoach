import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { DogPhoto } from '@/components/dog/DogPhoto';
import { DogSwitcher } from '@/components/dog/DogSwitcher';
import { TemperamentCards } from '@/components/dog/TemperamentCards';
import { Badge, Button, Card, LoadingView, Screen, Section, Text } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { usePhase } from '@/hooks/usePhase';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBreeds } from '@/lib/api/dogs';
import { usePlans } from '@/lib/api/plans';
import { formatDate } from '@/lib/format';

export default function MyDogScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { dog } = useCurrentDog();
  const breeds = useBreeds();
  const phase = usePhase(dog);
  const plans = usePlans(dog?.id);
  if (!dog) return <LoadingView />;

  const breedName = (id: string | null) => breeds.data?.find((b) => b.id === id)?.name_de;
  const breed = dog.is_mixed
    ? [t('myDog.mixed'), [breedName(dog.breed_primary_id), breedName(dog.breed_secondary_id)].filter(Boolean).join(' × ')].filter(Boolean).join(': ')
    : (breedName(dog.breed_primary_id) ?? t('myDog.breedUnknown'));
  const facts = [
    breed,
    dog.sex ? t(`dogForm.sexes.${dog.sex}`) + (dog.neutered ? `, ${t('dogForm.neutered').toLowerCase()}` : '') : null,
    phase ? phase.current.content.label : null,
    dog.weight_kg ? `${String(dog.weight_kg).replace('.', ',')} kg` : null,
    dog.origin ? t(`dogForm.origins.${dog.origin}`) : null,
  ].filter(Boolean) as string[];

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text variant="title">{t('myDog.title')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('settings.title')} onPress={() => router.push('/settings')} className="p-2">
          <Ionicons name="settings-outline" size={26} color={colors.ink} />
        </Pressable>
      </View>
      <DogSwitcher />
      <View className="items-center gap-3">
        <DogPhoto path={dog.photo_url} size={160} label={dog.name} />
        <Text variant="title">{dog.name}</Text>
        <Button title={t('common.edit')} variant="secondary" onPress={() => router.push({ pathname: '/dog/[id]/edit', params: { id: dog.id } })} />
      </View>

      <Section title={t('myDog.facts')}>
        <Card>
          {facts.map((f) => (
            <Text key={f}>{f}</Text>
          ))}
        </Card>
      </Section>

      <TemperamentCards dog={dog} />

      <Section title={t('plan.active')}>
        {plans.data?.length ? null : <Text variant="caption">{t('plan.none')}</Text>}
        {plans.data?.map((p) => (
          <Card key={p.id} onPress={() => router.push({ pathname: '/plan/[id]', params: { id: p.id } })} accessibilityLabel={p.goal}>
            <Badge label={t(`plan.statuses.${p.status}`)} tone={p.status === 'active' ? 'primary' : 'neutral'} />
            <Text className="font-semibold">{p.goal}</Text>
            <Text variant="caption">{t('plan.period', { start: formatDate(p.start_date), end: formatDate(p.end_date) })}</Text>
          </Card>
        ))}
      </Section>

      <Button title={t('myDog.add')} variant="ghost" onPress={() => router.push('/dog/new')} />
    </Screen>
  );
}

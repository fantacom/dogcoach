import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { birthDateFromEstimate } from '@shared/phase.ts';
import {
  Button,
  ChipGroup,
  InlineError,
  Section,
  Text,
  TextField,
  ToggleRow,
} from '@/components/ui';
import { uploadDogPhoto, useBreeds, useSaveDog } from '@/lib/api/dogs';
import { LimitReachedError } from '@/lib/api/errors';
import { qk } from '@/lib/api/keys';
import { parseGermanDate, todayIso, toGermanDate } from '@/lib/format';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useDogStore } from '@/stores/dogStore';
import type { Dog, DogInput, Environment, Origin, Sex } from '@/types/db';

import { BreedPicker } from './BreedPicker';
import { DogPhoto } from './DogPhoto';

type BreedType = 'purebred' | 'mixed' | 'unknown';
type BirthMode = 'date' | 'estimate';

function initialBreedType(dog?: Dog): BreedType {
  if (!dog) return 'purebred';
  if (dog.is_mixed) return 'mixed';
  return dog.breed_primary_id ? 'purebred' : 'unknown';
}

/** Ganzzahl aus Eingabe, leer → 0. */
const toInt = (s: string) => (s.trim() === '' ? 0 : Number.parseInt(s, 10));

export function DogForm({ dog, onSaved }: { dog?: Dog; onSaved: (dog: Dog) => void }) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.user.id);
  const selectDog = useDogStore((s) => s.select);
  const breeds = useBreeds();
  const save = useSaveDog();

  const [name, setName] = useState(dog?.name ?? '');
  const [breedType, setBreedType] = useState<BreedType>(initialBreedType(dog));
  const [primary, setPrimary] = useState<string | null>(dog?.breed_primary_id ?? null);
  const [secondary, setSecondary] = useState<string | null>(dog?.breed_secondary_id ?? null);
  const [sex, setSex] = useState<Sex | null>(dog?.sex ?? null);
  const [neutered, setNeutered] = useState<boolean>(dog?.neutered ?? false);
  const [birthMode, setBirthMode] = useState<BirthMode>(
    dog?.birth_date_estimated ? 'estimate' : 'date',
  );
  const [birthText, setBirthText] = useState(
    dog?.birth_date && !dog.birth_date_estimated ? toGermanDate(dog.birth_date) : '',
  );
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [weight, setWeight] = useState(
    dog?.weight_kg != null ? String(dog.weight_kg).replace('.', ',') : '',
  );
  const [origin, setOrigin] = useState<Origin | null>(dog?.origin ?? null);
  const [env, setEnv] = useState<Environment>(dog?.environment ?? {});
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = res.canceled ? null : res.assets[0];
    if (asset) setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  function validate(): DogInput | null {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('dogForm.nameRequired');
    if (breedType === 'purebred' && !primary) e.breed = t('dogForm.breedRequired');

    let birth: string | null = dog?.birth_date ?? null;
    let estimated = dog?.birth_date_estimated ?? false;
    if (birthMode === 'date') {
      if (birthText.trim()) {
        const iso = parseGermanDate(birthText);
        if (!iso || iso > todayIso()) e.birth = t('dogForm.birthInvalid');
        else {
          birth = iso;
          estimated = false;
        }
      } else if (!dog?.birth_date_estimated) birth = null;
    } else if (years.trim() || months.trim()) {
      const y = toInt(years);
      const m = toInt(months);
      if (Number.isNaN(y) || Number.isNaN(m) || y < 0 || y > 25 || m < 0 || m > 11 || y + m === 0)
        e.birth = t('dogForm.birthInvalid');
      else {
        birth = birthDateFromEstimate(y, m, todayIso());
        estimated = true;
      }
    }

    let weightKg: number | null = null;
    if (weight.trim()) {
      weightKg = Number(weight.replace(',', '.'));
      if (!Number.isFinite(weightKg) || weightKg < 0.5 || weightKg > 120)
        e.weight = t('dogForm.weightInvalid');
    }

    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      name: name.trim(),
      breed_primary_id: breedType === 'unknown' ? null : primary,
      breed_secondary_id: breedType === 'mixed' ? secondary : null,
      is_mixed: breedType === 'mixed',
      sex,
      neutered,
      birth_date: birth,
      birth_date_estimated: birth ? estimated : false,
      weight_kg: weightKg,
      origin,
      environment: env,
    };
  }

  async function submit() {
    const input = validate();
    if (!input || !userId) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const saved = await save.mutateAsync({ id: dog?.id, input });
      if (photo) {
        await uploadDogPhoto(userId, saved.id, photo.uri, photo.mimeType);
        await queryClient.invalidateQueries({ queryKey: qk.dogs });
      }
      if (!dog) selectDog(saved.id);
      onSaved(saved);
    } catch (e) {
      if (e instanceof LimitReachedError) setLimitHit(true);
      else setSubmitError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  const breedList = breeds.data ?? [];
  const yesNo = (v: boolean | undefined, set: (v: boolean) => void, label: string) => (
    <ToggleRow label={label} value={!!v} onChange={set} />
  );

  return (
    <View className="gap-6">
      <View className="items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            dog?.photo_url || photo ? t('dogForm.photoChange') : t('dogForm.photoAdd')
          }
          onPress={pickPhoto}
        >
          <DogPhoto
            path={dog?.photo_url}
            localUri={photo?.uri}
            size={120}
            label={name || t('dogForm.photo')}
          />
        </Pressable>
        <Button
          title={dog?.photo_url || photo ? t('dogForm.photoChange') : t('dogForm.photoAdd')}
          variant="ghost"
          onPress={pickPhoto}
        />
      </View>

      <TextField
        label={t('dogForm.name')}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        maxLength={40}
      />

      <View className="gap-3">
        <ChipGroup<BreedType>
          label={t('dogForm.breedType')}
          value={breedType}
          onChange={setBreedType}
          options={(['purebred', 'mixed', 'unknown'] as const).map((v) => ({
            value: v,
            label: t(`dogForm.breedTypes.${v}`),
          }))}
        />
        {breedType === 'purebred' ? (
          <BreedPicker
            label={t('dogForm.breed')}
            breeds={breedList}
            value={primary}
            onChange={setPrimary}
          />
        ) : null}
        {breedType === 'mixed' ? (
          <>
            <BreedPicker
              label={t('dogForm.parent1')}
              breeds={breedList}
              value={primary}
              onChange={setPrimary}
              allowClear
            />
            <BreedPicker
              label={t('dogForm.parent2')}
              breeds={breedList}
              value={secondary}
              onChange={setSecondary}
              allowClear
            />
          </>
        ) : null}
        <InlineError message={errors.breed} />
      </View>

      <ChipGroup<Sex>
        label={t('dogForm.sex')}
        value={sex}
        onChange={setSex}
        options={(['male', 'female'] as const).map((v) => ({
          value: v,
          label: t(`dogForm.sexes.${v}`),
        }))}
      />
      {yesNo(neutered, setNeutered, t('dogForm.neutered'))}

      <View className="gap-3">
        <ChipGroup<BirthMode>
          label={t('dogForm.birth')}
          value={birthMode}
          onChange={setBirthMode}
          options={(['date', 'estimate'] as const).map((v) => ({
            value: v,
            label: t(`dogForm.birthModes.${v}`),
          }))}
        />
        {birthMode === 'date' ? (
          <TextField
            label={t('dogForm.birthDate')}
            placeholder={t('dogForm.birthPlaceholder')}
            value={birthText}
            onChangeText={setBirthText}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        ) : (
          <View className="flex-row gap-3">
            <TextField
              className="flex-1"
              label={t('dogForm.years')}
              value={years}
              onChangeText={setYears}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TextField
              className="flex-1"
              label={t('dogForm.months')}
              value={months}
              onChangeText={setMonths}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        )}
        <InlineError message={errors.birth} />
      </View>

      <TextField
        label={t('dogForm.weight')}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        error={errors.weight}
        maxLength={5}
      />

      <ChipGroup<Origin>
        label={t('dogForm.origin')}
        value={origin}
        onChange={setOrigin}
        options={(['breeder', 'shelter', 'foreign_rescue', 'unknown'] as const).map((v) => ({
          value: v,
          label: t(`dogForm.origins.${v}`),
        }))}
      />

      <Section title={t('dogForm.environment')}>
        <ChipGroup<'city' | 'suburb' | 'country'>
          value={env.area}
          onChange={(area) => setEnv({ ...env, area })}
          options={(['city', 'suburb', 'country'] as const).map((v) => ({
            value: v,
            label: t(`dogForm.areas.${v}`),
          }))}
        />
        {yesNo(env.garden, (garden) => setEnv({ ...env, garden }), t('dogForm.garden'))}
        {yesNo(env.children, (children) => setEnv({ ...env, children }), t('dogForm.children'))}
        {yesNo(
          env.other_animals,
          (other_animals) => setEnv({ ...env, other_animals }),
          t('dogForm.otherAnimals'),
        )}
      </Section>

      {limitHit ? (
        <View className="gap-2">
          <Text variant="error">{t('premium.limitReached.free_max_dogs')}</Text>
          <Button
            title={t('premium.seePremium')}
            variant="secondary"
            onPress={() => router.push('/premium')}
          />
        </View>
      ) : null}
      <InlineError message={submitError} />
      <Button
        title={dog ? t('common.save') : t('dogForm.submitNew')}
        onPress={submit}
        loading={busy}
      />
    </View>
  );
}

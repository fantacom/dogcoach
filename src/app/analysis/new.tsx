import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Card, ChipGroup, InlineError, LoadingView, Screen, Text, TextField } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { LimitReachedError } from '@/lib/api/errors';
import { MAX_BYTES, MAX_VIDEO_SECONDS, useCreateUpload } from '@/lib/api/media';
import { useProfile, useUpdateProfile } from '@/lib/api/profile';
import type { Situation } from '@/types/db';

type Picked = { uri: string; mimeType: string; type: 'photo' | 'video'; durationS: number | null; sizeBytes: number | null };
type Wanted = 'wanted' | 'unwanted' | 'unsure';

// 720p-Komprimierung über die Bordmittel von Expo Go (CLAUDE.md §3.4)
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images', 'videos'],
  quality: 0.7,
  videoMaxDuration: MAX_VIDEO_SECONDS,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
  videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
};

export default function NewAnalysisScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ dog?: string; checkin?: string }>();
  const { dog: current, dogs } = useCurrentDog();
  const dog = dogs.find((d) => d.id === params.dog) ?? current;
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const create = useCreateUpload();

  const [media, setMedia] = useState<Picked | null>(null);
  const [question, setQuestion] = useState('');
  const [wanted, setWanted] = useState<Wanted | null>(params.checkin ? 'unwanted' : null);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);

  if (!dog || profile.isLoading) return <LoadingView />;

  // Einwilligung vor dem ersten Upload (CLAUDE.md §8)
  if (!profile.data?.media_consent_at) {
    return (
      <Screen>
        <Text variant="title">{t('analysis.consentTitle')}</Text>
        <Text>{t('analysis.consentBody')}</Text>
        <Text variant="caption">{t('analysis.personsHint')}</Text>
        <Button title={t('analysis.consentAccept')} onPress={() => updateProfile.mutate({ media_consent_at: new Date().toISOString() })} loading={updateProfile.isPending} />
        <Button title={t('analysis.consentDecline')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  function accept(asset: ImagePicker.ImagePickerAsset) {
    const type = asset.type === 'video' ? 'video' : 'photo';
    const durationS = asset.duration ? Math.round(asset.duration / 100) / 10 : null;
    if (type === 'video' && durationS && durationS > MAX_VIDEO_SECONDS + 0.5) return setError(t('analysis.tooLong'));
    if (asset.fileSize && asset.fileSize > MAX_BYTES) return setError(t('analysis.tooBig'));
    setError(null);
    setMedia({ uri: asset.uri, mimeType: asset.mimeType ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'), type, durationS, sizeBytes: asset.fileSize ?? null });
  }

  async function pick(source: 'library' | 'camera') {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError(t('analysis.permissionDenied'));
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!res.canceled && res.assets[0]) accept(res.assets[0]);
  }

  async function submit() {
    if (!media || !dog) return setError(t('analysis.noMedia'));
    setError(null);
    try {
      const id = await create.mutateAsync({
        dogId: dog.id,
        uri: media.uri,
        mimeType: media.mimeType,
        type: media.type,
        durationS: media.durationS,
        sizeBytes: media.sizeBytes,
        question: question.trim() || null,
        isUnwanted: wanted === 'unwanted' ? true : wanted === 'wanted' ? false : null,
        situation,
        checkinId: params.checkin ?? null,
      });
      router.replace({ pathname: '/analysis/[id]', params: { id } });
    } catch (e) {
      if (e instanceof LimitReachedError) setLimit(true);
      else setError(t('common.error'));
    }
  }

  return (
    <Screen>
      {params.checkin ? (
        <Card>
          <Text className="font-semibold">{t('analysis.checkinTitle')}</Text>
          <Text variant="caption">{t('analysis.checkinHint')}</Text>
        </Card>
      ) : null}
      <Text variant="caption">{t('analysis.personsHint')}</Text>

      {media ? (
        <View className="gap-2">
          {media.type === 'photo' ? (
            <Image source={{ uri: media.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24 }} contentFit="cover" accessibilityLabel={dog.name} />
          ) : (
            <Card>
              <Text className="font-semibold">🎬 Video{media.durationS ? ` · ${media.durationS.toFixed(0)} s` : ''}</Text>
            </Card>
          )}
          <Button title={t('analysis.change')} variant="ghost" onPress={() => setMedia(null)} />
        </View>
      ) : (
        <View className="gap-3">
          <Button title={t('analysis.camera')} onPress={() => void pick('camera')} />
          <Button title={t('analysis.pick')} variant="secondary" onPress={() => void pick('library')} />
        </View>
      )}

      <TextField label={`${t('analysis.question')} (${t('common.optional')})`} placeholder={t('analysis.questionPlaceholder')} value={question} onChangeText={setQuestion} multiline maxLength={500} />
      <ChipGroup<Wanted>
        label={t('analysis.wanted')}
        value={wanted}
        onChange={setWanted}
        options={(['wanted', 'unwanted', 'unsure'] as const).map((v) => ({ value: v, label: t(`analysis.wantedOptions.${v}`) }))}
      />
      <ChipGroup<Situation>
        label={t('analysis.situation')}
        value={situation}
        onChange={setSituation}
        options={(['walk', 'home', 'visitors', 'other_dog', 'car', 'alone', 'other'] as const).map((v) => ({ value: v, label: t(`analysis.situations.${v}`) }))}
      />

      {limit ? (
        <View className="gap-2">
          <Text variant="error">{t('premium.limitReached.free_media_analyses_per_month')}</Text>
          <Button title={t('premium.seePremium')} variant="secondary" onPress={() => router.push('/premium')} />
        </View>
      ) : null}
      <InlineError message={error} />
      <Button title={create.isPending ? t('analysis.uploading') : t('analysis.submit')} onPress={submit} loading={create.isPending} disabled={!media} />
      <Text variant="caption">{t('common.disclaimer')}</Text>
    </Screen>
  );
}

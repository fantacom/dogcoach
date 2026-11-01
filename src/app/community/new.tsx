import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ChipGroup, InlineError, Screen, Text, TextField } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { FunctionError } from '@/lib/api/functions';
import { precheck, useCreatePost } from '@/lib/api/forum';
import type { ForumCategory } from '@/types/db';

const CATS = ['training', 'behavior', 'puppy', 'nutrition', 'health', 'everyday', 'other'] as const;

export default function NewPostScreen() {
  const { t } = useTranslation();
  const { dogs } = useCurrentDog();
  const create = useCreatePost();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ForumCategory>('training');
  const [dogId, setDogId] = useState<string>('none');
  const [image, setImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    const a = res.canceled ? null : res.assets[0];
    if (a) setImage({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' });
  }

  async function submit() {
    if (title.trim().length < 5 || body.trim().length < 10)
      return setError(t('community.tooShort'));
    const check = precheck(title, body);
    if (!check.ok) return setError(t(`community.filter.${check.reason}`));
    setError(null);
    try {
      const res = await create.mutateAsync({
        category,
        title: title.trim(),
        body: body.trim(),
        dogId: dogId === 'none' ? null : dogId,
        image,
      });
      router.replace({ pathname: '/community/[id]', params: { id: res.id } });
    } catch (e) {
      if (e instanceof FunctionError && e.status === 422)
        setError(t(`community.filter.${e.code}` as never));
      else if (e instanceof FunctionError && e.status === 429) setError(t('community.rateLimited'));
      else setError(t('common.error'));
    }
  }

  return (
    <Screen>
      <Text variant="caption">{t('community.rules')}</Text>
      <ChipGroup<ForumCategory>
        label={t('community.categoryLabel')}
        value={category}
        onChange={setCategory}
        options={CATS.map((c) => ({ value: c, label: t(`community.categories.${c}`) }))}
      />
      <TextField
        label={t('community.titleLabel')}
        placeholder={t('community.titlePlaceholder')}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <TextField
        label={t('community.bodyLabel')}
        placeholder={t('community.bodyPlaceholder')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={4000}
        className="min-h-32"
      />
      {dogs.length ? (
        <ChipGroup<string>
          label={t('community.dogLabel')}
          value={dogId}
          onChange={setDogId}
          options={[
            { value: 'none', label: t('community.noDog') },
            ...dogs.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
      ) : null}
      {image ? (
        <>
          <Image
            source={{ uri: image.uri }}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24 }}
            contentFit="cover"
          />
          <Button
            title={t('community.removeImage')}
            variant="ghost"
            onPress={() => setImage(null)}
          />
        </>
      ) : (
        <Button title={t('community.image')} variant="secondary" onPress={pickImage} />
      )}
      <InlineError message={error} />
      <Button title={t('community.publish')} onPress={submit} loading={create.isPending} />
    </Screen>
  );
}

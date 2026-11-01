import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DogForm } from '@/components/dog/DogForm';
import { Button, ErrorView, LoadingView, Screen } from '@/components/ui';
import { useDeleteDog, useDog } from '@/lib/api/dogs';
import { confirm } from '@/lib/dialogs';
import { useDogStore } from '@/stores/dogStore';

export default function EditDogScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: dog, isLoading } = useDog(id);
  const remove = useDeleteDog();
  const select = useDogStore((s) => s.select);

  if (isLoading) return <LoadingView />;
  if (!dog) return <ErrorView />;

  async function onDelete() {
    if (!dog) return;
    const ok = await confirm({
      title: t('dogForm.deleteTitle', { name: dog.name }),
      message: t('dogForm.deleteBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await remove.mutateAsync(dog.id);
    select(null);
    router.replace('/');
  }

  return (
    <Screen>
      <DogForm dog={dog} onSaved={() => router.back()} />
      <Button
        title={t('dogForm.delete')}
        variant="ghost"
        onPress={onDelete}
        loading={remove.isPending}
      />
    </Screen>
  );
}

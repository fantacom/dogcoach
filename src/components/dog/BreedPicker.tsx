import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text, TextField } from '@/components/ui';
import type { Breed } from '@/types/db';

type Props = {
  label: string;
  breeds: Breed[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowClear?: boolean;
};

export function BreedPicker({ label, breeds, value, onChange, allowClear = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = breeds.find((b) => b.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? breeds.filter((b) => b.name_de.toLowerCase().includes(q)) : breeds;
  }, [breeds, query]);

  return (
    <View className="gap-1.5">
      <Text variant="caption" className="font-medium">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name_de ?? t('dogForm.breed')}`}
        onPress={() => setOpen(true)}
        className="min-h-12 justify-center rounded-2xl border border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark"
      >
        <Text className={selected ? '' : 'text-muted dark:text-muted-dark'}>{selected?.name_de ?? t('dogForm.breed')}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 gap-3 bg-bg px-5 pt-4 dark:bg-bg-dark">
          <TextField label={t('dogForm.breedSearch')} value={query} onChangeText={setQuery} autoFocus autoCorrect={false} />
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text variant="caption">{t('dogForm.breedNone')}</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === value }}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className="min-h-12 justify-center border-b border-border py-3 dark:border-border-dark"
              >
                <Text className={item.id === value ? 'font-semibold text-primary dark:text-primary-dark' : ''}>{item.name_de}</Text>
              </Pressable>
            )}
          />
          <View className="gap-2 pb-4">
            {allowClear && value ? (
              <Button
                title={t('common.delete')}
                variant="secondary"
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              />
            ) : null}
            <Button title={t('common.close')} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

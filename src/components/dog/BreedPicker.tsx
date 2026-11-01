import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import type { Breed } from '@/types/db';

type Props = {
  label: string;
  breeds: Breed[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowClear?: boolean;
};

const MAX_RESULTS = 8;

/**
 * Rassenauswahl als eingeblendete Suchliste (kein Modal: RN-Web-Modals blockieren danach
 * Texteingaben; inline ist zudem für VoiceOver übersichtlicher).
 */
export function BreedPicker({ label, breeds, value, onChange, allowClear = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = breeds.find((b) => b.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? breeds.filter((b) => b.name_de.toLowerCase().includes(q)) : breeds).slice(
      0,
      MAX_RESULTS,
    );
  }, [breeds, query]);

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <View className="gap-1.5">
      <Text variant="caption" className="font-medium">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.name_de ?? t('dogForm.breed')}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="min-h-12 justify-center rounded-2xl border border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark"
      >
        <Text className={selected ? '' : 'text-muted dark:text-muted-dark'}>
          {selected?.name_de ?? t('dogForm.breed')}
        </Text>
      </Pressable>
      {open ? (
        <View className="gap-2 rounded-2xl border border-border p-3 dark:border-border-dark">
          <TextField
            label={t('dogForm.breedSearch')}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />
          {filtered.length === 0 ? <Text variant="caption">{t('dogForm.breedNone')}</Text> : null}
          {filtered.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === value }}
              onPress={() => choose(item.id)}
              className="min-h-11 justify-center border-b border-border py-2 dark:border-border-dark"
            >
              <Text
                className={
                  item.id === value ? 'font-semibold text-primary dark:text-primary-dark' : ''
                }
              >
                {item.name_de}
              </Text>
            </Pressable>
          ))}
          {allowClear && value ? (
            <Button title={t('common.delete')} variant="ghost" onPress={() => choose(null)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

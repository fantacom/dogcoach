import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { PhaseResult } from '@shared/phase.ts';
import { Badge, Card, Text } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { Dog } from '@/types/db';

/** Startscreen: Phase, was typisch ist, was der Hund braucht, nächste Phase mit Datum (CLAUDE.md §3.2). */
export function PhaseCard({ dog, phase }: { dog: Dog; phase: PhaseResult | null }) {
  const { t } = useTranslation();
  if (!phase) {
    return (
      <Card>
        <Text variant="subtitle">{t('today.phase')}</Text>
        <Text variant="caption">{t('today.noBirth', { name: dog.name })}</Text>
      </Card>
    );
  }
  const c = phase.current.content;
  const years = Math.floor(phase.ageWeeks / 52);
  const months = Math.floor((phase.ageWeeks % 52) / 4.35);
  const list = (items: string[]) => items.map((i) => <Text key={i}>• {i}</Text>);
  return (
    <Card>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text variant="caption">{t('today.phase')}</Text>
        <Text variant="caption">
          {phase.ageWeeks < 26
            ? t('today.ageWeeks', { weeks: phase.ageWeeks })
            : t('today.age', { years, months })}
          {dog.birth_date_estimated ? ` (${t('today.estimated')})` : ''}
        </Text>
      </View>
      <Text variant="title">{c.label}</Text>
      {c.size_note ? <Text variant="caption">{c.size_note}</Text> : null}
      <View className="gap-1">
        <Text className="font-semibold">{t('today.typical')}</Text>
        {list(c.typical)}
      </View>
      <View className="gap-1">
        <Text className="font-semibold">{t('today.needs', { name: dog.name })}</Text>
        {list(c.needs)}
      </View>
      <View className="gap-1">
        <Text className="font-semibold">{t('today.focus')}</Text>
        {list(c.focus)}
      </View>
      {phase.next && phase.nextStartDate ? (
        <Text variant="caption">
          {t('today.next', {
            phase: phase.next.content.label,
            date: formatDate(phase.nextStartDate),
          })}
        </Text>
      ) : null}
      <Badge label={t('today.draft')} />
    </Card>
  );
}

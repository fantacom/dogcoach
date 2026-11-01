import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Button, Card, ChipGroup, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import type { PlanTask, TaskRating } from '@/types/db';

type Props = {
  task: PlanTask;
  onDone: (rating: TaskRating | null) => void;
  onUndo: () => void;
  busy?: boolean;
  compact?: boolean;
};

export function TaskCard({ task, onDone, onUndo, busy, compact }: Props) {
  const { t } = useTranslation();
  const s = task.steps;
  return (
    <Card>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Badge label={t('plan.day', { day: task.day_index + 1 })} tone={task.done_at ? 'primary' : 'neutral'} />
        <Text variant="caption">
          {formatDateTime(task.scheduled_at)}
          {s.duration_min ? ` · ${t('plan.minutes', { count: s.duration_min })}` : ''}
        </Text>
      </View>
      <Text className="font-semibold">{task.title}</Text>
      {s.goal ? <Text variant="caption">{`${t('plan.goal')}: ${s.goal}`}</Text> : null}
      {!compact && s.steps?.length ? (
        <View className="gap-1">
          <Text className="font-semibold">{t('plan.steps')}</Text>
          {s.steps.map((step, i) => (
            <Text key={i}>{`${i + 1}. ${step}`}</Text>
          ))}
        </View>
      ) : null}
      {!compact && task.success_criteria ? <Text>{`${t('plan.success')}: ${task.success_criteria}`}</Text> : null}
      {!compact && s.typical_mistake ? <Text variant="caption">{`${t('plan.mistake')}: ${s.typical_mistake}`}</Text> : null}
      {task.done_at ? (
        <View className="gap-2">
          {task.rating ? <Badge label={t(`plan.ratings.${task.rating}`)} tone="primary" /> : null}
          <Button title={t('plan.undo')} variant="ghost" onPress={onUndo} loading={busy} />
        </View>
      ) : (
        <ChipGroup<TaskRating>
          label={t('plan.rate')}
          value={null}
          onChange={(r) => onDone(r)}
          options={(['works', 'partial', 'not_yet'] as const).map((v) => ({ value: v, label: t(`plan.ratings.${v}`) }))}
        />
      )}
    </Card>
  );
}

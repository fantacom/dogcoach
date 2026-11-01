import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TaskCard } from '@/components/plan/TaskCard';
import {
  Badge,
  Button,
  Card,
  ErrorView,
  LoadingView,
  Screen,
  Section,
  Text,
} from '@/components/ui';
import { useCancelPlan, usePlan, useUpdateTask } from '@/lib/api/plans';
import { confirm } from '@/lib/dialogs';
import { formatDate } from '@/lib/format';

export default function PlanScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  const update = useUpdateTask(id, plan.data?.dog_id ?? '');
  const cancel = useCancelPlan(plan.data?.dog_id ?? '');

  if (plan.isLoading) return <LoadingView />;
  if (!plan.data) return <ErrorView onRetry={() => void plan.refetch()} />;
  const p = plan.data;
  const done = p.tasks.filter((x) => x.done_at).length;
  const active = p.status === 'active';

  async function onCancel() {
    const ok = await confirm({
      title: t('plan.cancelTitle'),
      message: t('plan.cancelBody'),
      confirmLabel: t('plan.cancel'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) cancel.mutate(p.id);
  }

  return (
    <Screen>
      <View className="flex-row flex-wrap gap-2">
        <Badge label={t(`plan.statuses.${p.status}`)} tone={active ? 'primary' : 'neutral'} />
        <Badge label={t('plan.version', { version: p.version })} />
      </View>
      <Text variant="title">{p.goal}</Text>
      {p.summary ? <Text>{p.summary}</Text> : null}
      <Text variant="caption">
        {t('plan.period', { start: formatDate(p.start_date), end: formatDate(p.end_date) })} ·{' '}
        {t('plan.progressLabel', { done, total: p.tasks.length })}
      </Text>

      {p.checkins.length ? (
        <Section title={t('plan.checkins')}>
          {p.checkins.map((c) => (
            <Card key={c.id}>
              <Text className="font-semibold">
                {t('plan.checkinDue', { date: formatDate(c.due_at) })}
              </Text>
              {c.instruction ? <Text variant="caption">{c.instruction}</Text> : null}
              {c.media_id ? (
                <Button
                  title={t('plan.checkinDone')}
                  variant="ghost"
                  onPress={() =>
                    router.push({ pathname: '/analysis/[id]', params: { id: c.media_id! } })
                  }
                />
              ) : active ? (
                <Button
                  title={t('plan.checkinRecord')}
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/analysis/new',
                      params: { checkin: c.id, dog: p.dog_id },
                    })
                  }
                />
              ) : null}
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title={t('plan.title')}>
        {p.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            busy={update.isPending}
            onDone={(rating) => update.mutate({ id: task.id, done: true, rating })}
            onUndo={() => update.mutate({ id: task.id, done: false })}
          />
        ))}
      </Section>

      {active ? (
        <Button
          title={t('plan.cancel')}
          variant="ghost"
          onPress={onCancel}
          loading={cancel.isPending}
        />
      ) : null}
      <Text variant="caption">{t('common.disclaimer')}</Text>
    </Screen>
  );
}

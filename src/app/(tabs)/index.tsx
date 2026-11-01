import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { DogPhoto } from '@/components/dog/DogPhoto';
import { DogSwitcher } from '@/components/dog/DogSwitcher';
import { TaskCard } from '@/components/plan/TaskCard';
import { PhaseCard } from '@/components/today/PhaseCard';
import { TipCard } from '@/components/today/TipCard';
import { Button, Card, LoadingView, Screen, Section, Text } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { usePhase } from '@/hooks/usePhase';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useActivePlans, useUpdateTask } from '@/lib/api/plans';
import { useMarkTipRead, useTips } from '@/lib/api/tips';
import { syncTaskReminders } from '@/lib/notifications';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function TodayScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { dog } = useCurrentDog();
  const phase = usePhase(dog);
  const tips = useTips(dog?.id);
  const markRead = useMarkTipRead(dog?.id ?? '');
  const plans = useActivePlans(dog?.id);
  const firstPlan = plans.data?.[0];
  const updateTask = useUpdateTask(firstPlan?.id ?? '', dog?.id ?? '');

  // Lokale Erinnerungen für Trainingsaufgaben (funktioniert in Expo Go)
  useEffect(() => {
    if (!dog || !plans.data) return;
    const tasks = plans.data.flatMap((p) =>
      p.tasks.map((task) => ({ ...task, planActive: p.status === 'active' })),
    );
    void syncTaskReminders(tasks, t('plan.reminderTitle', { name: dog.name }));
  }, [plans.data, dog, t]);

  if (!dog) return <LoadingView />;

  const now = new Date();
  const todayTasks = (plans.data ?? []).flatMap((p) =>
    p.tasks
      .filter((task) => sameDay(new Date(task.scheduled_at), now))
      .map((task) => ({ task, plan: p })),
  );
  const dueCheckin = (plans.data ?? []).flatMap((p) =>
    p.checkins.filter((c) => !c.media_id && new Date(c.due_at) <= now),
  )[0];

  return (
    <Screen>
      <View className="flex-row items-center gap-4">
        <DogPhoto path={dog.photo_url} size={72} label={dog.name} />
        <View className="flex-1">
          <Text variant="title">{t('today.greeting', { name: dog.name })}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          onPress={() => router.push('/settings')}
          className="p-2"
        >
          <Ionicons name="settings-outline" size={26} color={colors.ink} />
        </Pressable>
      </View>
      <DogSwitcher />

      <PhaseCard dog={dog} phase={phase} />

      <Section title={t('today.task')}>
        {plans.isLoading ? <Text variant="caption">{t('common.loading')}</Text> : null}
        {!plans.isLoading && todayTasks.length === 0 ? (
          <Text variant="caption">{t('today.noTask')}</Text>
        ) : null}
        {todayTasks.map(({ task, plan }) => (
          <View key={task.id} className="gap-2">
            <TaskCard
              task={task}
              compact
              busy={updateTask.isPending}
              onDone={(rating) => updateTask.mutate({ id: task.id, done: true, rating })}
              onUndo={() => updateTask.mutate({ id: task.id, done: false })}
            />
            <Button
              title={t('today.openPlan')}
              variant="ghost"
              onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
            />
          </View>
        ))}
        {dueCheckin ? (
          <Card
            onPress={() =>
              router.push({
                pathname: '/analysis/new',
                params: { checkin: dueCheckin.id, dog: dog.id },
              })
            }
          >
            <Text className="font-semibold">{t('today.checkinDue')}</Text>
            {dueCheckin.instruction ? (
              <Text variant="caption">{dueCheckin.instruction}</Text>
            ) : null}
          </Card>
        ) : null}
      </Section>

      <Section title={t('today.tips')}>
        {tips.data?.length ? null : <Text variant="caption">{t('today.noTips')}</Text>}
        {tips.data?.map((tip) => (
          <TipCard key={tip.id} tip={tip} onRead={() => markRead.mutate(tip.id)} />
        ))}
      </Section>
    </Screen>
  );
}

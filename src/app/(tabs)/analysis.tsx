import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DogSwitcher } from '@/components/dog/DogSwitcher';
import { Badge, Button, Card, LoadingView, Screen, Section, Text } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { useMediaHistory } from '@/lib/api/media';
import { formatDateTime } from '@/lib/format';

/** Analyse: Upload starten + Verlauf (CLAUDE.md §9). */
export default function AnalysisTab() {
  const { t } = useTranslation();
  const { dog } = useCurrentDog();
  const history = useMediaHistory(dog?.id);
  if (!dog) return <LoadingView />;

  return (
    <Screen>
      <Text variant="title">{t('analysis.title')}</Text>
      <DogSwitcher />
      <Text variant="caption">{t('analysis.intro')}</Text>
      <Button
        title={t('analysis.new')}
        onPress={() => router.push({ pathname: '/analysis/new', params: { dog: dog.id } })}
        testID="analysis-new"
      />

      <Section title={t('analysis.history')}>
        {history.data?.length ? null : <Text variant="caption">{t('analysis.empty')}</Text>}
        {history.data?.map((m) => (
          <Card
            key={m.id}
            onPress={() => router.push({ pathname: '/analysis/[id]', params: { id: m.id } })}
            accessibilityLabel={m.analysis?.assessment?.headline ?? m.user_question ?? ''}
          >
            <Badge
              label={
                m.analysis
                  ? t(`analysis.resultTypes.${m.analysis.result_type}`)
                  : t(`analysis.status.${m.status}`)
              }
              tone={
                m.status === 'failed'
                  ? 'danger'
                  : m.analysis?.safety_flag && m.analysis.safety_flag !== 'none'
                    ? 'warning'
                    : 'primary'
              }
            />
            <Text className="font-semibold">
              {m.analysis?.assessment?.headline ??
                m.user_question ??
                t(`analysis.status.${m.status}`)}
            </Text>
            <Text variant="caption">
              {formatDateTime(m.created_at)}
              {m.plan_checkin_id ? ` · ${t('analysis.checkinTitle')}` : ''}
            </Text>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

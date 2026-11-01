import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  ErrorView,
  LoadingView,
  Markdown,
  Screen,
  Section,
  Text,
} from '@/components/ui';
import { retryAnalysis, useMediaItem } from '@/lib/api/media';
import { usePlans } from '@/lib/api/plans';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import type { PlanCheckin } from '@/types/db';

/** Ergebnis-Screen mit Live-Status (Realtime) und Disclaimer (CLAUDE.md §3.4, §8). */
export default function AnalysisResultScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useMediaItem(id);
  const plans = usePlans(item.data?.dog_id);
  const checkin = useQuery({
    queryKey: ['checkin-of-media', id],
    enabled: !!item.data?.plan_checkin_id && item.data.status === 'done',
    queryFn: async () =>
      (
        await supabase
          .from('plan_checkins')
          .select('*')
          .eq('id', item.data!.plan_checkin_id!)
          .single()
      ).data as PlanCheckin | null,
  });

  if (item.isLoading) return <LoadingView />;
  if (!item.data) return <ErrorView onRetry={() => void item.refetch()} />;
  const m = item.data;
  const a = m.analysis;

  if (m.status === 'queued' || m.status === 'analyzing') {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text variant="subtitle" accessibilityLiveRegion="polite">
          {t('analysis.status.analyzing')}
        </Text>
        <Text variant="caption">{t('analysis.analyzingBody')}</Text>
      </Screen>
    );
  }
  if (m.status === 'failed') {
    return (
      <Screen className="justify-center">
        <Text>{t('analysis.failed')}</Text>
        <Button
          title={t('common.retry')}
          onPress={() => void retryAnalysis(m.id).then(() => item.refetch())}
        />
      </Screen>
    );
  }

  // Check-in: Vergleich statt Einschätzung
  if (m.plan_checkin_id) {
    const c = checkin.data?.comparison;
    const newest = plans.data?.find((p) => p.status === 'active');
    return (
      <Screen>
        <Text variant="title">{t('analysis.checkinResult')}</Text>
        {c?.progress ? (
          <Badge label={t(`analysis.progress.${c.progress}` as never)} tone="primary" />
        ) : null}
        {c?.summary ? <Text>{c.summary}</Text> : null}
        {c?.adjustment ? (
          <Text className="font-semibold">{t(`analysis.adjustment.${c.adjustment}` as never)}</Text>
        ) : null}
        {newest ? (
          <Button
            title={t('analysis.openPlan')}
            onPress={() => router.push({ pathname: '/plan/[id]', params: { id: newest.id } })}
          />
        ) : null}
        <Text variant="caption">{t('common.disclaimer')}</Text>
      </Screen>
    );
  }

  if (!a) return <ErrorView onRetry={() => void item.refetch()} />;
  const as = a.assessment ?? {};
  const plan = plans.data?.find((p) => p.analysis_id === a.id);
  const warn = a.safety_flag !== 'none';

  return (
    <Screen>
      <Badge
        label={t(`analysis.resultTypes.${a.result_type}`)}
        tone={warn ? 'warning' : 'primary'}
      />
      {as.headline ? <Text variant="title">{as.headline}</Text> : null}
      {a.answer_md ? <Markdown>{a.answer_md}</Markdown> : null}

      {as.likely_cause ? (
        <Card>
          <Text className="font-semibold">{t('analysis.likelyCause')}</Text>
          <Text>{as.likely_cause}</Text>
          {as.alternative_hypotheses?.length ? (
            <View className="gap-1">
              <Text className="font-semibold">{t('analysis.alternatives')}</Text>
              {as.alternative_hypotheses.map((h) => (
                <Text key={h}>• {h}</Text>
              ))}
            </View>
          ) : null}
          {as.confidence ? (
            <Text variant="caption">{`${t('analysis.confidence')}: ${t(`analysis.confidenceLevels.${as.confidence}`)}`}</Text>
          ) : null}
        </Card>
      ) : null}

      {as.safety_measures?.length ? (
        <Section title={t('analysis.safetyMeasures')}>
          {as.safety_measures.map((s) => (
            <Text key={s}>• {s}</Text>
          ))}
        </Section>
      ) : null}

      {as.uncertainties?.length ? (
        <Section title={t('analysis.uncertainties')}>
          {as.uncertainties.map((s) => (
            <Text key={s} variant="caption">
              • {s}
            </Text>
          ))}
        </Section>
      ) : null}

      {a.result_type === 'retake' ? (
        <Button
          title={t('analysis.retake')}
          onPress={() => router.replace({ pathname: '/analysis/new', params: { dog: m.dog_id } })}
        />
      ) : null}
      {plan ? (
        <Card
          onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
          accessibilityLabel={t('analysis.openPlan')}
        >
          <Text className="font-semibold">{t('analysis.planCreated')}</Text>
          <Text>{plan.goal}</Text>
          <Text className="text-primary dark:text-primary-dark">{t('analysis.openPlan')} →</Text>
        </Card>
      ) : null}
      {as.plan_status === 'limit_reached' ? (
        <View className="gap-2">
          <Text variant="error">{t('analysis.planLimit')}</Text>
          <Button
            title={t('premium.seePremium')}
            variant="secondary"
            onPress={() => router.push('/premium')}
          />
        </View>
      ) : null}

      <Text variant="caption" className="mt-4">
        {t('common.disclaimer')}
      </Text>
    </Screen>
  );
}

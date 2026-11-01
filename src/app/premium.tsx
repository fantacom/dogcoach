import { useTranslation } from 'react-i18next';

import { Card, LoadingView, Screen, Section, Text } from '@/components/ui';
import { useProfile, useUsage } from '@/lib/api/profile';
import { formatDate } from '@/lib/format';

/**
 * Paywall-Vorstufe: zeigt Tarif und Nutzung. Kauf über RevenueCat folgt mit EAS Build
 * (RevenueCat braucht nativen Code, läuft nicht in Expo Go). Limits sind serverseitig aktiv.
 */
export default function PremiumScreen() {
  const { t } = useTranslation();
  const usage = useUsage();
  const profile = useProfile();
  if (usage.isLoading || !usage.data) return <LoadingView />;
  const u = usage.data;
  const row = (label: string, used: number, limit: number | null) => (
    <Card key={label}>
      <Text className="font-semibold">{label}</Text>
      <Text>
        {limit == null ? t('premium.unlimited', { used }) : t('premium.usage', { used, limit })}
      </Text>
    </Card>
  );
  return (
    <Screen>
      <Text variant="title">{t('premium.title')}</Text>
      {u.is_premium ? (
        <Text>
          {profile.data?.premium_until
            ? t('premium.activeUntil', { date: formatDate(profile.data.premium_until) })
            : t('premium.active')}
        </Text>
      ) : (
        <>
          <Text>{t('premium.body')}</Text>
          <Section title={t('premium.limits')}>
            {row(t('premium.dogs'), u.dogs, u.free_max_dogs)}
            {row(t('premium.analyses'), u.media_this_month, u.free_media_analyses_per_month)}
            {row(t('premium.plans'), u.active_plans, u.free_training_plans_active)}
          </Section>
          <Text variant="caption">{t('premium.comingSoon')}</Text>
        </>
      )}
    </Screen>
  );
}

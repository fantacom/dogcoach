import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  ErrorView,
  InlineError,
  LoadingView,
  Screen,
  Section,
  Text,
  TextField,
} from '@/components/ui';
import { useAppConfig, useReports, useResolveReport, useSetConfig } from '@/lib/api/admin';
import { useProfile } from '@/lib/api/profile';
import { formatDateTime } from '@/lib/format';
import type { AppConfigRow } from '@/types/db';

/** Einfache Admin-Ansicht (Web und App, per RLS auf Admins beschränkt): Meldungen + app_config. */
export default function AdminScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const reports = useReports();
  const resolve = useResolveReport();
  const config = useAppConfig();
  const [showAll, setShowAll] = useState(false);

  if (profile.isLoading) return <LoadingView />;
  if (!profile.data?.is_admin) return <ErrorView message={t('admin.webOnly')} />;
  const list = (reports.data ?? []).filter((r) => showAll || r.status === 'open');

  return (
    <Screen>
      <Section
        title={t('admin.reports')}
        action={
          <Button
            title={showAll ? t('admin.showOpen') : t('admin.showAll')}
            variant="ghost"
            onPress={() => setShowAll(!showAll)}
          />
        }
      >
        {list.length === 0 ? <Text variant="caption">{t('admin.noReports')}</Text> : null}
        {list.map((r) => (
          <Card key={r.id}>
            <View className="flex-row gap-2">
              <Badge label={r.target_type} />
              <Badge label={r.status} tone={r.status === 'open' ? 'warning' : 'neutral'} />
            </View>
            <Text>{r.reason}</Text>
            <Text variant="caption">{`${formatDateTime(r.created_at)} · ${r.target_id}`}</Text>
            {r.status === 'open' ? (
              <View className="flex-row gap-2">
                {r.target_type !== 'user' ? (
                  <Button
                    className="flex-1"
                    title={t('admin.hide')}
                    onPress={() => resolve.mutate({ report: r, action: 'hide' })}
                  />
                ) : null}
                <Button
                  className="flex-1"
                  title={t('admin.dismiss')}
                  variant="secondary"
                  onPress={() => resolve.mutate({ report: r, action: 'dismiss' })}
                />
              </View>
            ) : null}
          </Card>
        ))}
      </Section>

      <Section title={t('admin.config')}>
        <Text variant="caption">{t('admin.configHint')}</Text>
        {config.data?.map((row) => (
          <ConfigRow key={row.key} row={row} />
        ))}
      </Section>
    </Screen>
  );
}

function ConfigRow({ row }: { row: AppConfigRow }) {
  const { t } = useTranslation();
  const set = useSetConfig();
  const [text, setText] = useState(row.value === null ? '' : JSON.stringify(row.value));
  const [error, setError] = useState<string | null>(null);

  function save() {
    try {
      const value = text.trim() === '' ? null : JSON.parse(text);
      setError(null);
      set.mutate({ key: row.key, value });
    } catch {
      setError(t('admin.invalidJson'));
    }
  }

  return (
    <Card>
      <Text className="font-semibold">{row.key}</Text>
      <Text variant="caption">{row.description}</Text>
      {row.value === null ? <Badge label={t('common.notSet')} tone="warning" /> : null}
      <TextField
        label={row.key}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <InlineError message={error} />
      <Button title={t('common.save')} variant="secondary" onPress={save} loading={set.isPending} />
    </Card>
  );
}

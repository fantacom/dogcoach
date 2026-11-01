import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Share, View } from 'react-native';

import { Button, Card, Chip, InlineError, Screen, Section, Text, TextField } from '@/components/ui';
import { useAppConfig } from '@/lib/api/admin';
import { invoke } from '@/lib/api/functions';
import { useProfile, useUpdateProfile } from '@/lib/api/profile';
import { signOut } from '@/lib/auth';
import { confirm } from '@/lib/dialogs';
import { getPushToken, permissionStatus, requestPermission } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { isAnonymous, useAuthStore } from '@/stores/authStore';
import { useDogStore } from '@/stores/dogStore';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const MINUTES = [0, 15, 30, 45];
const pad = (n: number) => String(n).padStart(2, '0');

export default function SettingsScreen() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const profile = useProfile();
  const update = useUpdateProfile();
  const config = useAppConfig();
  const selectDog = useDogStore((s) => s.select);
  const [nameDraft, setName] = useState<string | null>(null);
  const name = nameDraft ?? profile.data?.display_name ?? '';
  const [perm, setPerm] = useState<string>('undetermined');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void permissionStatus().then(setPerm);
  }, []);

  const cfg = (key: string) => config.data?.find((r) => r.key === key)?.value;
  const [h, m] = (profile.data?.notification_time ?? '18:00').split(':').map(Number) as [
    number,
    number,
  ];
  const setTime = (hh: number, mm: number) =>
    update.mutate({
      notification_time: `${pad(hh)}:${pad(mm)}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

  async function enablePush() {
    const res = await requestPermission();
    setPerm(res === 'granted' ? 'granted' : res);
    if (res === 'granted') {
      const token = await getPushToken();
      if (token) update.mutate({ push_token: token });
    }
  }

  async function exportData() {
    setBusy('export');
    setError(null);
    try {
      const data = await invoke<unknown>('export-data');
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dogcoach-export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'Datenexport' });
      }
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: t('settings.deleteTitle'),
      message: t('settings.deleteBody'),
      confirmLabel: t('settings.deleteConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setBusy('delete');
    try {
      await invoke('delete-account');
      selectDog(null);
      await signOut();
      router.replace('/');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  async function onSignOut() {
    if (isAnonymous(session)) {
      const ok = await confirm({
        title: t('settings.signOutAnonTitle'),
        message: t('settings.signOutAnonBody'),
        confirmLabel: t('settings.signOut'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
    }
    selectDog(null);
    await signOut();
    queryClient.clear();
    router.replace('/');
  }

  const legal = (label: string, key: string) => {
    const url = cfg(key);
    return typeof url === 'string' && url ? (
      <Button key={key} title={label} variant="ghost" onPress={() => void Linking.openURL(url)} />
    ) : (
      <Text key={key} variant="caption">{`${label}: ${t('settings.legalMissing')}`}</Text>
    );
  };
  const contact = cfg('contact_email');

  return (
    <Screen>
      <Section title={t('settings.profile')}>
        <TextField
          label={t('settings.displayName')}
          value={name}
          onChangeText={setName}
          maxLength={40}
          onBlur={() => update.mutate({ display_name: name.trim() || null })}
        />
      </Section>

      <Section title={t('settings.notifications')}>
        <Text variant="caption">{t('settings.notifTime')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="grow-0"
          contentContainerClassName="items-center gap-2"
        >
          {HOURS.map((hh) => (
            <Chip
              key={hh}
              label={`${pad(hh)} Uhr`}
              selected={hh === h}
              onPress={() => setTime(hh, m)}
            />
          ))}
        </ScrollView>
        <View className="flex-row gap-2">
          {MINUTES.map((mm) => (
            <Chip
              key={mm}
              label={`:${pad(mm)}`}
              selected={mm === m}
              onPress={() => setTime(h, mm)}
            />
          ))}
        </View>
        {perm === 'granted' ? (
          <Text variant="caption">{`${t('settings.pushEnabled')} ${t('settings.pushLocal')}`}</Text>
        ) : perm === 'denied' ? (
          <Text variant="caption">{t('settings.pushDenied')}</Text>
        ) : perm !== 'unsupported' ? (
          <Button title={t('settings.pushEnable')} variant="secondary" onPress={enablePush} />
        ) : null}
      </Section>

      <Section title={t('settings.account')}>
        {isAnonymous(session) ? (
          <Card>
            <Text>{t('settings.accountAnon')}</Text>
            <Button title={t('settings.linkEmail')} onPress={() => router.push('/link-email')} />
            <Button
              title={t('settings.signInOther')}
              variant="ghost"
              onPress={() => router.push('/login')}
            />
          </Card>
        ) : (
          <Text>{t('settings.accountEmail', { email: session?.user.email ?? '' })}</Text>
        )}
        <Button
          title={t('settings.premium')}
          variant="secondary"
          onPress={() => router.push('/premium')}
        />
        {profile.data?.is_admin ? (
          <Button
            title={t('settings.admin')}
            variant="secondary"
            onPress={() => router.push('/admin')}
          />
        ) : null}
        <Button title={t('settings.signOut')} variant="ghost" onPress={onSignOut} />
      </Section>

      <Section title={t('settings.privacy')}>
        <Text variant="caption">{t('settings.aiNotice')}</Text>
        <Button
          title={t('settings.export')}
          variant="secondary"
          onPress={exportData}
          loading={busy === 'export'}
        />
        <Button
          title={t('settings.delete')}
          variant="ghost"
          onPress={deleteAccount}
          loading={busy === 'delete'}
        />
        <InlineError message={error} />
      </Section>

      <Section title={t('settings.legal')}>
        {legal(t('settings.privacyPolicy'), 'legal_privacy_url')}
        {legal(t('settings.imprint'), 'legal_imprint_url')}
        {legal(t('settings.terms'), 'legal_terms_url')}
        {typeof contact === 'string' ? (
          <Button
            title={`${t('settings.contact')}: ${contact}`}
            variant="ghost"
            onPress={() => void Linking.openURL(`mailto:${contact}`)}
          />
        ) : null}
      </Section>
      <Text variant="caption">
        {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
      </Text>
    </Screen>
  );
}

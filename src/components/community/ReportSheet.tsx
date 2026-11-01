import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ChipGroup, Text } from '@/components/ui';
import { reportContent } from '@/lib/api/forum';
import { notify } from '@/lib/dialogs';

type Reason = 'spam' | 'abuse' | 'harmful' | 'other';
type Props = { target: { type: 'post' | 'reply' | 'user'; id: string }; onClose: () => void };

/** Melden von Beiträgen/Nutzern (App Store 1.2). Inline statt Modal (RN-Web-Kompatibilität). */
export function ReportPanel({ target, onClose }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<Reason | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason) return;
    setBusy(true);
    try {
      await reportContent(target.type, target.id, t(`community.reportReasons.${reason}`));
      notify(t('community.reportSent'));
      onClose();
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-3 rounded-2xl border border-border p-3 dark:border-border-dark">
      <Text className="font-semibold">{t('community.reportTitle')}</Text>
      <ChipGroup<Reason>
        label={t('community.reportReason')}
        value={reason}
        onChange={setReason}
        options={(['spam', 'abuse', 'harmful', 'other'] as const).map((v) => ({
          value: v,
          label: t(`community.reportReasons.${v}`),
        }))}
      />
      <Button title={t('community.report')} onPress={send} loading={busy} disabled={!reason} />
      <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
    </View>
  );
}

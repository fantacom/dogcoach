import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, InlineError, Screen, Text, TextField } from '@/components/ui';
import { linkEmail } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

/** Anonymes Konto mit E-Mail sichern. */
export default function LinkEmailScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!isValidEmail(email)) return setError(t('auth.emailInvalid'));
    setError(null);
    setLoading(true);
    try {
      await linkEmail(email);
      setSent(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text>{t('auth.linkBody')}</Text>
      {sent ? (
        <Text accessibilityLiveRegion="polite">
          {t('auth.linkSentInfo', { email: email.trim() })}
        </Text>
      ) : (
        <>
          <TextField
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <InlineError message={error} />
          <Button title={t('auth.linkSend')} onPress={submit} loading={loading} />
        </>
      )}
    </Screen>
  );
}

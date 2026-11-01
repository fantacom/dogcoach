import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { sendMagicLink, verifyEmailCode } from '@/lib/auth';
import { isValidEmail, isValidOtp } from '@/lib/validation';

type Step = 'email' | 'sent';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSendLink() {
    if (!isValidEmail(email)) {
      setError(t('auth.emailInvalid'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendMagicLink(email);
      setStep('sent');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode() {
    if (!isValidOtp(code)) {
      setError(t('auth.codeInvalid'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyEmailCode(email, code);
      router.replace('/');
    } catch {
      setError(t('auth.callbackFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen className="justify-center">
      <View className="gap-2">
        <Text variant="title">{step === 'email' ? t('auth.title') : t('auth.linkSentTitle')}</Text>
        <Text variant="caption">
          {step === 'email' ? t('auth.subtitle') : t('auth.linkSentBody', { email: email.trim() })}
        </Text>
      </View>

      {step === 'email' ? (
        <View className="gap-4">
          <TextField
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            error={error}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={onSendLink}
          />
          <Button title={t('auth.sendLink')} onPress={onSendLink} loading={loading} />
        </View>
      ) : (
        <View className="gap-4">
          <TextField
            label={t('auth.codeLabel')}
            value={code}
            onChangeText={setCode}
            error={error}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            onSubmitEditing={onVerifyCode}
          />
          <Button title={t('auth.verifyCode')} onPress={onVerifyCode} loading={loading} />
          <Button
            title={t('auth.changeEmail')}
            variant="ghost"
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          />
        </View>
      )}
    </Screen>
  );
}

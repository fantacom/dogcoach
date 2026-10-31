import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { exchangeCode } from '@/lib/auth';

/** Ziel des Magic Links: tauscht ?code=… gegen eine Session (PKCE). */
export default function CallbackScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const hasCode = typeof code === 'string' && code.length > 0;
  const [exchangeFailed, setExchangeFailed] = useState(false);
  const failed = !hasCode || exchangeFailed;

  useEffect(() => {
    if (!hasCode) return;
    // Erfolg: onAuthStateChange setzt die Session, Router leitet in (app) weiter.
    exchangeCode(code).catch(() => setExchangeFailed(true));
  }, [code, hasCode]);

  return (
    <Screen className="items-center justify-center">
      {failed ? (
        <View className="w-full gap-4">
          <Text variant="body">{t('auth.callbackFailed')}</Text>
          <Button title={t('auth.backToLogin')} onPress={() => router.replace('/login')} />
        </View>
      ) : (
        <View className="items-center gap-4">
          <ActivityIndicator />
          <Text variant="body">{t('auth.callbackTitle')}</Text>
        </View>
      )}
    </Screen>
  );
}

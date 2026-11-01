import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './Button';
import { Screen } from './Screen';
import { Text } from './Text';

export function LoadingView() {
  const { t } = useTranslation();
  return (
    <Screen className="items-center justify-center">
      <ActivityIndicator accessibilityLabel={t('common.loading')} />
    </Screen>
  );
}

export function ErrorView({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation();
  return (
    <Screen className="justify-center">
      <View className="gap-4">
        <Text variant="body">{message ?? t('common.error')}</Text>
        {onRetry ? <Button title={t('common.retry')} onPress={onRetry} /> : null}
      </View>
    </Screen>
  );
}

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Text variant="error" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Button, Text } from '@/components/ui';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export default function MyDogScreen() {
  const { t } = useTranslation();
  const email = useAuthStore((s) => s.session?.user.email);

  return (
    <PlaceholderScreen title={t('screens.myDog.title')} body={t('screens.myDog.placeholder')}>
      {email ? <Text variant="caption">{email}</Text> : null}
      <Button title={t('auth.signOut')} variant="secondary" onPress={() => void signOut()} />
    </PlaceholderScreen>
  );
}

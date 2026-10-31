import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TodayScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('screens.today.title')} body={t('screens.today.placeholder')} />
  );
}

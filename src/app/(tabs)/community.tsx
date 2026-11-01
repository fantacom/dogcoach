import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function CommunityScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.community.title')}
      body={t('screens.community.placeholder')}
    />
  );
}

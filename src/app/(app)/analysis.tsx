import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function AnalysisScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.analysis.title')}
      body={t('screens.analysis.placeholder')}
    />
  );
}

import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ui';
import type { CoachTip } from '@/types/db';

export function TipCard({ tip, onRead }: { tip: CoachTip; onRead: () => void }) {
  const { t } = useTranslation();
  const unread = !tip.read_at;
  return (
    <Card className={unread ? '' : 'opacity-70'}>
      <View className="flex-row items-center justify-between gap-2">
        <Badge
          label={t(`today.tipCategories.${tip.category}` as never)}
          tone={tip.category === 'phase_change' ? 'primary' : 'neutral'}
        />
        {unread ? (
          <Button
            title={t('today.markRead')}
            variant="ghost"
            onPress={onRead}
            className="min-h-9 px-2 py-1"
          />
        ) : null}
      </View>
      <Text className="font-semibold">{tip.title}</Text>
      <Text>{tip.body}</Text>
    </Card>
  );
}

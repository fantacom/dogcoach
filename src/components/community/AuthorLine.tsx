import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/lib/format';

/** Autorenzeile; KI-Antworten sichtbar gekennzeichnet (EU AI Act, CLAUDE.md §3.5). */
export function AuthorLine({
  isAi,
  name,
  createdAt,
}: {
  isAi: boolean;
  name: string | null | undefined;
  createdAt: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-border dark:bg-border-dark">
        <Ionicons
          name={isAi ? 'sparkles' : 'person'}
          size={16}
          color={isAi ? colors.primary : colors.muted}
        />
      </View>
      <Text className="font-semibold">
        {isAi ? t('community.aiAuthor') : (name ?? t('community.anonymous'))}
      </Text>
      {isAi ? <Badge label={t('community.aiBadge')} tone="primary" /> : null}
      <Text variant="caption">{formatDateTime(createdAt)}</Text>
    </View>
  );
}

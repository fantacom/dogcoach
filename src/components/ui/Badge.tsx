import { View } from 'react-native';

import { Text } from './Text';

type Tone = 'neutral' | 'primary' | 'warning' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-border dark:bg-border-dark',
  primary: 'bg-primary/15 dark:bg-primary-dark/20',
  warning: 'bg-amber-100 dark:bg-amber-900/40',
  danger: 'bg-danger/15 dark:bg-danger-dark/20',
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${tones[tone]}`}>
      <Text variant="label" className="text-xs text-ink dark:text-ink-dark">
        {label}
      </Text>
    </View>
  );
}

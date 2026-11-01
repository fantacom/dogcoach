import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Card({ children, className = '', onPress, accessibilityLabel }: Props) {
  const base = `gap-2 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark ${className}`;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className={`${base} active:opacity-80`}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}

import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

const container: Record<Variant, string> = {
  primary: 'bg-primary dark:bg-primary-dark',
  secondary: 'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
  ghost: 'bg-transparent',
};

const label: Record<Variant, string> = {
  primary: 'text-white dark:text-bg-dark',
  secondary: 'text-ink dark:text-ink-dark',
  ghost: 'text-primary dark:text-primary-dark',
};

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`min-h-12 flex-row items-center justify-center rounded-2xl px-5 py-3 active:opacity-80 ${container[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : undefined} />
      ) : (
        <Text className={`text-base font-semibold ${label[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}

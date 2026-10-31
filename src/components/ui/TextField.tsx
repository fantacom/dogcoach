import { TextInput, type TextInputProps, View } from 'react-native';

import { Text } from './Text';

type Props = TextInputProps & { label: string; error?: string | null; className?: string };

export function TextField({ label, error, className = '', ...props }: Props) {
  return (
    <View className={`gap-1.5 ${className}`}>
      <Text variant="caption" className="font-medium">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? undefined}
        placeholderTextColor="#8A857C"
        className={`min-h-12 rounded-2xl border bg-surface px-4 py-3 text-base text-ink dark:bg-surface-dark dark:text-ink-dark ${error ? 'border-danger dark:border-danger-dark' : 'border-border dark:border-border-dark'}`}
        {...props}
      />
      {error ? (
        <Text variant="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

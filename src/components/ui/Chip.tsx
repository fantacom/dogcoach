import { Pressable, View } from 'react-native';

import { Text } from './Text';

type ChipProps = { label: string; selected?: boolean; onPress?: () => void };

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-full border px-4 py-2 ${
        selected
          ? 'border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark'
          : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
      }`}
    >
      <Text variant="label" className={`text-sm ${selected ? 'text-white dark:text-bg-dark' : 'text-ink dark:text-ink-dark'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

type Option<T extends string> = { value: T; label: string };
type GroupProps<T extends string> = {
  label?: string;
  options: Option<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
};

/** Einfachauswahl als Chips (große Touch-Flächen). */
export function ChipGroup<T extends string>({ label, options, value, onChange }: GroupProps<T>) {
  return (
    <View className="gap-1.5" accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? (
        <Text variant="caption" className="font-medium">
          {label}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

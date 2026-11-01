import { Switch, View } from 'react-native';

import { Text } from './Text';

type Props = { label: string; value: boolean; onChange: (v: boolean) => void };

export function ToggleRow({ label, value, onChange }: Props) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-4">
      <Text className="flex-1">{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: '#2F6B57' }}
      />
    </View>
  );
}

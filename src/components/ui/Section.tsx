import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './Text';

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="subtitle" accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

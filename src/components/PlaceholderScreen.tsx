import type { ReactNode } from 'react';

import { Screen, Text } from '@/components/ui';

type Props = { title: string; body: string; children?: ReactNode };

/** Vorläufiger Tab-Inhalt bis zur jeweiligen Feature-Phase. */
export function PlaceholderScreen({ title, body, children }: Props) {
  return (
    <Screen>
      <Text variant="title">{title}</Text>
      <Text variant="caption">{body}</Text>
      {children}
    </Screen>
  );
}

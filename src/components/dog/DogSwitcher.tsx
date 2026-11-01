import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { useCurrentDog } from '@/hooks/useCurrentDog';
import { useDogStore } from '@/stores/dogStore';

/** Auswahl bei mehreren Hunden. */
export function DogSwitcher() {
  const { dogs, dog } = useCurrentDog();
  const select = useDogStore((s) => s.select);
  if (dogs.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="items-center gap-2"
    >
      {dogs.map((d) => (
        <Chip key={d.id} label={d.name} selected={d.id === dog?.id} onPress={() => select(d.id)} />
      ))}
    </ScrollView>
  );
}

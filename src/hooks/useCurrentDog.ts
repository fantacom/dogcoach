import { useDogs } from '@/lib/api/dogs';
import { useDogStore } from '@/stores/dogStore';

/** Aktuell gewählter Hund (Fallback: erster Hund). */
export function useCurrentDog() {
  const dogs = useDogs();
  const selectedId = useDogStore((s) => s.selectedDogId);
  const dog = dogs.data?.find((d) => d.id === selectedId) ?? dogs.data?.[0];
  return { ...dogs, dog, dogs: dogs.data ?? [] };
}

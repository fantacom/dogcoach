import { computePhase, sizeClassFor } from '@shared/phase.ts';
import { useBreeds, usePhases } from '@/lib/api/dogs';
import { todayIso } from '@/lib/format';
import type { Dog } from '@/types/db';

export function usePhase(dog: Dog | undefined) {
  const breeds = useBreeds();
  const phases = usePhases();
  if (!dog || !phases.data || !breeds.data) return null;
  const size = sizeClassFor({
    breedSizes: [dog.breed_primary_id, dog.breed_secondary_id].map(
      (id) => breeds.data.find((b) => b.id === id)?.size_class,
    ),
    weightKg: dog.weight_kg,
  });
  return computePhase({
    birthDate: dog.birth_date,
    sizeClass: size,
    phases: phases.data,
    today: todayIso(),
  });
}

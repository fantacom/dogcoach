import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Answers, type BreedTraits, computeTemperament } from '@shared/temperament.ts';
import type { Traits } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';

export function useTemperament(dogId: string | undefined) {
  return useQuery({
    queryKey: qk.temperament(dogId ?? ''),
    enabled: !!dogId,
    queryFn: async () => {
      const [answers, profile] = await Promise.all([
        supabase.from('temperament_answers').select('question_key, answer').eq('dog_id', dogId!),
        supabase
          .from('temperament_profile')
          .select('traits, updated_at')
          .eq('dog_id', dogId!)
          .maybeSingle(),
      ]);
      const rows = unwrap(answers) as { question_key: string; answer: string }[];
      const p = unwrap(profile) as { traits: Traits; updated_at: string } | null;
      return {
        answers: Object.fromEntries(rows.map((r) => [r.question_key, r.answer])) as Answers,
        traits: p?.traits ?? null,
      };
    },
  });
}

export function useSaveTemperament(dogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ answers, breeds }: { answers: Answers; breeds: BreedTraits[] }) => {
      const rows = Object.entries(answers).map(([question_key, answer]) => ({
        dog_id: dogId,
        question_key,
        answer,
      }));
      if (rows.length) unwrap(await supabase.from('temperament_answers').upsert(rows));
      const traits = computeTemperament(answers, breeds);
      unwrap(
        await supabase
          .from('temperament_profile')
          .upsert({ dog_id: dogId, traits, updated_at: new Date().toISOString() }),
      );
      return traits;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.temperament(dogId) }),
  });
}

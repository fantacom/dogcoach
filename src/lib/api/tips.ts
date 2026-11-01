import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CoachTip } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';

export function useTips(dogId: string | undefined) {
  return useQuery({
    queryKey: qk.tips(dogId ?? ''),
    enabled: !!dogId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('coach_tips')
          .select('*')
          .eq('dog_id', dogId!)
          .order('created_at', { ascending: false })
          .limit(30),
      ) as CoachTip[],
  });
}

export function useMarkTipRead(dogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .from('coach_tips')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id),
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tips(dogId) }),
  });
}

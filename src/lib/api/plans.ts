import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PlanCheckin, PlanTask, TaskRating, TrainingPlan } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';

export function usePlans(dogId: string | undefined) {
  return useQuery({
    queryKey: qk.plans(dogId ?? ''),
    enabled: !!dogId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('training_plans')
          .select('*')
          .eq('dog_id', dogId!)
          .order('created_at', { ascending: false }),
      ) as TrainingPlan[],
  });
}

export type PlanDetail = TrainingPlan & { tasks: PlanTask[]; checkins: PlanCheckin[] };

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: qk.plan(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const plan = unwrap(
        await supabase
          .from('training_plans')
          .select('*, tasks:plan_tasks(*), checkins:plan_checkins(*)')
          .eq('id', id!)
          .single(),
      ) as PlanDetail;
      plan.tasks.sort((a, b) => a.day_index - b.day_index);
      plan.checkins.sort((a, b) => a.due_at.localeCompare(b.due_at));
      return plan;
    },
  });
}

/** Aktive Pläne eines Hundes inkl. Aufgaben (für „Heute“ und lokale Erinnerungen). */
export function useActivePlans(dogId: string | undefined) {
  return useQuery({
    queryKey: [...qk.plans(dogId ?? ''), 'active'],
    enabled: !!dogId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('training_plans')
          .select('*, tasks:plan_tasks(*), checkins:plan_checkins(*)')
          .eq('dog_id', dogId!)
          .eq('status', 'active'),
      ) as PlanDetail[],
  });
}

export function useUpdateTask(planId: string, dogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      done,
      rating,
    }: {
      id: string;
      done: boolean;
      rating?: TaskRating | null;
    }) =>
      unwrap(
        await supabase
          .from('plan_tasks')
          .update({
            done_at: done ? new Date().toISOString() : null,
            rating: done ? (rating ?? null) : null,
          })
          .eq('id', id),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.plan(planId) });
      void qc.invalidateQueries({ queryKey: qk.plans(dogId) });
    },
  });
}

export function useCancelPlan(dogId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.from('training_plans').update({ status: 'cancelled' }).eq('id', id)),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: qk.plan(id) });
      void qc.invalidateQueries({ queryKey: qk.plans(dogId) });
    },
  });
}

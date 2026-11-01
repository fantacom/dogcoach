import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import type { Breed, Dog, DogInput, PhaseRow } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';
import { extensionFor, randomId, uploadFile } from './storage';

export function useBreeds() {
  return useQuery({
    queryKey: qk.breeds,
    staleTime: Infinity,
    queryFn: async () =>
      unwrap(await supabase.from('breeds').select('id, name_de, size_class, group, base_traits, notes').order('name_de')) as Breed[],
  });
}

export function usePhases() {
  return useQuery({
    queryKey: qk.phases,
    staleTime: Infinity,
    queryFn: async () =>
      unwrap(await supabase.from('dev_phases').select('size_class, phase_key, from_weeks, to_weeks, content')) as PhaseRow[],
  });
}

export function useDogs() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: qk.dogs,
    enabled: !!userId,
    queryFn: async () => unwrap(await supabase.from('dogs').select('*').order('created_at')) as Dog[],
  });
}

export function useDog(id: string | undefined) {
  const dogs = useDogs();
  return { ...dogs, data: dogs.data?.find((d) => d.id === id) };
}

export function useSaveDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DogInput }) =>
      id
        ? (unwrap(await supabase.from('dogs').update(input).eq('id', id).select('*').single()) as Dog)
        : (unwrap(await supabase.from('dogs').insert(input).select('*').single()) as Dog),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.dogs });
      void qc.invalidateQueries({ queryKey: qk.usage });
    },
  });
}

export function useDeleteDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('dogs').delete().eq('id', id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.dogs }),
  });
}

/** Foto hochladen (Pfad <user>/<dog>/…) und am Hund speichern. */
export async function uploadDogPhoto(userId: string, dogId: string, uri: string, mime: string) {
  const path = `${userId}/${dogId}/${randomId()}.${extensionFor(mime)}`;
  await uploadFile('dog-photos', path, uri, mime);
  unwrap(await supabase.from('dogs').update({ photo_url: path }).eq('id', dogId));
  return path;
}

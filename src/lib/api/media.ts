import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/authStore';
import type { Analysis, MediaUpload, Situation } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { invoke } from './functions';
import { qk } from './keys';
import { extensionFor, randomId, uploadFile } from './storage';

export const MAX_VIDEO_SECONDS = 30;
export const MAX_BYTES = 50 * 1024 * 1024;

export type MediaWithAnalysis = MediaUpload & { analysis: Analysis | null };

export function useMediaHistory(dogId: string | undefined) {
  return useQuery({
    queryKey: qk.media(dogId ?? ''),
    enabled: !!dogId,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('media_uploads')
          .select('*, analysis:analyses(*)')
          .eq('dog_id', dogId!)
          .order('created_at', { ascending: false })
          .limit(50),
      ) as (MediaUpload & { analysis: Analysis[] | Analysis | null })[];
      return rows.map((r) => ({ ...r, analysis: Array.isArray(r.analysis) ? (r.analysis[0] ?? null) : r.analysis }));
    },
  });
}

/** Einzelner Upload inkl. Analyse; Status live per Realtime (queued → analyzing → done/failed). */
export function useMediaItem(id: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.mediaItem(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const r = unwrap(
        await supabase.from('media_uploads').select('*, analysis:analyses(*)').eq('id', id!).single(),
      ) as MediaUpload & { analysis: Analysis[] | Analysis | null };
      return { ...r, analysis: Array.isArray(r.analysis) ? (r.analysis[0] ?? null) : r.analysis } as MediaWithAnalysis;
    },
    // Fallback, falls Realtime nicht verbunden ist
    refetchInterval: (q) => (q.state.data && ['queued', 'analyzing'].includes(q.state.data.status) ? 5000 : false),
  });

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`media-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'media_uploads', filter: `id=eq.${id}` }, () => {
        void qc.invalidateQueries({ queryKey: qk.mediaItem(id) });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return query;
}

export type NewUpload = {
  dogId: string;
  uri: string;
  mimeType: string;
  type: 'photo' | 'video';
  durationS: number | null;
  sizeBytes: number | null;
  question: string | null;
  isUnwanted: boolean | null;
  situation: Situation | null;
  checkinId: string | null;
};

export function useCreateUpload() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (u: NewUpload) => {
      const path = `${userId}/${u.dogId}/${randomId()}.${extensionFor(u.mimeType, u.type === 'video' ? 'mp4' : 'jpg')}`;
      // Limit zuerst prüfen (Trigger), dann hochladen: Datensatz anlegen, bei Upload-Fehler wieder löschen
      const row = unwrap(
        await supabase
          .from('media_uploads')
          .insert({
            dog_id: u.dogId,
            storage_path: path,
            type: u.type,
            duration_s: u.durationS,
            size_bytes: u.sizeBytes,
            user_question: u.question,
            is_unwanted: u.isUnwanted,
            situation: u.situation,
            plan_checkin_id: u.checkinId,
          })
          .select('id')
          .single(),
      ) as { id: string };
      try {
        await uploadFile('media', path, u.uri, u.mimeType);
      } catch (e) {
        await supabase.from('media_uploads').delete().eq('id', row.id);
        throw e;
      }
      await invoke('analyze-media', { media_id: row.id });
      return row.id;
    },
    onSuccess: (_id, u) => {
      void qc.invalidateQueries({ queryKey: qk.media(u.dogId) });
      void qc.invalidateQueries({ queryKey: qk.usage });
    },
  });
}

export async function retryAnalysis(mediaId: string) {
  await invoke('analyze-media', { media_id: mediaId });
}

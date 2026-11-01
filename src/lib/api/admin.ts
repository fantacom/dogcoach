import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AppConfigRow, Report } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';

export function useReports() {
  return useQuery({
    queryKey: qk.reports,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
      ) as Report[],
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ report, action }: { report: Report; action: 'hide' | 'dismiss' }) => {
      if (action === 'hide' && report.target_type !== 'user') {
        const table = report.target_type === 'post' ? 'forum_posts' : 'forum_replies';
        unwrap(await supabase.from(table).update({ status: 'hidden' }).eq('id', report.target_id));
      }
      unwrap(
        await supabase
          .from('reports')
          .update({
            status: action === 'hide' ? 'resolved' : 'dismissed',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', report.id),
      );
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.reports }),
  });
}

export function useAppConfig() {
  return useQuery({
    queryKey: qk.appConfig,
    queryFn: async () =>
      unwrap(await supabase.from('app_config').select('*').order('key')) as AppConfigRow[],
  });
}

export function useSetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) =>
      unwrap(await supabase.from('app_config').update({ value }).eq('key', key)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.appConfig }),
  });
}

/** Öffentliche Konfigurationswerte (Kontakt, Rechtstexte) – für alle Nutzer lesbar. */
export function useConfigValue(key: string) {
  const all = useAppConfig();
  return all.data?.find((r) => r.key === key)?.value ?? null;
}

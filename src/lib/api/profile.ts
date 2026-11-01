import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import type { Profile, Usage } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';

export function useProfile() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: qk.profile,
    enabled: !!userId,
    queryFn: async () =>
      unwrap(await supabase.from('profiles').select('*').eq('id', userId!).single<Profile>()),
  });
}

type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'display_name'
    | 'push_token'
    | 'notification_time'
    | 'timezone'
    | 'media_consent_at'
    | 'analytics_consent'
  >
>;

export function useUpdateProfile() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) =>
      unwrap(
        await supabase
          .from('profiles')
          .update(patch)
          .eq('id', userId!)
          .select('*')
          .single<Profile>(),
      ),
    onSuccess: (data) => qc.setQueryData(qk.profile, data),
  });
}

export function useUsage() {
  return useQuery({
    queryKey: qk.usage,
    queryFn: async () => unwrap(await supabase.rpc('my_usage')) as Usage,
  });
}

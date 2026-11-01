import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { filterContent } from '@shared/forumFilter.ts';
import { useAuthStore } from '@/stores/authStore';
import type { ForumCategory, ForumPost, ForumReply } from '@/types/db';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { invoke } from './functions';
import { qk } from './keys';
import { extensionFor, randomId, uploadFile } from './storage';

const PAGE = 20;

export function usePosts(category: ForumCategory | 'all') {
  return useInfiniteQuery({
    queryKey: qk.posts(category),
    initialPageParam: 0,
    getNextPageParam: (last: ForumPost[], all) =>
      last.length === PAGE ? all.length * PAGE : undefined,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (category !== 'all') q = q.eq('category', category);
      return unwrap(await q) as ForumPost[];
    },
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: qk.post(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const [post, replies] = await Promise.all([
        supabase.from('forum_posts').select('*').eq('id', id!).single(),
        supabase
          .from('forum_replies')
          .select('*')
          .eq('post_id', id!)
          .order('is_best', { ascending: false })
          .order('created_at'),
      ]);
      const p = unwrap(post) as ForumPost;
      const r = unwrap(replies) as ForumReply[];
      const authorIds = [
        ...new Set([p.author_id, ...r.map((x) => x.author_id)].filter((x): x is string => !!x)),
      ];
      const names = authorIds.length
        ? (unwrap(
            await supabase.from('public_profiles').select('id, display_name').in('id', authorIds),
          ) as { id: string; display_name: string | null }[])
        : [];
      return {
        post: p,
        replies: r,
        names: Object.fromEntries(names.map((n) => [n.id, n.display_name])) as Record<
          string,
          string | null
        >,
      };
    },
  });
}

export function useMyLikes() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: qk.myLikes,
    enabled: !!userId,
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('forum_likes').select('target_type, target_id').eq('user_id', userId!),
      ) as { target_type: string; target_id: string }[];
      return new Set(rows.map((r) => `${r.target_type}:${r.target_id}`));
    },
  });
}

export function useToggleLike(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      type,
      id,
      liked,
    }: {
      type: 'post' | 'reply';
      id: string;
      liked: boolean;
    }) => {
      if (liked)
        unwrap(
          await supabase.from('forum_likes').delete().eq('target_type', type).eq('target_id', id),
        );
      else unwrap(await supabase.from('forum_likes').insert({ target_type: type, target_id: id }));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.myLikes });
      void qc.invalidateQueries({ queryKey: qk.post(postId) });
    },
  });
}

export function useMarkBest(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) =>
      unwrap(await supabase.rpc('mark_best_reply', { p_reply: replyId })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.post(postId) }),
  });
}

export type NewPost = {
  category: ForumCategory;
  title: string;
  body: string;
  dogId: string | null;
  image: { uri: string; mimeType: string } | null;
};

/** Vorfilter im Client für sofortige Rückmeldung – verbindlich prüft die Edge Function. */
export const precheck = (...texts: string[]) => filterContent(...texts);

export function useCreatePost() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation({
    mutationFn: async (p: NewPost) => {
      let imagePath: string | null = null;
      if (p.image) {
        imagePath = `${userId}/${randomId()}.${extensionFor(p.image.mimeType)}`;
        await uploadFile('forum-images', imagePath, p.image.uri, p.image.mimeType);
      }
      return invoke<{ ok: boolean; id: string }>('forum-post', {
        kind: 'post',
        category: p.category,
        title: p.title,
        body: p.body,
        dog_id: p.dogId,
        image_path: imagePath,
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useCreateReply(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      invoke<{ ok: boolean; id: string }>('forum-post', { kind: 'reply', post_id: postId, body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.post(postId) });
      void qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useDeleteOwn(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }: { type: 'post' | 'reply'; id: string }) =>
      unwrap(
        await supabase
          .from(type === 'post' ? 'forum_posts' : 'forum_replies')
          .delete()
          .eq('id', id),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.post(postId) });
      void qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export async function reportContent(
  target_type: 'post' | 'reply' | 'user',
  target_id: string,
  reason: string,
) {
  unwrap(await supabase.from('reports').insert({ target_type, target_id, reason }));
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) =>
      unwrap(await supabase.from('blocks').insert({ blocked_id: blockedId })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['posts'] });
      void qc.invalidateQueries({ queryKey: ['post'] });
    },
  });
}

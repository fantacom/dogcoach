import { useQuery } from '@tanstack/react-query';

import { supabase } from '../supabase';
import { unwrap } from './errors';
import { qk } from './keys';

export type Bucket = 'media' | 'dog-photos' | 'forum-images';

/** Signierte URL (1 h gültig, 50 min gecacht). Buckets sind privat (CLAUDE.md §3.4). */
export function useSignedUrl(bucket: Bucket, path: string | null | undefined) {
  return useQuery({
    queryKey: qk.signedUrl(bucket, path ?? ''),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () =>
      unwrap(await supabase.storage.from(bucket).createSignedUrl(path!, 3600))!.signedUrl,
  });
}

/** Lokale Datei (file://, blob:, data:) hochladen. */
export async function uploadFile(bucket: Bucket, path: string, uri: string, contentType: string) {
  const body = await (await fetch(uri)).arrayBuffer();
  unwrap(await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: true }));
  return { path, size: body.byteLength };
}

export function extensionFor(mime: string, fallback = 'jpg') {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  };
  return map[mime] ?? fallback;
}

export const randomId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

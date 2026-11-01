/**
 * delete-account – Konto löschen inkl. aller Medien (CLAUDE.md §8, Apple-Pflicht).
 * Löscht Storage-Dateien in allen Buckets unter <user_id>/ und danach den Auth-Nutzer
 * (alle Tabellen hängen per ON DELETE CASCADE daran).
 */
import { json, serve } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

const BUCKETS = ['media', 'dog-photos', 'forum-images'];

async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const storage = adminClient().storage.from(bucket);
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) out.push(...(await listAll(bucket, path))); // Ordner
      else out.push(path);
    }
    if (!data || data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

serve(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();
  let removed = 0;
  for (const bucket of BUCKETS) {
    const files = await listAll(bucket, user.id);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(files.slice(i, i + 100));
      if (error) throw error;
    }
    removed += files.length;
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ ok: true, removed_files: removed });
});

import { adminClient } from './supabase.ts';

/** Einfaches Retrieval über Tags (CLAUDE.md §6). Vektorsuche erst bei Bedarf. */
export async function retrieveKnowledge(tags: string[], limit = 4): Promise<string> {
  const { data, error } = await adminClient()
    .from('knowledge_articles')
    .select('slug, topic, tags, content_md')
    .overlaps('tags', [...tags, 'all']);
  if (error) throw error;
  const ranked = (data ?? [])
    .map((a) => ({ a, score: (a.tags as string[]).filter((t) => tags.includes(t)).length }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
  return ranked.map(({ a }) => `### ${a.topic}\n${(a.content_md as string).trim()}`).join('\n\n');
}

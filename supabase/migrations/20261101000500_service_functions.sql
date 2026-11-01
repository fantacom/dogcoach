-- Hilfsfunktionen nur für Edge Functions (service_role).

create or replace function public.dogs_due_for_tips(p_since timestamptz, p_limit integer)
returns table (id uuid) language sql stable security definer set search_path = public as $$
  select d.id from public.dogs d
  where not exists (
    select 1 from public.coach_tips t
    where t.dog_id = d.id and t.source = 'ai' and t.created_at >= p_since
  )
  order by d.created_at
  limit p_limit
$$;

-- Antwortgarantie: veröffentlichte Fragen ohne Antwort, älter als forum_ai_reply_after_hours
create or replace function public.posts_needing_ai_reply(p_limit integer)
returns setof public.forum_posts language sql stable security definer set search_path = public as $$
  select p.* from public.forum_posts p
  where p.status = 'published' and not p.is_ai and p.ai_replied_at is null
    and p.created_at < now() - make_interval(hours => coalesce(public.app_config_int('forum_ai_reply_after_hours'), 6))
    and not exists (select 1 from public.forum_replies r where r.post_id = p.id and r.status = 'published')
  order by p.created_at
  limit p_limit
$$;

revoke execute on function public.dogs_due_for_tips(timestamptz, integer),
  public.posts_needing_ai_reply(integer) from public, anon, authenticated;

-- Row Level Security: Policies für JEDE Tabelle.
-- Grundsatz: Nutzer sehen/ändern nur eigene Daten. Kuratiertes Wissen ist lesbar.
-- Schreiben mit Geschäftslogik (Analysen, Pläne, Tipps, Forum) nur über Edge Functions (service_role).

-- app_config: lesen für alle Angemeldeten, ändern nur Admins
create policy app_config_read on public.app_config for select to authenticated using (true);
create policy app_config_admin_update on public.app_config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: nur eigenes Profil; Premium/Admin-Flags nicht selbst änderbar (Spaltenrechte)
create policy profiles_own_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, push_token, notification_time, timezone,
              media_consent_at, analytics_consent)
  on public.profiles to authenticated;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- Kuratiertes Wissen: nur lesen
create policy breeds_read on public.breeds for select to anon, authenticated using (true);
create policy dev_phases_read on public.dev_phases for select to anon, authenticated using (true);
create policy knowledge_read on public.knowledge_articles for select to authenticated using (true);
revoke insert, update, delete on public.breeds, public.dev_phases, public.knowledge_articles
  from anon, authenticated;

-- dogs: eigene Hunde, voller Zugriff (Limit per Trigger)
create policy dogs_own_all on public.dogs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy temperament_answers_own on public.temperament_answers for all to authenticated
  using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy temperament_profile_own on public.temperament_profile for all to authenticated
  using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
create policy dog_conditions_own on public.dog_conditions for all to authenticated
  using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));

-- coach_tips: lesen und als gelesen markieren
create policy coach_tips_own_select on public.coach_tips for select to authenticated
  using (public.owns_dog(dog_id));
create policy coach_tips_own_update on public.coach_tips for update to authenticated
  using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id));
revoke insert, update, delete on public.coach_tips from anon, authenticated;
grant update (read_at) on public.coach_tips to authenticated;

-- media_uploads: eigene anlegen (nur in eigenen Storage-Ordner) und lesen; Status setzt der Server
create policy media_own_select on public.media_uploads for select to authenticated
  using (owner_id = auth.uid());
create policy media_own_insert on public.media_uploads for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.owns_dog(dog_id)
    and storage_path like auth.uid()::text || '/' || dog_id::text || '/%'
    and status = 'queued'
    and (plan_checkin_id is null or exists (
      select 1 from public.plan_checkins c where c.id = plan_checkin_id and public.owns_plan(c.plan_id)
    ))
  );
create policy media_own_delete on public.media_uploads for delete to authenticated
  using (owner_id = auth.uid());
revoke update on public.media_uploads from anon, authenticated;

-- analyses: nur lesen
create policy analyses_own_select on public.analyses for select to authenticated
  using (exists (select 1 from public.media_uploads m where m.id = media_id and m.owner_id = auth.uid()));
revoke insert, update, delete on public.analyses from anon, authenticated;

-- training_plans: lesen, eigenen Plan abbrechen (nur Status)
create policy plans_own_select on public.training_plans for select to authenticated
  using (public.owns_dog(dog_id));
create policy plans_own_update on public.training_plans for update to authenticated
  using (public.owns_dog(dog_id)) with check (public.owns_dog(dog_id) and status in ('active', 'cancelled'));
revoke insert, update, delete on public.training_plans from anon, authenticated;
grant update (status) on public.training_plans to authenticated;

-- plan_tasks: lesen, abhaken und bewerten
create policy tasks_own_select on public.plan_tasks for select to authenticated
  using (public.owns_plan(plan_id));
create policy tasks_own_update on public.plan_tasks for update to authenticated
  using (public.owns_plan(plan_id)) with check (public.owns_plan(plan_id));
revoke insert, update, delete on public.plan_tasks from anon, authenticated;
grant update (done_at, rating) on public.plan_tasks to authenticated;

-- plan_checkins: nur lesen
create policy checkins_own_select on public.plan_checkins for select to authenticated
  using (public.owns_plan(plan_id));
revoke insert, update, delete on public.plan_checkins from anon, authenticated;

-- forum_posts / forum_replies: veröffentlichte lesen (ohne gegenseitig Blockierte), eigene immer.
-- Anlegen nur über Edge Function forum-post (Vorfilter). Eigene löschen erlaubt.
create policy posts_read on public.forum_posts for select to authenticated
  using (
    author_id = auth.uid()
    or public.is_admin()
    or (status = 'published' and not public.is_blocked(author_id))
  );
create policy posts_own_delete on public.forum_posts for delete to authenticated
  using (author_id = auth.uid());
create policy posts_admin_update on public.forum_posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, update on public.forum_posts from anon, authenticated;
grant update (status) on public.forum_posts to authenticated;

create policy replies_read on public.forum_replies for select to authenticated
  using (
    author_id = auth.uid()
    or public.is_admin()
    or (status = 'published' and not public.is_blocked(author_id)
        and exists (select 1 from public.forum_posts p where p.id = post_id))
  );
create policy replies_own_delete on public.forum_replies for delete to authenticated
  using (author_id = auth.uid());
create policy replies_admin_update on public.forum_replies for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, update on public.forum_replies from anon, authenticated;
grant update (status) on public.forum_replies to authenticated;

create policy likes_own on public.forum_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: eigene Meldungen anlegen/sehen; Admins alles
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- blocks: eigene Blockierungen
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- push_log: kein Zugriff für Nutzer (RLS an, keine Policy für authenticated)
revoke all on public.push_log from anon, authenticated;

-- Funktionen: nur, was der Client wirklich braucht
revoke execute on function public.enforce_dog_limit(), public.enforce_media_limit(),
  public.enforce_plan_limit(), public.handle_new_user(), public.forum_like_count(),
  public.forum_reply_count() from public, anon, authenticated;
revoke execute on function public.mark_best_reply(uuid) from public, anon;
grant execute on function public.mark_best_reply(uuid) to authenticated;

-- Limits/Stand für die App-Anzeige (eigener Nutzer)
create or replace function public.my_usage() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'is_premium', public.is_premium(auth.uid()),
    'dogs', (select count(*) from public.dogs where owner_id = auth.uid()),
    'free_max_dogs', public.app_config_int('free_max_dogs'),
    'media_this_month', public.media_analyses_this_month(auth.uid()),
    'free_media_analyses_per_month', public.app_config_int('free_media_analyses_per_month'),
    'active_plans', (select count(*) from public.training_plans p join public.dogs d on d.id = p.dog_id
                     where d.owner_id = auth.uid() and p.status = 'active'),
    'free_training_plans_active', public.app_config_int('free_training_plans_active')
  )
$$;
revoke execute on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;

-- Realtime für Analyse-Status
do $$ begin
  alter publication supabase_realtime add table public.media_uploads;
exception when undefined_object or duplicate_object then null; end $$;

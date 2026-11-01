-- DogCoach – Kernschema (CLAUDE.md §5)
-- Regeln: RLS auf JEDER Tabelle. Schreibzugriffe, die Logik/Limits brauchen, laufen über
-- Edge Functions (service_role) oder SECURITY-DEFINER-Funktionen.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- app_config (§4) – Limits und Schalter, nie im Code
-- value = null bedeutet „nicht festgelegt“ → Limit greift nicht.
-- ---------------------------------------------------------------------------

create table public.app_config (
  key text primary key,
  value jsonb,
  description text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create trigger app_config_updated_at before update on public.app_config
  for each row execute function public.set_updated_at();

create or replace function public.app_config_int(p_key text) returns integer
language sql stable security definer set search_path = public as $$
  select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::integer end
  from public.app_config where key = p_key
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  avatar_url text,
  push_token text,
  notification_time time not null default '18:00',
  timezone text not null default 'Europe/Berlin',
  is_premium boolean not null default false,
  premium_until timestamptz,
  is_admin boolean not null default false,
  media_consent_at timestamptz,
  analytics_consent boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_premium(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select is_premium and (premium_until is null or premium_until > now())
    from public.profiles where id = p_user
  ), false)
$$;

-- Öffentlich sichtbare Profilteile (Forum). View läuft mit Owner-Rechten.
create view public.public_profiles as
  select id, display_name, avatar_url from public.profiles;

-- ---------------------------------------------------------------------------
-- Kuratierte Wissensbasis (§6)
-- ---------------------------------------------------------------------------

create table public.breeds (
  id text primary key,
  name_de text not null,
  size_class text not null check (size_class in ('small', 'medium', 'large', 'giant')),
  "group" text not null,
  base_traits jsonb not null default '{}',
  notes text,
  reviewed_by text,
  reviewed_at timestamptz
);
alter table public.breeds enable row level security;

create table public.dev_phases (
  id serial primary key,
  size_class text not null check (size_class in ('small', 'medium', 'large', 'giant')),
  phase_key text not null check (
    phase_key in ('puppy', 'socialization', 'junior', 'adolescence', 'adult', 'senior')
  ),
  from_weeks integer not null check (from_weeks >= 0),
  to_weeks integer check (to_weeks is null or to_weeks > from_weeks),
  content jsonb not null default '{}',
  reviewed_by text,
  reviewed_at timestamptz,
  unique (size_class, phase_key)
);
alter table public.dev_phases enable row level security;

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  topic text not null,
  tags text[] not null default '{}',
  content_md text not null,
  reviewed_by text,
  reviewed_at timestamptz
);
alter table public.knowledge_articles enable row level security;
create index knowledge_articles_tags_idx on public.knowledge_articles using gin (tags);

-- ---------------------------------------------------------------------------
-- Hunde
-- ---------------------------------------------------------------------------

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  photo_url text, -- Storage-Pfad im Bucket dog-photos
  breed_primary_id text references public.breeds (id),
  breed_secondary_id text references public.breeds (id),
  is_mixed boolean not null default false,
  sex text check (sex in ('male', 'female')),
  neutered boolean,
  birth_date date,
  birth_date_estimated boolean not null default false,
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 0.5 and 120),
  origin text check (origin in ('breeder', 'shelter', 'foreign_rescue', 'unknown')),
  environment jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (breed_secondary_id is null or is_mixed),
  check (birth_date is null or birth_date <= current_date)
);
alter table public.dogs enable row level security;
create index dogs_owner_idx on public.dogs (owner_id);
create trigger dogs_updated_at before update on public.dogs
  for each row execute function public.set_updated_at();

create or replace function public.owns_dog(p_dog uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dogs where id = p_dog and owner_id = auth.uid())
$$;

-- Limit free_max_dogs serverseitig (greift für jeden Schreibweg)
create or replace function public.enforce_dog_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer := public.app_config_int('free_max_dogs');
begin
  if v_limit is not null and not public.is_premium(new.owner_id) then
    if (select count(*) from public.dogs where owner_id = new.owner_id) >= v_limit then
      raise exception 'LIMIT_REACHED:free_max_dogs' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger dogs_limit before insert on public.dogs
  for each row execute function public.enforce_dog_limit();

create table public.temperament_answers (
  dog_id uuid not null references public.dogs (id) on delete cascade,
  question_key text not null,
  answer text not null,
  primary key (dog_id, question_key)
);
alter table public.temperament_answers enable row level security;

create table public.temperament_profile (
  dog_id uuid primary key references public.dogs (id) on delete cascade,
  traits jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.temperament_profile enable row level security;

-- Nur Schema, kein UI (§3.6)
create table public.dog_conditions (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  condition text not null,
  since date,
  notes text
);
alter table public.dog_conditions enable row level security;

-- ---------------------------------------------------------------------------
-- Coach-Hinweise (§3.3)
-- ---------------------------------------------------------------------------

create table public.coach_tips (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  category text not null check (
    category in ('exercise', 'training', 'nutrition', 'grooming', 'health_reminder', 'social', 'phase_change')
  ),
  topic_key text not null,
  title text not null,
  body text not null,
  source text not null default 'ai' check (source in ('ai', 'phase_change', 'system')),
  priority smallint not null default 0,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  pushed_at timestamptz
);
alter table public.coach_tips enable row level security;
create index coach_tips_dog_idx on public.coach_tips (dog_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Medien & Analysen (§3.4)
-- ---------------------------------------------------------------------------

create table public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null,
  type text not null check (type in ('photo', 'video')),
  duration_s numeric(5, 1) check (duration_s is null or duration_s <= 31),
  size_bytes bigint check (size_bytes is null or size_bytes <= 52428800),
  user_question text check (char_length(user_question) <= 500),
  is_unwanted boolean,
  situation text check (
    situation in ('walk', 'home', 'visitors', 'other_dog', 'car', 'alone', 'other')
  ),
  plan_checkin_id uuid,
  status text not null default 'queued' check (status in ('queued', 'analyzing', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
alter table public.media_uploads enable row level security;
create index media_uploads_owner_idx on public.media_uploads (owner_id, created_at desc);

-- Limit free_media_analyses_per_month (Check-in-Aufnahmen zählen nicht)
create or replace function public.media_analyses_this_month(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.media_uploads
  where owner_id = p_user and plan_checkin_id is null
    and created_at >= date_trunc('month', now())
$$;

create or replace function public.enforce_media_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer := public.app_config_int('free_media_analyses_per_month');
begin
  if new.plan_checkin_id is null and v_limit is not null and not public.is_premium(new.owner_id) then
    if public.media_analyses_this_month(new.owner_id) >= v_limit then
      raise exception 'LIMIT_REACHED:free_media_analyses_per_month' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger media_uploads_limit before insert on public.media_uploads
  for each row execute function public.enforce_media_limit();

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null unique references public.media_uploads (id) on delete cascade,
  observations jsonb,
  result_type text not null check (
    result_type in ('answer', 'assessment', 'vet_referral', 'trainer_referral', 'retake')
  ),
  assessment jsonb,
  answer_md text,
  safety_flag text not null default 'none' check (safety_flag in ('none', 'vet', 'aggression', 'unusable')),
  confidence numeric(3, 2) check (confidence between 0 and 1),
  model_versions jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.analyses enable row level security;

-- ---------------------------------------------------------------------------
-- Trainingspläne (§3.4)
-- ---------------------------------------------------------------------------

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  analysis_id uuid references public.analyses (id) on delete set null,
  previous_plan_id uuid references public.training_plans (id) on delete set null,
  goal text not null,
  summary text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'superseded')),
  start_date date not null default current_date,
  end_date date not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
alter table public.training_plans enable row level security;
create index training_plans_dog_idx on public.training_plans (dog_id, status);

-- Limit free_training_plans_active (wird beim Anlegen durch die Edge Function geprüft UND hier)
create or replace function public.enforce_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := (select owner_id from public.dogs where id = new.dog_id);
  v_limit integer := public.app_config_int('free_training_plans_active');
begin
  -- Neue Version eines bestehenden Plans ersetzt diesen → zählt nicht zusätzlich
  if new.status = 'active' and new.previous_plan_id is null
     and v_limit is not null and not public.is_premium(v_owner) then
    if (select count(*) from public.training_plans p join public.dogs d on d.id = p.dog_id
        where d.owner_id = v_owner and p.status = 'active') >= v_limit then
      raise exception 'LIMIT_REACHED:free_training_plans_active' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger training_plans_limit before insert on public.training_plans
  for each row execute function public.enforce_plan_limit();

create table public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  day_index integer not null check (day_index between 0 and 41),
  scheduled_at timestamptz not null,
  title text not null,
  steps jsonb not null default '{}',
  success_criteria text,
  done_at timestamptz,
  rating text check (rating in ('works', 'partial', 'not_yet')),
  notified_at timestamptz
);
alter table public.plan_tasks enable row level security;
create index plan_tasks_plan_idx on public.plan_tasks (plan_id, day_index);
create index plan_tasks_due_idx on public.plan_tasks (scheduled_at) where notified_at is null;

create table public.plan_checkins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  due_at timestamptz not null,
  instruction text,
  media_id uuid references public.media_uploads (id) on delete set null,
  comparison jsonb,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.plan_checkins enable row level security;

alter table public.media_uploads
  add constraint media_uploads_checkin_fk foreign key (plan_checkin_id)
  references public.plan_checkins (id) on delete set null;

create or replace function public.owns_plan(p_plan uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.training_plans p join public.dogs d on d.id = p.dog_id
    where p.id = p_plan and d.owner_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- Community (§3.5)
-- ---------------------------------------------------------------------------

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete cascade, -- null bei KI
  dog_id uuid references public.dogs (id) on delete set null,
  dog_snapshot jsonb, -- Rasse/Alter zum Zeitpunkt der Frage (andere Nutzer sehen dogs nicht)
  category text not null check (
    category in ('training', 'behavior', 'puppy', 'nutrition', 'health', 'everyday', 'other')
  ),
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 10 and 4000),
  image_url text, -- Storage-Pfad im Bucket forum-images
  is_ai boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  like_count integer not null default 0,
  reply_count integer not null default 0,
  ai_replied_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.forum_posts enable row level security;
create index forum_posts_list_idx on public.forum_posts (status, created_at desc);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete cascade, -- null bei KI
  body text not null check (char_length(body) between 2 and 4000),
  is_ai boolean not null default false,
  is_best boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (is_ai or author_id is not null)
);
alter table public.forum_replies enable row level security;
create index forum_replies_post_idx on public.forum_replies (post_id, created_at);
create unique index forum_replies_one_best on public.forum_replies (post_id) where is_best;

create table public.forum_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
alter table public.forum_likes enable row level security;

create or replace function public.forum_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_row public.forum_likes := coalesce(new, old);
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if v_row.target_type = 'post' then
    update public.forum_posts set like_count = greatest(like_count + v_delta, 0) where id = v_row.target_id;
  else
    update public.forum_replies set like_count = greatest(like_count + v_delta, 0) where id = v_row.target_id;
  end if;
  return null;
end $$;
create trigger forum_likes_count after insert or delete on public.forum_likes
  for each row execute function public.forum_like_count();

create or replace function public.forum_reply_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_posts set reply_count = reply_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.forum_posts set reply_count = greatest(reply_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger forum_replies_count after insert or delete on public.forum_replies
  for each row execute function public.forum_reply_count();

-- „Hilfreichste Antwort“ – nur der Fragesteller
create or replace function public.mark_best_reply(p_reply uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_post uuid;
begin
  select r.post_id into v_post from public.forum_replies r
    join public.forum_posts p on p.id = r.post_id
    where r.id = p_reply and p.author_id = auth.uid();
  if v_post is null then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  update public.forum_replies set is_best = false where post_id = v_post and is_best;
  update public.forum_replies set is_best = true where id = p_reply;
end $$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.reports enable row level security;

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

create or replace function public.is_blocked(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_author is not null and exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = p_author)
       or (blocker_id = p_author and blocked_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------------
-- Push-Protokoll für max_daily_pushes (nur service_role)
-- ---------------------------------------------------------------------------

create table public.push_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('task', 'checkin', 'tip', 'phase_change', 'forum')),
  ref_id uuid,
  sent_at timestamptz not null default now()
);
alter table public.push_log enable row level security;
create index push_log_user_day_idx on public.push_log (user_id, sent_at desc);

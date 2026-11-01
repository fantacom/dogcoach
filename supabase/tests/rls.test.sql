-- RLS-Tests: Nutzer A darf Daten von Nutzer B weder sehen noch ändern.
-- Jede Prüfung wirft bei Fehlschlag eine Exception (ON_ERROR_STOP bricht ab).

create schema if not exists tests;
create or replace function tests.as_user(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create or replace function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  execute 'set role anon';
end $$;
create or replace function tests.expect(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'TEST FEHLGESCHLAGEN: %', p_msg; end if;
end $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Testnutzer anlegen (Trigger legt Profile an)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.de'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.de'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.de');
update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-0000000000ad';
select tests.expect((select count(*) from public.profiles) = 3, 'Profile per Trigger angelegt');

-- A legt Hund an
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.dogs (id, name) values ('10000000-0000-0000-0000-00000000000a', 'Bello');
insert into public.temperament_answers (dog_id, question_key, answer)
  values ('10000000-0000-0000-0000-00000000000a', 'energy', 'high');
insert into public.media_uploads (id, dog_id, storage_path, type)
  values ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a',
          '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-00000000000a/x.jpg', 'photo');
select tests.expect((select count(*) from public.dogs) = 1, 'A sieht eigenen Hund');
reset role;

-- B sieht nichts von A
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.expect((select count(*) from public.dogs) = 0, 'B sieht Hund von A nicht');
select tests.expect((select count(*) from public.temperament_answers) = 0, 'B sieht Antworten von A nicht');
select tests.expect((select count(*) from public.media_uploads) = 0, 'B sieht Uploads von A nicht');
select tests.expect((select count(*) from public.profiles) = 1, 'B sieht nur eigenes Profil');
update public.dogs set name = 'Gehackt' where id = '10000000-0000-0000-0000-00000000000a';
delete from public.dogs where id = '10000000-0000-0000-0000-00000000000a';
reset role;
select tests.expect((select name from public.dogs where id = '10000000-0000-0000-0000-00000000000a') = 'Bello',
  'B kann Hund von A weder ändern noch löschen');

-- B darf keinen Hund für A anlegen und keine Antworten an A-Hund hängen
select tests.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  insert into public.dogs (name, owner_id) values ('Fremd', '00000000-0000-0000-0000-00000000000a');
  raise exception 'TEST FEHLGESCHLAGEN: B konnte Hund für A anlegen';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.temperament_answers (dog_id, question_key, answer)
    values ('10000000-0000-0000-0000-00000000000a', 'x', 'y');
  raise exception 'TEST FEHLGESCHLAGEN: B konnte Antwort an A-Hund hängen';
exception when insufficient_privilege then null; end $$;
-- B darf Upload nicht in fremden Storage-Ordner legen
insert into public.dogs (id, name) values ('10000000-0000-0000-0000-00000000000b', 'Luna');
do $$ begin
  insert into public.media_uploads (dog_id, storage_path, type)
    values ('10000000-0000-0000-0000-00000000000b',
            '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-00000000000b/x.jpg', 'photo');
  raise exception 'TEST FEHLGESCHLAGEN: Upload in fremden Ordner möglich';
exception when insufficient_privilege then null; end $$;
reset role;

-- Profile: Premium/Admin nicht selbst setzbar
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  update public.profiles set is_premium = true where id = auth.uid();
  raise exception 'TEST FEHLGESCHLAGEN: is_premium selbst gesetzt';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.profiles set is_admin = true where id = auth.uid();
  raise exception 'TEST FEHLGESCHLAGEN: is_admin selbst gesetzt';
exception when insufficient_privilege then null; end $$;
update public.profiles set display_name = 'Anna' where id = auth.uid();
-- Analyse-Status nicht selbst setzbar
do $$ begin
  update public.media_uploads set status = 'done';
  raise exception 'TEST FEHLGESCHLAGEN: Upload-Status selbst gesetzt';
exception when insufficient_privilege then null; end $$;
-- Kuratiertes Wissen nicht änderbar
do $$ begin
  insert into public.breeds (id, name_de, size_class, "group") values ('x', 'X', 'small', 'x');
  raise exception 'TEST FEHLGESCHLAGEN: Rasse angelegt';
exception when insufficient_privilege then null; end $$;
-- app_config nicht änderbar für Nicht-Admins (Update trifft 0 Zeilen)
update public.app_config set value = '99' where key = 'max_daily_pushes';
-- push_log unzugänglich
do $$ begin
  perform 1 from public.push_log;
  raise exception 'TEST FEHLGESCHLAGEN: push_log lesbar';
exception when insufficient_privilege then null; end $$;
-- Forum: direktes Anlegen verboten (nur über Edge Function mit Vorfilter)
do $$ begin
  insert into public.forum_posts (author_id, category, title, body)
    values (auth.uid(), 'other', 'Hallo Welt', 'Ein ungefilterter Beitrag');
  raise exception 'TEST FEHLGESCHLAGEN: Forum-Beitrag direkt angelegt';
exception when insufficient_privilege then null; end $$;
reset role;
select tests.expect((select value from public.app_config where key = 'max_daily_pushes') = '1'::jsonb,
  'Nicht-Admin kann app_config nicht ändern');

-- Admin darf app_config ändern
select tests.as_user('00000000-0000-0000-0000-0000000000ad');
update public.app_config set value = '2' where key = 'max_daily_pushes';
reset role;
select tests.expect((select value from public.app_config where key = 'max_daily_pushes') = '2'::jsonb,
  'Admin ändert app_config');
update public.app_config set value = '1' where key = 'max_daily_pushes';

-- Anon sieht keine Nutzerdaten, aber Rassen
select tests.as_anon();
select tests.expect((select count(*) from public.dogs) = 0, 'anon sieht keine Hunde');
reset role;

-- Limit free_max_dogs: null = kein Limit; 1 = zweiter Hund verboten; Premium ausgenommen
update public.app_config set value = '1' where key = 'free_max_dogs';
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.dogs (name) values ('Zweiter');
  raise exception 'TEST FEHLGESCHLAGEN: Limit free_max_dogs greift nicht';
exception when raise_exception then
  if sqlerrm not like 'LIMIT_REACHED:free_max_dogs%' then raise; end if;
end $$;
reset role;
update public.profiles set is_premium = true where id = '00000000-0000-0000-0000-00000000000a';
select tests.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.dogs (name) values ('Premium-Zweiter');
reset role;
update public.profiles set is_premium = false where id = '00000000-0000-0000-0000-00000000000a';
update public.app_config set value = null where key = 'free_max_dogs';

-- Limit free_media_analyses_per_month
update public.app_config set value = '1' where key = 'free_media_analyses_per_month';
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.media_uploads (dog_id, storage_path, type)
    values ('10000000-0000-0000-0000-00000000000a',
            '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-00000000000a/y.jpg', 'photo');
  raise exception 'TEST FEHLGESCHLAGEN: Limit free_media_analyses_per_month greift nicht';
exception when raise_exception then
  if sqlerrm not like 'LIMIT_REACHED:free_media_analyses_per_month%' then raise; end if;
end $$;
select tests.expect((public.my_usage() ->> 'media_this_month')::int = 1, 'my_usage zählt Uploads');
reset role;
update public.app_config set value = null where key = 'free_media_analyses_per_month';

-- Forum: Blockieren blendet Beiträge aus; beste Antwort nur durch Fragesteller
insert into public.forum_posts (id, author_id, category, title, body)
  values ('30000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a',
          'training', 'Leinenführigkeit', 'Mein Hund zieht stark an der Leine, was tun?');
insert into public.forum_replies (id, post_id, author_id, body)
  values ('40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000a',
          '00000000-0000-0000-0000-00000000000b', 'Stehenbleiben, wenn die Leine spannt.');
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.expect((select count(*) from public.forum_posts) = 1, 'B sieht Beitrag von A');
do $$ begin
  perform public.mark_best_reply('40000000-0000-0000-0000-00000000000b');
  raise exception 'TEST FEHLGESCHLAGEN: B markiert beste Antwort fremder Frage';
exception when insufficient_privilege then null; end $$;
insert into public.forum_likes (target_type, target_id) values ('post', '30000000-0000-0000-0000-00000000000a');
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-00000000000a');
select tests.expect((select count(*) from public.forum_posts) = 0, 'B sieht blockierten A nicht mehr');
insert into public.reports (target_type, target_id, reason)
  values ('post', '30000000-0000-0000-0000-00000000000a', 'Spam-Verdacht');
reset role;
select tests.expect((select like_count from public.forum_posts where id = '30000000-0000-0000-0000-00000000000a') = 1,
  'Like-Zähler');
select tests.expect((select reply_count from public.forum_posts where id = '30000000-0000-0000-0000-00000000000a') = 1,
  'Antwort-Zähler');
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select public.mark_best_reply('40000000-0000-0000-0000-00000000000b');
select tests.expect((select count(*) from public.reports) = 0, 'A sieht Meldung von B nicht');
reset role;
select tests.expect((select is_best from public.forum_replies where id = '40000000-0000-0000-0000-00000000000b'),
  'A markiert beste Antwort');
select tests.as_user('00000000-0000-0000-0000-0000000000ad');
select tests.expect((select count(*) from public.reports) = 1, 'Admin sieht Meldungen');
reset role;

-- Konto löschen: Kaskade entfernt alle Daten von A
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select tests.expect((select count(*) from public.dogs where owner_id = '00000000-0000-0000-0000-00000000000a') = 0,
  'Hunde gelöscht');
select tests.expect((select count(*) from public.media_uploads where owner_id = '00000000-0000-0000-0000-00000000000a') = 0,
  'Uploads gelöscht');
select tests.expect((select count(*) from public.forum_posts where author_id = '00000000-0000-0000-0000-00000000000a') = 0,
  'Forum-Beiträge gelöscht');

-- Seed vollständig
select tests.expect((select count(*) from public.breeds) >= 40, 'mind. 40 Rassen');
select tests.expect((select count(*) from public.dev_phases) = 24, '6 Phasen x 4 Größen');
select tests.expect((select count(*) from public.breeds where reviewed_by is not null) = 0, 'Rassen als Entwurf markiert');
select tests.expect((select count(*) from public.knowledge_articles where reviewed_by is not null) = 0, 'Artikel als Entwurf');

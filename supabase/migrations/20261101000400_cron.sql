-- Zeitgesteuerte Jobs (pg_cron → pg_net → Edge Functions).
-- Voraussetzung (einmalig, siehe docs/SETUP.md): Vault-Secrets 'project_url' und 'cron_secret'.
-- Lokal (supabase/tests/run.sh) wird diese Datei übersprungen.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_edge_function(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret');
begin
  if v_url is null or v_secret is null then
    raise warning 'Vault-Secrets project_url/cron_secret fehlen – Job % übersprungen', p_name;
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;
revoke execute on function public.invoke_edge_function(text) from public, anon, authenticated;

-- Täglich 05:07 UTC (≈ 6/7 Uhr DACH): Coach-Hinweise erzeugen
select cron.schedule('generate-coach-tips', '7 5 * * *', $$select public.invoke_edge_function('generate-coach-tips')$$);
-- Alle 15 Minuten: fällige Aufgaben, Check-ins und Tipps per Push
select cron.schedule('send-reminders', '*/15 * * * *', $$select public.invoke_edge_function('send-reminders')$$);
-- Alle 15 Minuten: Antwortgarantie im Forum
select cron.schedule('forum-ai-reply', '3-59/15 * * * *', $$select public.invoke_edge_function('forum-ai-reply')$$);

#!/usr/bin/env bash
# Richtet das Supabase-Projekt ein – ohne Docker. Auf dem Mac im Projektordner ausführen:
#   npm run backend:setup
# Voraussetzungen: supabase/.env.functions ausgefüllt (siehe .env.functions.example).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="${SUPABASE_PROJECT_REF:-nldxvcdyfkfydtxznehc}"
SB="npx supabase"
ENV_FILE="supabase/.env.functions"

step() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }

[ -f "$ENV_FILE" ] || { echo "Fehlt: $ENV_FILE (Vorlage: supabase/.env.functions.example)"; exit 1; }

if ! grep -q '^CRON_SECRET=.\+' "$ENV_FILE"; then
  SECRET=$(openssl rand -hex 32)
  sed -i.bak "s/^CRON_SECRET=.*/CRON_SECRET=$SECRET/" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  echo "CRON_SECRET erzeugt."
fi
CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2-)

step "1/6 Anmelden und Projekt verknüpfen"
$SB projects list >/dev/null 2>&1 || $SB login
$SB link --project-ref "$PROJECT_REF"

step "2/6 Auth-Einstellungen übertragen (anonyme Anmeldung, Redirect-URLs, Code-Länge)"
$SB config push --project-ref "$PROJECT_REF"

step "3/6 Datenbank: Migrationen und Seed (Rassen, Phasen, Wissen, app_config)"
$SB db push --include-seed

step "4/6 Secrets für Edge Functions setzen"
$SB secrets set --env-file "$ENV_FILE" --project-ref "$PROJECT_REF"

step "5/6 Edge Functions deployen (ohne Docker)"
$SB functions deploy --use-api --project-ref "$PROJECT_REF"

step "6/6 Zeitgesteuerte Jobs aktivieren"
cat <<SQL

Bitte einmalig im Supabase-Dashboard → SQL Editor ausführen:

  select vault.create_secret('https://$PROJECT_REF.supabase.co', 'project_url');
  select vault.create_secret('$CRON_SECRET', 'cron_secret');

Optional – dich selbst zum Admin machen (Konto-ID steht in der App unter Einstellungen):

  update public.profiles set is_admin = true where id = '<deine-konto-id>';

SQL
echo "Fertig."

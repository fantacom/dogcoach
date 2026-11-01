# Einrichtung

## 1. Umgebungsvariablen

### App (`.env`, Vorlage `.env.example`)

| Variable                        | Wert                                       | Woher                                  |
| ------------------------------- | ------------------------------------------ | -------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | `https://nldxvcdyfkfydtxznehc.supabase.co` | vorbelegt                              |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon- bzw. publishable-Key                 | Supabase → Project Settings → API Keys |

### Edge Functions (`supabase/.env.functions`, Vorlage `supabase/.env.functions.example`)

| Variable                    | Pflicht | Wert / Woher                                                                            |
| --------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`         | ja      | console.anthropic.com → API Keys (Auftragsverarbeitungsvertrag abschließen)             |
| `CLAUDE_MODEL`              | ja      | `claude-opus-5-5`                                                                       |
| `GCP_PROJECT_ID`            | ja      | Google-Cloud-Projekt mit aktivierter Vertex AI API                                      |
| `GCP_LOCATION`              | ja      | `europe-west3`                                                                          |
| `GEMINI_MODEL`              | ja      | Gemini-Modell, das in `europe-west3` verfügbar ist (Vertex AI → Model Garden)           |
| `GCP_SERVICE_ACCOUNT_JSON`  | ja      | Service-Account mit Rolle „Vertex AI User“ → Schlüssel (JSON) in eine Zeile oder base64 |
| `CRON_SECRET`               | ja      | wird vom Setup-Skript erzeugt                                                           |
| `EXPO_ACCESS_TOKEN`         | nein    | expo.dev → Access Tokens (nur bei „Enhanced Push Security“)                             |
| `REVENUECAT_WEBHOOK_SECRET` | später  | RevenueCat → Webhook → Authorization Header                                             |

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` setzt Supabase automatisch.

## 2. Backend einrichten (Mac, einmalig)

```bash
cd ~/Documents/dogcoach
```

```bash
git pull
```

```bash
npm ci
```

```bash
cp supabase/.env.functions.example supabase/.env.functions
```

```bash
open -e supabase/.env.functions
```

Werte eintragen und speichern, dann:

```bash
npm run backend:setup
```

Das Skript verknüpft das Projekt und überträgt die Auth-Einstellungen (anonyme Anmeldung, Redirect-URLs). Danach spielt es Migrationen und Seed ein, setzt die Secrets und deployt die Edge Functions, alles ohne Docker. Am Ende gibt es zwei SQL-Zeilen für die zeitgesteuerten Jobs aus. Diese im Supabase-Dashboard im **SQL Editor** ausführen.

**Admin werden:** Die Konto-ID steht in der App unter **Einstellungen**. Im SQL Editor ausführen:

```sql
update public.profiles set is_admin = true where id = '<konto-id>';
```

## 3. App auf dem iPhone (Expo Go)

```bash
npx expo start
```

QR-Code mit der iPhone-Kamera scannen, dann „In Expo Go öffnen“. Mac und iPhone müssen im selben WLAN sein. Expo Go und die Expo-CLI müssen mit demselben Expo-Konto angemeldet sein (`npx expo login`). Falls keine Verbindung entsteht, mit Tunnel starten:

```bash
npx expo start --tunnel
```

## 4. Prüfungen

| Befehl                        | Prüft                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run check`               | Typecheck, ESLint, Prettier, Jest (App und gemeinsame Logik)                                     |
| `npm run typecheck:functions` | Deno-Typprüfung aller Edge Functions                                                             |
| `npm run test:db`             | Migrationen, Seed und RLS-Tests gegen ein lokales Postgres (`PGHOST`, `PGPORT`, `PGUSER` setzen) |

## 5. Später: E-Mail-Code beim Login

Supabase erlaubt eigene Mailvorlagen im Free-Tarif nur mit eigenem SMTP-Server. Ablauf:

1. Bei einem Mailanbieter wie Resend oder Brevo ein SMTP-Konto anlegen und die Absender-Domain per DNS bestätigen.
2. In `supabase/config.toml` den Abschnitt `[auth.email.smtp]` und die Vorlagen-Abschnitte aktivieren. Das Passwort kommt über `env(...)`.
3. `npx supabase config push` ausführen.

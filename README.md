# DogCoach

KI-gestützter Coach für Hundebesitzer (Arbeitstitel). Verbindliche Projektanweisung: [`CLAUDE.md`](CLAUDE.md), Phasen: [`PROMPTS.md`](PROMPTS.md).

Läuft vollständig in **Expo Go** (iPhone) und im **Browser** – ohne Xcode, ohne nativen Build.

## Funktionen

- **Heute**: Entwicklungsphase nach Alter und Größenklasse, Coach-Hinweise, heutige Trainingsaufgabe, Check-ins
- **Analyse**: Foto/Video (max. 30 s, 720p) → Gemini-Beobachtung → Claude-Einschätzung → Trainingsplan
- **Trainingsplan**: Tagesaufgaben mit Erinnerung, Abhaken und Bewertung, Check-in-Vergleich mit Planversionen
- **Community**: Fragen, Antworten, Likes, hilfreichste Antwort, Antwortgarantie durch KI-Coach, Vorfilter, Melden, Blockieren
- **Mein Hund**: Profil, Wesens-Fragebogen, Wesensprofil-Karten
- **Einstellungen**: Erinnerungszeit, Konto sichern, Datenexport, Konto löschen, Admin-Ansicht

## Stack

Expo SDK 58 · TypeScript strict · Expo Router · NativeWind 4 · TanStack Query · Zustand · i18next ·
Supabase (Auth, Postgres mit RLS, Storage, Edge Functions, pg_cron) · Claude (Anthropic) · Gemini (Vertex AI, europe-west3)

## Start

Einrichtung: [`docs/SETUP.md`](docs/SETUP.md) · Entscheidungen: [`docs/DECISIONS.md`](docs/DECISIONS.md) · Release: [`docs/RELEASE.md`](docs/RELEASE.md)

```bash
npm ci
cp .env.example .env          # Anon-Key eintragen
npm run backend:setup         # einmalig, siehe docs/SETUP.md
npx expo start
```

## Befehle

| Befehl                        | Zweck                                             |
| ----------------------------- | ------------------------------------------------- |
| `npx expo start`              | Dev-Server (QR-Code für Expo Go, `w` für Browser) |
| `npm run check`               | Typecheck, Lint, Prettier, Jest                   |
| `npm run typecheck:functions` | Deno-Typprüfung der Edge Functions                |
| `npm run test:db`             | Migrationen + RLS-Tests gegen lokales Postgres    |
| `npm run backend:setup`       | Supabase einrichten (ohne Docker)                 |
| `npm run backend:migrate`     | Neue Migrationen einspielen                       |
| `npm run backend:deploy`      | Edge Functions deployen                           |

## Struktur

```
src/app/                       Screens (Expo Router): (tabs)/, dog/, analysis/, plan/, community/, settings, admin
src/components/ui/             Eigene Basis-Komponenten
src/lib/api/                   Datenzugriff (TanStack Query)
src/i18n/de.json               Alle Texte (Du-Form)
supabase/migrations/           Schema, RLS, Storage, Cron
supabase/seed/                 app_config, Rassen, Entwicklungsphasen, Wissensartikel (Entwurf)
supabase/functions/            Edge Functions (Deno)
supabase/functions/_shared/logic/   Gemeinsame Logik für App und Server (Sicherheit, Phasen, Schemas …)
supabase/functions/_shared/prompts/ Versionierte Prompts
supabase/tests/                RLS-Tests ohne Docker
.maestro/                      E2E-Smoke-Test (nativer Build)
```

# Entscheidungen

Vom Produktinhaber delegiert („Triff alle Entscheidungen selbst“). Jede Entscheidung mit Grund und Folge.
Rahmen: Die App läuft vollständig in **Expo Go** (iPhone) und im **Browser**. Kein Xcode, kein Apple Developer Account,
keine Libraries mit eigenem nativen Build. RevenueCat und EAS Build kommen später.

## Plattform und Bibliotheken

| #   | Entscheidung                                                                               | Grund                                                                        | Folge                                                                                          |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Nur Bibliotheken, die in Expo Go enthalten sind oder reines JS sind                        | Vorgabe Expo Go                                                              | RevenueCat, Sentry, PostHog und Sign in with Apple erst mit nativem Build (siehe `RELEASE.md`) |
| 2   | NativeWind 4 (stabil) statt 5 (Preview)                                                    | Stabilität                                                                   | Tailwind 3                                                                                     |
| 3   | Video-Komprimierung über `expo-image-picker` (`videoExportPreset`/`videoQuality` 1280×720) | Echte 720p-Komprimierung ohne nativen Build möglich                          | Gilt für iOS. Im Browser keine Komprimierung, dort greifen 30 s / 50 MB                        |
| 4   | Keine Modals, Auswahllisten inline                                                         | Ein React-Native-Web-Modal blockierte danach Texteingaben (im Test gefunden) | Rassenauswahl und Melden erscheinen als ausklappbarer Bereich                                  |
| 5   | Web-Ausgabe `single` (SPA)                                                                 | Kein eigener Server nötig                                                    | Hosting als statische Seite möglich                                                            |

## Konto und Anmeldung

| #   | Entscheidung                                                                                    | Grund                                                                                  | Folge                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 6   | Beim ersten Start **anonymes Supabase-Konto**                                                   | Der Magic-Link-Login lief in Expo Go nicht zuverlässig; RLS braucht trotzdem ein Konto | Kein Login-Zwang. Daten sind sofort serverseitig geschützt                                                    |
| 7   | Konto optional mit E-Mail sichern; Anmeldung auf neuem Gerät per Link **oder** 6-stelligem Code | Datenverlust bei Gerätewechsel vermeiden                                               | Der Code steht nur in der Mail, wenn eigene Mailvorlagen erlaubt sind (eigener SMTP-Server nötig, Free-Tarif) |
| 8   | Sign in with Apple später                                                                       | Braucht Apple Developer Account und nativen Build                                      | Pflicht vor App-Store-Release, wenn andere Social Logins kommen. Mit nur E-Mail/anonym nicht zwingend         |
| 9   | Gastmodus entfernt                                                                              | Durch anonymes Konto ersetzt                                                           | –                                                                                                             |

## Daten und Sicherheit

| #   | Entscheidung                                                                                      | Grund                                                               | Folge                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 10  | Limits (`free_max_dogs` usw.) als **Datenbank-Trigger**, zusätzlich in den Edge Functions geprüft | Greift auf jedem Schreibweg, auch ohne Edge Function                | Fehlercode `LIMIT_REACHED:<schlüssel>`; die App zeigt den Premium-Hinweis                                                   |
| 11  | `app_config.value = null` heißt „nicht festgelegt“, das Limit greift dann nicht                   | Startwerte legt der Produktinhaber fest (CLAUDE.md §4)              | In der Admin-Ansicht als „nicht festgelegt“ markiert. `forum_ai_reply_after_hours = 6`, `max_daily_pushes = 1` sind gesetzt |
| 12  | Forum-Beiträge **nur** über die Edge Function `forum-post`                                        | Vorfilter ist Pflicht (App Store 1.2); RLS sperrt direktes Einfügen | Zusätzlich prüft der Client vorab, für sofortige Rückmeldung                                                                |
| 13  | Blockieren wirkt in beide Richtungen                                                              | Erwartetes Verhalten, weniger Konflikte                             | –                                                                                                                           |
| 14  | Alle Buckets privat, Anzeige nur über signierte URLs (1 h)                                        | CLAUDE.md §3.4                                                      | Forum-Bilder sind für Angemeldete lesbar, solange der Beitrag existiert                                                     |
| 15  | Rassen, Phasen und Wissensartikel als **Entwurf** (`reviewed_by = null`)                          | CLAUDE.md §6                                                        | Heute-Screen zeigt „Fachliche Prüfung ausstehend“                                                                           |
| 16  | 42 Rassen statt genau 40                                                                          | Klein- und Großpudel getrennt, Bulldoggen und Cane Corso häufig     | –                                                                                                                           |

## KI

| #   | Entscheidung                                                                   | Grund                                                                   | Folge                                                                                                                                              |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | Claude über das offizielle Anthropic-SDK mit Structured Outputs (Zod), 1 Retry | CLAUDE.md §7                                                            | Modell aus `CLAUDE_MODEL`, Vorschlag `claude-opus-5-5`                                                                                             |
| 18  | Gemini über die Vertex-AI-REST-API mit Service-Account (`europe-west3`)        | EU-Verarbeitung, keine zusätzliche Bibliothek                           | Medien bis ca. 30 MB inline. Modellname aus `GEMINI_MODEL` (Verfügbarkeit in `europe-west3` prüfen)                                                |
| 19  | Sicherheitsregeln **zusätzlich im Code** (`_shared/logic/safety.ts`)           | Modellausgaben sind nicht garantiert                                    | Tierarzt-/Aggressions-/Neuaufnahme-Fälle erzeugen nie einen Plan. Aversive Methoden führen zu Retry bzw. Fehler. „Diagnose“ wird zu „Einschätzung“ |
| 20  | Analyse läuft im Hintergrund (`EdgeRuntime.waitUntil`), Status per Realtime    | Video plus zwei KI-Aufrufe dauern zu lange für einen synchronen Request | Die App pollt zusätzlich alle 5 s als Fallback                                                                                                     |
| 21  | Check-in-Aufnahmen zählen nicht zum Monatslimit                                | Sie gehören zum Plan                                                    | –                                                                                                                                                  |
| 22  | Phasenwechsel-Hinweis ohne KI, aus den kuratierten Phasen                      | Kostenfrei, deterministisch                                             | Einmal pro Phase und Hund                                                                                                                          |
| 23  | Wesensprofil = 70 % Fragebogen + 30 % Rassenprofil                             | CLAUDE.md §3.1                                                          | Ohne Fragebogen nur das Rassenprofil („Bisher nur aus dem Rassenprofil abgeleitet“)                                                                |
| 24  | Größenklasse: Mischling = größere Elternrasse, sonst Gewicht, sonst „mittel“   | Phasengrenzen konservativ                                               | –                                                                                                                                                  |

## Benachrichtigungen

| #   | Entscheidung                                                                              | Grund                                    | Folge                                                   |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| 25  | Trainingsaufgaben als **lokale Erinnerungen** auf dem Gerät                               | Funktioniert in Expo Go ohne Push-Server | Planung beim Öffnen von „Heute“                         |
| 26  | Server-Push über den Expo-Push-Dienst, sobald ein EAS-Projekt existiert                   | Push-Token braucht eine `projectId`      | Bis dahin keine Server-Pushes, Tipps nur im In-App-Feed |
| 27  | `max_daily_pushes` gilt für alle Push-Arten zusammen; Priorität Aufgabe > Check-in > Tipp | CLAUDE.md §3.3 („max. 1 Push pro Tag“)   | Tipps kommen zur gewählten Uhrzeit (±15 min)            |

## Tests ohne Docker

| #   | Entscheidung                                                                              | Grund                                               | Folge                                                                                |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 28  | RLS-Tests gegen lokales Postgres mit einem Supabase-Stub (`supabase/tests`)               | Kein Docker                                         | `npm run test:db` mit `PGHOST/PGPORT/PGUSER`. Cron-Migration wird lokal übersprungen |
| 29  | Gemeinsame reine Logik in `supabase/functions/_shared/logic`, in der App über `@shared/*` | Eine Quelle für Phasen, Sicherheit, Filter, Schemas | Jest testet sie, Deno nutzt sie                                                      |
| 30  | Maestro-Flow vorhanden, Ausführung erst mit nativem Build                                 | Maestro braucht Simulator bzw. Build                | `.maestro/`                                                                          |

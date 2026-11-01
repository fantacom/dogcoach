# PROMPTS.md – Phasen-Prompts für Claude Code

Nacheinander in Claude Code einfügen. Erst zur nächsten Phase, wenn die vorherige abgenommen ist. `CLAUDE.md` muss im Projekt-Root liegen.

---

## Phase 0 – Setup

```
Lies CLAUDE.md vollständig. Setze das Projekt auf:
- Expo-App mit TypeScript strict, Expo Router, NativeWind, TanStack Query, Zustand, i18n (nur de.json), Sentry.
- Supabase-Projekt lokal (supabase init), Ordnerstruktur für migrations, seed, functions/_shared/prompts.
- ESLint, Prettier, Jest, Maestro-Grundgerüst.
- EAS-Konfiguration (development, preview, production) für iOS.
- app.config.ts und src/constants/brand.ts mit Platzhalter-Name "DogCoach".
Zeig mir vorher den Plan. Danach: Liste aller Umgebungsvariablen, die ich anlegen muss.
```

## Phase 1 – Auth, Datenmodell, Navigation

```
Implementiere:
- Supabase Auth: Sign in with Apple, E-Mail Magic Link. (Google erst mit Android.)
- Alle Tabellen aus CLAUDE.md Abschnitt 5 als Migration, mit RLS-Policies für jede Tabelle.
- app_config mit allen Schlüsseln aus Abschnitt 4, Werte als Platzhalter.
- Tab-Navigation laut Abschnitt 9 mit leeren Screens.
- Konto löschen (inkl. Storage) in den Einstellungen.
Schreibe Tests für die RLS-Policies.
```

## Phase 2 – Hundeprofil, Wesen, Entwicklungsphase (a, b)

```
Implementiere:
- Onboarding: ersten Hund anlegen (alle Felder aus 3.1), Foto-Upload.
- Seed für breeds (40 häufigste DACH-Rassen) und dev_phases je Größenklasse. Inhalte als Entwurf, reviewed_by = null.
- Wesens-Fragebogen und Berechnung temperament_profile.
- Screen "Mein Hund" mit Wesensprofil-Karten.
- Phasenberechnung (Unit-Tests!) und Anzeige auf "Heute".
- Freemium-Limit free_max_dogs serverseitig.
```

## Phase 3 – Foto/Video-Analyse (f, Teil 1)

```
Implementiere die Analyse-Pipeline aus 3.4:
- Upload-Screen mit Kamera/Galerie, Längenbegrenzung 30 s, Komprimierung, Zusatzfragen.
- Privater Storage-Bucket, signierte URLs.
- Edge Function analyze-media: Gemini (Vertex AI EU) → Beobachtungs-JSON, dann Claude → Einschätzung/Antwort. Prompts als Dateien, Zod-Validierung, 1 Retry.
- Alle Sicherheitsregeln aus 3.4 im Prompt UND als serverseitige Prüfung des safety_flag.
- Realtime-Statusanzeige, Ergebnis-Screen, Verlauf.
- Einwilligungsdialog vor dem ersten Upload.
- Limit free_media_analyses_per_month serverseitig.
Teste mit mindestens 5 Beispielfällen (einfache Frage, Leinenziehen, Bellen, Angst, unbrauchbares Video) und zeig mir die Ergebnisse.
```

## Phase 4 – Trainingsplan, Push, Check-ins (f, Teil 2)

```
Implementiere:
- Edge Function training_plan: erzeugt Plan + plan_tasks + plan_checkins aus einer Einschätzung.
- Push-Registrierung (Expo Notifications), Nutzer wählt Uhrzeit.
- pg_cron-Job: versendet fällige Aufgaben und Check-in-Aufforderungen, respektiert max_daily_pushes.
- Aufgaben-Screen mit Abhaken und Bewertung.
- Check-in: neuer Upload wird mit vorheriger Analyse verglichen (plan_checkin_compare), Plan wird versioniert angepasst.
- Deep Links aus Push direkt in Aufgabe bzw. Upload.
```

## Phase 5 – Proaktive Coach-Hinweise (c)

```
Implementiere:
- Edge Function generate-coach-tips + täglicher pg_cron-Job.
- Feed auf "Heute", Push für den wichtigsten Tipp (unter max_daily_pushes).
- Eigener Hinweis bei Phasenwechsel.
- Keine Dopplungen: bereits gezeigte Themen der letzten 14 Tage berücksichtigen.
```

## Phase 6 – Community mit Antwortgarantie (e)

```
Implementiere 3.5:
- Fragen, Antworten, Likes, beste Antwort, Kategorien, Bezug zum Hund.
- Automatischer Vorfilter (Wortliste, Links, Spam), Melden, Blockieren.
- pg_cron alle 15 Min: offene Fragen älter als forum_ai_reply_after_hours → forum-ai-reply.
- KI-Antworten sichtbar gekennzeichnet.
- Einfache Admin-Ansicht (Web, Supabase-geschützt) für Meldungen und app_config.
```

## Phase 7 – Abo (Freemium)

```
Integriere RevenueCat:
- Paywall-Screen, Restore Purchases, Abo-Status in profiles gespiegelt via Webhook (Edge Function).
- Alle Limits aus app_config greifen für Free, entfallen für Premium.
- Testkäufe in der Sandbox dokumentieren.
```

## Phase 8 – Release-Vorbereitung

```
Bereite den App-Store-Release vor:
- Checkliste App Store Review: UGC-Regeln 1.2, Konto löschen, Datenschutz-Labels (App Privacy), KI-Kennzeichnung, Abo-Texte.
- Datenschutzerklärung/Impressum/AGB-Links.
- Sentry, PostHog mit Einwilligung.
- E2E-Test Onboarding → Hund → Upload → Plan.
- EAS Build production + TestFlight.
Gib mir am Ende eine Liste, was ich manuell erledigen muss (Apple Developer Account, Verträge, Store-Texte, Screenshots).
```

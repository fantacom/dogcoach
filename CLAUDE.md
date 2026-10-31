# CLAUDE.md – Hunde-Coach-App

Diese Datei ist die verbindliche Projektanweisung für Claude Code. Lies sie vor jeder Aufgabe. Bei Unklarheiten: nachfragen, nicht raten.

---

## 1. Produkt

**Arbeitstitel:** `DogCoach` (Platzhalter, Name wird später ersetzt – nirgends hart codieren, nur über `app.config.ts` und `src/constants/brand.ts`).

**Was die App ist:** Ein KI-gestützter Coach für Hundebesitzer. Er kennt Rasse, Alter und Wesen des Hundes, gibt proaktiv konkrete Hinweise, analysiert Fotos/Videos von Verhalten und begleitet den Nutzer mit Trainingsplänen per Push.

**Zielmarkt:** Deutschland, Österreich, Schweiz. UI-Sprache ausschließlich Deutsch (Du-Form). Trotzdem alle Texte über i18n-Keys (`src/i18n/de.json`), damit Englisch später ohne Umbau möglich ist.

**Plattform:** iOS zuerst, Android später aus derselben Codebasis.

**Geschäftsmodell:** Freemium + Abo. Limits und Preise sind **nicht** fest im Code, sondern in der Tabelle `app_config` (siehe 5.).

---

## 2. Tech-Stack (verbindlich)

| Bereich | Technologie |
|---|---|
| App | React Native, Expo (aktuelles SDK), TypeScript strict, Expo Router |
| UI | NativeWind (Tailwind), eigene Komponenten in `src/components/ui` |
| State/Data | TanStack Query, Zustand für lokalen UI-State |
| Backend | Supabase, Region EU (Frankfurt): Auth, Postgres, Storage, Edge Functions (Deno), `pg_cron` |
| Push | Expo Notifications (APNs, später FCM) |
| Abos | RevenueCat (Apple In-App-Purchase ist für digitale Abos Pflicht) |
| KI Video/Bild | Google Gemini über Vertex AI, Region `europe-west3` |
| KI Text | Anthropic Claude API (Diagnose-Text, Trainingspläne, Coach-Tipps, Forum-Antworten) |
| Fehler-Tracking | Sentry |
| Analytics | PostHog (EU-Instanz), nur nach Einwilligung |
| Build/Release | EAS Build, EAS Submit, EAS Update |

**Regeln:**
- API-Keys für KI-Dienste **niemals** in der App. Alle KI-Aufrufe laufen über Supabase Edge Functions.
- Row Level Security auf **jeder** Tabelle aktiv. Kein Tabellenzugriff ohne Policy.
- Keine neuen Libraries ohne Begründung im PR/Commit.
- Jede Edge Function validiert Input mit Zod.

---

## 3. Features (MVP)

### 3.1 Hundeprofil (a)
- Nutzer legt einen oder mehrere Hunde an: Name, Foto, Rasse (Auswahlliste + „Mischling“ mit bis zu 2 Elternrassen + „unbekannt“), Geschlecht, kastriert ja/nein, Geburtsdatum (oder geschätztes Alter), Gewicht, Herkunft (Züchter, Tierschutz, Auslandstierschutz, unbekannt), Lebensumfeld (Stadt/Land, Garten, Kinder im Haushalt, andere Tiere).
- Optionaler Wesens-Fragebogen (10–15 Fragen, Multiple Choice) zu Energie, Sozialverhalten, Ängstlichkeit, Jagdtrieb, Bindung.
- Ergebnis: **Wesensprofil** = Rassen-Basisprofil (kuratiert) + individuelle Anpassung aus Fragebogen und späteren Analysen. Darstellung als Karten mit Eigenschaften und „Was das für dich bedeutet“.

### 3.2 Entwicklung nach Alter (b)
- Aus Geburtsdatum wird die aktuelle **Entwicklungsphase** berechnet (Welpe, Sozialisierung, Junghund, Pubertät, erwachsen, Senior). Phasengrenzen sind rassengrößenabhängig (klein/mittel/groß/riesig) und kommen aus der kuratierten Wissensbasis.
- Startscreen zeigt: aktuelle Phase, was jetzt typisch ist, was der Hund jetzt in der Erziehung braucht, nächste Phase mit Datum.

### 3.3 Proaktive Coach-Hinweise (c)
- Täglicher Job (`pg_cron` → Edge Function `generate-coach-tips`) erzeugt pro Hund konkrete Hinweise aus Rasse, Alter, Phase, Wesensprofil, aktiven Trainingsplänen.
- Kategorien: Auslastung, Erziehung, Ernährung (allgemein), Pflege, Gesundheitsvorsorge (Impfung/Entwurmung als Erinnerung, keine medizinische Beratung), Sozialkontakt.
- Max. 1 Push pro Tag pro Nutzer (konfigurierbar), Rest im In-App-Feed.
- Phasenwechsel lösen einen eigenen Hinweis aus.

### 3.4 Foto/Video-Analyse mit Trainingsplan (f) – Kernfeature
**Upload**
- Foto oder Video, max. 30 Sekunden, max. 50 MB. Clientseitig komprimieren (720p).
- Nutzer gibt optional an: Was ist die Frage? Ist das Verhalten gewollt oder unerwünscht? Situation (Spaziergang, zu Hause, Besuch, anderer Hund …).
- Speicherung in privatem Supabase-Storage-Bucket `media/{user_id}/{dog_id}/...`, nur signierte URLs.

**Analyse-Pipeline (Edge Function `analyze-media`)**
1. Gemini analysiert das Medium und liefert **strukturierte Beobachtungen** als JSON: Körpersprache (Rute, Ohren, Haltung, Blick, Maul), Auslöser, Intensität 1–5, Kontext, Unsicherheiten.
2. Claude erhält Beobachtungen + Hundeprofil + kuratiertes Wissen und erzeugt:
   - **Einfache Frage** → direkte Antwort + Einordnung.
   - **Unerwünschtes Verhalten** → **Verhaltenseinschätzung** (wahrscheinliche Ursache, Alternativhypothesen, Sicherheit der Einschätzung) und danach einen **Trainingsplan**.
3. Ergebnis wird gespeichert und dem Nutzer angezeigt. Status-Updates per Realtime (`queued` → `analyzing` → `done` / `failed`).

**Trainingsplan**
- Dauer 1–6 Wochen, aufgeteilt in Tagesaufgaben (Übung, Ziel, Schritte, Dauer, Erfolgskriterium, typischer Fehler).
- Jede Aufgabe wird zur geplanten Zeit per Push gesendet (Uhrzeit wählt Nutzer).
- Nutzer hakt ab und bewertet kurz (klappt / teilweise / klappt nicht).
- An definierten **Check-in-Punkten** fordert die App aktiv per Push ein neues Foto/Video an („Nimm die gleiche Situation nochmal auf“). Die neue Analyse vergleicht mit der vorherigen und passt den Plan an (verlängern, vereinfachen, nächste Stufe).

**Sicherheitsregeln (hart, im Prompt und im Code)**
- Begriff in der UI: „Einschätzung“, nicht „Diagnose“.
- Keine medizinischen Diagnosen. Bei Hinweisen auf Schmerz, Krankheit, Lahmheit, plötzliche Verhaltensänderung → klarer Hinweis „Bitte zuerst Tierarzt“, kein Trainingsplan.
- Bei ernsthafter Aggression (Beißvorfälle, Intensität ≥ 4 gegen Menschen) → Hinweis auf zertifizierte Hundetrainer/Verhaltenstierärzte, nur Sicherheitsmaßnahmen, keine Eigenbehandlung.
- Keine aversiven Methoden (Leinenruck, Stachel-/Würgehalsband, Schreckreize). Nur belohnungsbasiertes Training.
- Wenn das Medium unbrauchbar ist (Hund nicht sichtbar, zu dunkel) → konkrete Bitte um neue Aufnahme statt Raten.

### 3.5 Message Board mit Antwortgarantie (e)
- Fragen mit Titel, Text, optional Bild, Kategorie, optional Bezug zu einem eigenen Hund (Rasse/Alter werden dann angezeigt).
- Antworten, Likes, „Hilfreichste Antwort“ durch Fragesteller.
- **Antwortgarantie:** `pg_cron` prüft alle 15 Minuten Fragen ohne Antwort älter als `forum_ai_reply_after_hours` (aus `app_config`, Startwert 6). Dann erzeugt Edge Function `forum-ai-reply` eine Antwort.
- KI-Antworten sind sichtbar gekennzeichnet („Antwort vom KI-Coach“, eigenes Avatar). Pflicht wegen Transparenz (EU AI Act).
- Nach einer KI-Antwort können Nutzer weiter antworten.

**Moderation (Mindestumfang)**
- Melden von Beiträgen und Nutzern, Nutzer blockieren, Admin-Ansicht für Meldungen.
- Zusätzlich ein **einfacher automatischer Filter** vor dem Veröffentlichen (Wortliste + Link-/Spam-Erkennung). Apple verlangt für nutzergenerierte Inhalte Filter, Melden, Blockieren und Kontaktmöglichkeit (App Store Guideline 1.2). Ohne Filter droht Ablehnung.
- Kontakt-E-Mail im Impressum und in der App.

### 3.6 Nicht im MVP (vorbereiten, nicht bauen)
- Krankheiten/Gesundheitsdaten (d): Tabelle `dog_conditions` im Schema anlegen, kein UI. Prompts so bauen, dass später ein Abschnitt „Gesundheit“ ergänzt werden kann.
- Englisch, Android-Release, Trainer-Marktplatz.

---

## 4. Freemium-Logik

Alle Werte in `app_config`, nicht im Code:

| Schlüssel | Bedeutung |
|---|---|
| `free_max_dogs` | Anzahl Hunde im Free-Tarif |
| `free_media_analyses_per_month` | Analysen pro Monat gratis |
| `free_training_plans_active` | Aktive Trainingspläne gratis |
| `premium_entitlement_id` | RevenueCat-Entitlement |
| `forum_ai_reply_after_hours` | Stunden bis KI-Antwort (Start: 6) |
| `max_daily_pushes` | Push-Limit pro Tag |

**Startwerte für Limits und Preise sind offen und vom Produktinhaber festzulegen.** Bis dahin Platzhalter verwenden und im Admin sichtbar als „nicht festgelegt“ markieren.

Prüfung der Limits immer serverseitig in der Edge Function, nie nur im Client.

---

## 5. Datenmodell (Supabase / Postgres)

```
profiles            id (=auth.uid), display_name, avatar_url, push_token, notification_time, created_at
dogs                id, owner_id, name, photo_url, breed_primary_id, breed_secondary_id, is_mixed,
                    sex, neutered, birth_date, birth_date_estimated, weight_kg, origin, environment jsonb
breeds              id, name_de, size_class, group, base_traits jsonb, notes  (kuratiert)
dev_phases          id, size_class, phase_key, from_weeks, to_weeks, content jsonb  (kuratiert)
knowledge_articles  id, topic, tags[], content_md, reviewed_by, reviewed_at  (kuratiert)
temperament_answers dog_id, question_key, answer
temperament_profile dog_id, traits jsonb, updated_at
coach_tips          id, dog_id, category, title, body, source, created_at, read_at, pushed_at
media_uploads       id, dog_id, owner_id, storage_path, type, duration_s, user_question,
                    is_unwanted, situation, status, created_at
analyses            id, media_id, observations jsonb, result_type, assessment jsonb,
                    answer_md, safety_flag, confidence, model_versions jsonb, created_at
training_plans      id, dog_id, analysis_id, goal, status, start_date, end_date, version
plan_tasks          id, plan_id, day_index, scheduled_at, title, steps jsonb,
                    success_criteria, done_at, rating
plan_checkins       id, plan_id, due_at, media_id, comparison jsonb
forum_posts         id, author_id, dog_id, category, title, body, image_url, is_ai, status, created_at
forum_replies       id, post_id, author_id, body, is_ai, is_best, status, created_at
reports             id, reporter_id, target_type, target_id, reason, status
blocks              blocker_id, blocked_id
app_config          key, value jsonb
dog_conditions      id, dog_id, condition, since, notes   (nur Schema, kein UI)
```

Migrationen ausschließlich über `supabase/migrations`. Seed-Daten für `breeds`, `dev_phases` und `knowledge_articles` in `supabase/seed/`.

---

## 6. Wissensbasis (KI + kuratiert)

- Kuratierte Basis: Rassenprofile, Entwicklungsphasen, Kern-Trainingsmethoden. Erstfassung darf KI-generiert sein, wird aber als `reviewed_by = null` markiert und muss von einem Hundetrainer/Tierarzt freigegeben werden.
- Die KI personalisiert **auf Basis** dieser Inhalte. Prompts übergeben die relevanten Artikel als Kontext (einfaches Retrieval über Tags + Rasse + Phase; Vektorsuche mit `pgvector` erst bei Bedarf).
- Start mit den 40 in DACH häufigsten Rassen + Mischling-Logik.

---

## 7. Prompts

Alle Prompts als versionierte Dateien in `supabase/functions/_shared/prompts/`:
- `observe_media.md` (Gemini)
- `assess_behavior.md` (Claude)
- `training_plan.md` (Claude)
- `plan_checkin_compare.md` (Claude)
- `coach_tips.md` (Claude)
- `forum_reply.md` (Claude)

Jeder Prompt:
- verlangt **JSON-Ausgabe** nach festem Schema (mit Zod validieren, bei Fehler 1 Retry),
- enthält die Sicherheitsregeln aus 3.4,
- schreibt Deutsch, Du-Form, klar, ohne Fachjargon, ohne Floskeln,
- nennt Unsicherheit offen statt zu raten.

Modellnamen in Umgebungsvariablen, nicht im Code.

---

## 8. Recht & Datenschutz

- Alle Daten in der EU (Supabase Frankfurt, Vertex AI `europe-west3`). Anthropic-API mit Auftragsverarbeitungsvertrag.
- Einwilligung beim Upload: Medien werden zur Analyse an KI-Dienste übertragen.
- Hinweis bei Videos mit erkennbaren Personen: Nutzer ist verantwortlich, Personen möglichst nicht zeigen.
- In-App-**Konto löschen** inkl. aller Medien (Apple-Pflicht).
- Datenexport auf Anfrage (DSGVO Art. 20).
- Disclaimer auf jeder Analyse: „Ersetzt keinen Tierarzt oder Hundetrainer.“
- Datenschutzerklärung, Impressum, AGB als Web-Seiten, in der App verlinkt.

---

## 9. Design

- Ruhig, vertrauenswürdig, warm. Viel Weißraum, große Touch-Flächen, Fotos des eigenen Hundes prominent.
- Tab-Navigation: **Heute** (Phase, Tipps, heutige Planaufgabe) · **Analyse** (Upload + Verlauf) · **Community** · **Mein Hund**.
- Hell- und Dunkelmodus.
- Barrierefreiheit: Dynamic Type, VoiceOver-Labels, Kontrast AA.

---

## 10. Arbeitsweise für Claude Code

- Arbeite in den Phasen aus `PROMPTS.md`, eine Phase nach der anderen.
- Vor jeder Phase: kurzen Plan zeigen und auf Freigabe warten.
- Nach jeder Phase: Typecheck, Lint, Tests grün; kurze Zusammenfassung was gebaut wurde und was offen ist.
- Kleine Commits mit klaren Messages.
- Tests: Unit-Tests für Phasenberechnung, Limits, Prompt-Schema-Validierung; E2E-Smoke-Test (Maestro) für Onboarding → Hund anlegen → Upload.
- Keine Mock-Daten in Produktionscode. Seed nur über `supabase/seed`.
- Wenn eine Anforderung unklar oder widersprüchlich ist: stoppen und fragen.

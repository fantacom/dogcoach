-- app_config (CLAUDE.md §4). value = null → „nicht festgelegt“ (Limit greift nicht).
-- Startwerte für Limits und Preise legt der Produktinhaber fest (Admin-Ansicht).
insert into public.app_config (key, value, description) values
  ('free_max_dogs', null, 'Anzahl Hunde im Free-Tarif'),
  ('free_media_analyses_per_month', null, 'Foto/Video-Analysen pro Monat gratis'),
  ('free_training_plans_active', null, 'Gleichzeitig aktive Trainingspläne gratis'),
  ('premium_entitlement_id', null, 'RevenueCat-Entitlement für Premium'),
  ('forum_ai_reply_after_hours', '6', 'Stunden bis zur KI-Antwort auf unbeantwortete Fragen'),
  ('max_daily_pushes', '1', 'Maximale Push-Nachrichten pro Nutzer und Tag'),
  ('contact_email', '"info@fantacom.de"', 'Kontakt-E-Mail (Impressum, Support, Meldungen)'),
  ('legal_privacy_url', null, 'URL Datenschutzerklärung'),
  ('legal_imprint_url', null, 'URL Impressum'),
  ('legal_terms_url', null, 'URL AGB')
on conflict (key) do nothing;

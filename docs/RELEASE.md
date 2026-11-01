# Release-Vorbereitung (Phase 7/8)

Stand: Die App ist funktional vollständig für Expo Go und Web. Die folgenden Punkte brauchen den Apple Developer Account,
einen nativen Build (EAS) oder Entscheidungen bzw. Verträge des Produktinhabers.

## Technisch offen (braucht nativen Build)

| Punkt              | Vorbereitet                                                                                            | Noch zu tun                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| RevenueCat-Abo     | Webhook `revenuecat-webhook`, `profiles.is_premium/premium_until`, Limits serverseitig, Premium-Screen | `react-native-purchases` einbauen, Paywall mit Produkten, Restore Purchases, `Purchases.logIn(userId)`, Sandbox-Käufe dokumentieren |
| Server-Push        | `send-reminders`, `push_log`, `max_daily_pushes`, Deep Links                                           | `eas init` (projectId), APNs-Key in EAS, Test auf Gerät                                                                             |
| Sign in with Apple | Supabase Auth unterstützt es                                                                           | `expo-apple-authentication`, Apple-Provider in Supabase                                                                             |
| Sentry             | –                                                                                                      | `@sentry/react-native` mit Config-Plugin, DSN als Umgebungsvariable                                                                 |
| PostHog (EU)       | `profiles.analytics_consent`                                                                           | `posthog-react-native`, Einwilligungsdialog, nur nach Opt-in initialisieren                                                         |
| E2E Maestro        | `.maestro/onboarding_dog_upload.yaml`                                                                  | Mit Development-Build im Simulator ausführen, um Plan-Schritt erweitern                                                             |
| EAS                | `eas.json` (development, preview, production)                                                          | `eas init`, `eas build --profile production --platform ios`, `eas submit`                                                           |

## App-Store-Review-Checkliste

- [x] UGC (Guideline 1.2): automatischer Vorfilter, Melden, Blockieren, Admin-Ansicht, Kontakt-E-Mail in der App
- [x] Konto löschen in der App inkl. aller Medien (Einstellungen → Konto löschen)
- [x] KI-Kennzeichnung: „Antwort vom KI-Coach“, KI-Hinweis in den Einstellungen, Disclaimer auf jeder Analyse
- [x] Keine medizinischen Diagnosen, Begriff „Einschätzung“, Tierarzt-Hinweise
- [x] Einwilligung vor dem ersten Upload, Hinweis zu erkennbaren Personen
- [x] Datenexport (DSGVO Art. 20)
- [ ] Datenschutz-Labels (App Privacy) in App Store Connect: E-Mail (optional), Fotos/Videos, Nutzungsdaten (bei PostHog), Kennungen (Konto-ID); Zweck App-Funktionalität; nicht für Tracking
- [ ] Abo-Texte: Preis, Laufzeit, automatische Verlängerung, Links zu AGB und Datenschutz auf der Paywall
- [ ] Datenschutzerklärung, Impressum und AGB als Webseiten; URLs in `app_config` (`legal_*_url`) eintragen
- [ ] Demo-Zugang für das Review-Team (anonymes Konto reicht; im Review-Hinweis erklären)

## Manuell durch den Produktinhaber

1. **Apple Developer Program** (99 €/Jahr) mit Firma, D-U-N-S-Nummer
2. **App Store Connect**: App anlegen, Bundle-ID `de.fantacom.dogcoach` (in `app.config.ts` änderbar), Steuer- und Bankdaten, Vertrag für kostenpflichtige Apps
3. **Verträge**: Auftragsverarbeitung mit Supabase, Google Cloud (Vertex AI) und Anthropic
4. **Rechtstexte**: Datenschutzerklärung (KI-Verarbeitung, EU-Speicherung, Drittanbieter), Impressum, AGB, Abo-Bedingungen
5. **Fachliche Freigabe** der Wissensbasis durch Hundetrainer bzw. Tierarzt (`breeds`, `dev_phases`, `knowledge_articles` → `reviewed_by`, `reviewed_at`)
6. **Limits und Preise** festlegen (Admin-Ansicht → `free_*`, `premium_entitlement_id`), Abo-Produkte in App Store Connect und RevenueCat
7. **Endgültiger App-Name** (`app.config.ts` → `BRAND`), Icon, Splash
8. **Store-Texte**: Name, Untertitel, Beschreibung, Keywords, Support-URL, Marketing-URL
9. **Screenshots**: 6,9" und 6,5" iPhone (min. 3), optional Vorschauvideo
10. **Eigener SMTP-Mailversand** (siehe `SETUP.md` §5)

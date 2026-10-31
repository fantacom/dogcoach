# DogCoach

KI-gestützter Coach für Hundebesitzer. Verbindliche Projektanweisung: [`CLAUDE.md`](CLAUDE.md).

Läuft vollständig in **Expo Go** (iPhone) und im **Browser** – keine Libraries mit eigenem nativem Build.

## Stack

Expo SDK 58 · TypeScript strict · Expo Router · NativeWind 4 · TanStack Query · Zustand · i18next (`src/i18n/de.json`) · Supabase

## Einrichtung

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_ANON_KEY eintragen
npx expo start
```

## Befehle

| Befehl           | Zweck                               |
| ---------------- | ----------------------------------- |
| `npm start`      | Dev-Server (QR-Code für Expo Go)    |
| `npm run web`    | Im Browser öffnen                   |
| `npm run check`  | Typecheck + Lint + Prettier + Tests |
| `npm test`       | Jest                                |
| `npm run format` | Prettier schreibt alle Dateien      |

## Struktur

```
src/app/              Screens (Expo Router): login, callback, (app)/ = Tabs
src/components/ui/    Eigene Basis-Komponenten
src/constants/brand.ts  Markenname zur Laufzeit (Quelle: app.config.ts)
src/i18n/             de.json + Setup
src/lib/              Supabase-Client, Auth, Query-Client
src/stores/           Zustand-Stores
supabase/             migrations/, seed/, functions/_shared/prompts/
```

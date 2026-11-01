import * as Linking from 'expo-linking';

import { useAuthStore } from '@/stores/authStore';

import { queryClient } from './queryClient';
import { supabase } from './supabase';

/**
 * Anmeldung (Entscheidung: docs/DECISIONS.md):
 * - Beim ersten Start legt die App still ein anonymes Konto an → Daten sind sofort per RLS geschützt.
 * - Optional: Konto mit E-Mail sichern (Magic Link) oder mit bestehendem Konto anmelden.
 * - Sign in with Apple folgt mit dem nativen Build (Apple Developer Account).
 */
export const getRedirectUrl = () => Linking.createURL('/callback');

export async function ensureSession() {
  const { setBootError } = useAuthStore.getState();
  setBootError(false);
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) setBootError(true);
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: getRedirectUrl(), shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}

/** Anonymes Konto mit E-Mail verknüpfen (Bestätigungslink an die Adresse). */
export async function linkEmail(email: string) {
  const { error } = await supabase.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: getRedirectUrl() },
  );
  if (error) throw error;
}

export async function exchangeCode(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  queryClient.clear();
}

/** Lädt die gespeicherte Session und hält den Store bei Änderungen aktuell. */
export function subscribeToAuth() {
  const { setSession } = useAuthStore.getState();
  void supabase.auth.getSession().then(({ data }) => setSession(data.session));
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session);
    if (event === 'SIGNED_OUT') void ensureSession();
  });
  return () => data.subscription.unsubscribe();
}

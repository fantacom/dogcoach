import * as Linking from 'expo-linking';

import { useAuthStore } from '@/stores/authStore';

import { supabase } from './supabase';

/**
 * Rücksprung-URL für den Magic Link.
 * Expo Go: exp://<IP>:8081/--/callback · Web: http://localhost:8081/callback · Build: dogcoach://callback
 * Diese URL muss in Supabase unter Authentication → URL Configuration → Redirect URLs erlaubt sein.
 */
export const getRedirectUrl = () => Linking.createURL('/callback');

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: getRedirectUrl(), shouldCreateUser: true },
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

export async function exchangeCode(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Lädt die gespeicherte Session und hält den Store bei Änderungen aktuell. */
export function subscribeToAuth() {
  const { setSession } = useAuthStore.getState();
  void supabase.auth.getSession().then(({ data }) => setSession(data.session));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  return () => data.subscription.unsubscribe();
}

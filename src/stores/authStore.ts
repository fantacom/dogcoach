import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthState = {
  session: Session | null;
  /** true, sobald die gespeicherte Session geladen wurde. */
  initialized: boolean;
  /** Anonyme Anmeldung beim Start fehlgeschlagen (z. B. offline). */
  bootError: boolean;
  setSession: (session: Session | null) => void;
  setBootError: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,
  bootError: false,
  setSession: (session) => set({ session, initialized: true }),
  setBootError: (bootError) => set({ bootError }),
}));

export const isAnonymous = (s: Session | null) => !!s?.user.is_anonymous;

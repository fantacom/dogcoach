import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';

type AuthState = {
  session: Session | null;
  /** true, sobald die gespeicherte Session geladen wurde (vorher keine Weiterleitung). */
  initialized: boolean;
  /**
   * Gastmodus: App ohne Anmeldung nutzen (vorläufig, solange der Login nicht fertig ist).
   * Nichts wird auf dem Server gespeichert.
   */
  guest: boolean;
  setSession: (session: Session | null) => void;
  setGuest: (guest: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      initialized: false,
      guest: false,
      setSession: (session) => set({ session, initialized: true }),
      setGuest: (guest) => set({ guest }),
    }),
    {
      name: 'dogcoach-auth-ui',
      storage: createJSONStorage(() => appStorage),
      // Nur der Gast-Schalter wird gespeichert; die Session verwaltet supabase-js selbst.
      partialize: (state) => ({ guest: state.guest }),
    },
  ),
);

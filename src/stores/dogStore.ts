import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';

/** Aktuell gewählter Hund (lokaler UI-State, CLAUDE.md §2). */
type DogState = { selectedDogId: string | null; select: (id: string | null) => void };

export const useDogStore = create<DogState>()(
  persist((set) => ({ selectedDogId: null, select: (selectedDogId) => set({ selectedDogId }) }), {
    name: 'dogcoach-selected-dog',
    storage: createJSONStorage(() => appStorage),
  }),
);

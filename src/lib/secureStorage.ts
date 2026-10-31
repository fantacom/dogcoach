import * as SecureStore from 'expo-secure-store';

/**
 * Speicher-Adapter für die Supabase-Session auf iOS/Android.
 * SecureStore (Keychain) erlaubt pro Eintrag nur ~2 KB, Sessions sind größer.
 * Deshalb wird der Wert in Stücke geteilt: `<key>.n` = Anzahl, `<key>.0..n-1` = Teile.
 */
export const CHUNK_SIZE = 1800;

type Store = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;

// SecureStore erlaubt nur [A-Za-z0-9._-] in Schlüsseln.
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export function createChunkedStorage(store: Store = SecureStore) {
  async function removeItem(key: string): Promise<void> {
    const base = safeKey(key);
    const count = Number((await store.getItemAsync(`${base}.n`)) ?? 0);
    await Promise.all(
      Array.from({ length: count }, (_, i) => store.deleteItemAsync(`${base}.${i}`)),
    );
    await store.deleteItemAsync(`${base}.n`);
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const base = safeKey(key);
      const countRaw = await store.getItemAsync(`${base}.n`);
      if (countRaw === null) return null;
      const parts = await Promise.all(
        Array.from({ length: Number(countRaw) }, (_, i) => store.getItemAsync(`${base}.${i}`)),
      );
      if (parts.some((p) => p === null)) return null;
      return parts.join('');
    },
    async setItem(key: string, value: string): Promise<void> {
      await removeItem(key);
      const base = safeKey(key);
      const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
      await Promise.all(chunks.map((c, i) => store.setItemAsync(`${base}.${i}`, c)));
      await store.setItemAsync(`${base}.n`, String(chunks.length));
    },
    removeItem,
  };
}

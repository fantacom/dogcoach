import { CHUNK_SIZE, createChunkedStorage } from '@/lib/secureStorage';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: jest.fn(async (k: string) => data.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      data.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      data.delete(k);
    }),
  };
}

describe('createChunkedStorage', () => {
  it('speichert große Werte in Stücken und liest sie unverändert', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store);
    const value = 'x'.repeat(CHUNK_SIZE * 2 + 10);

    await storage.setItem('sb-auth-token', value);

    expect(store.data.get('sb-auth-token.n')).toBe('3');
    await expect(storage.getItem('sb-auth-token')).resolves.toBe(value);
  });

  it('entfernt alte Teile beim Überschreiben mit kürzerem Wert', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store);
    await storage.setItem('k', 'a'.repeat(CHUNK_SIZE * 3));
    await storage.setItem('k', 'kurz');

    expect([...store.data.keys()].sort()).toEqual(['k.0', 'k.n']);
    await expect(storage.getItem('k')).resolves.toBe('kurz');
  });

  it('liefert null für unbekannte Schlüssel und nach removeItem', async () => {
    const storage = createChunkedStorage(memoryStore());
    await expect(storage.getItem('fehlt')).resolves.toBeNull();
    await storage.setItem('k', 'wert');
    await storage.removeItem('k');
    await expect(storage.getItem('k')).resolves.toBeNull();
  });

  it('ersetzt in SecureStore unzulässige Zeichen im Schlüssel', async () => {
    const store = memoryStore();
    await createChunkedStorage(store).setItem('sb:auth/token', 'v');
    expect(store.data.has('sb_auth_token.0')).toBe(true);
  });
});

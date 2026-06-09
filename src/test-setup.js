import { beforeEach, vi } from 'vitest';

// En test, import.meta.env.DEV = true,
// donc storage.js cible localhost:8090.
// Sans ce garde-fou, les tests qui ne
// mockent pas fetch tentent une vraie
// connexion → ECONNREFUSED.
// Les tests qui simulent un backend
// réassignent fetch eux-mêmes,
// donc ce mock par défaut ne les gêne pas.
beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    Promise.reject(
      new Error('Réseau désactivé pendant les tests')
    )
  );
});

const MIGRATION_PREFIX = 'gm3thalak:account-storage-migrated:v1:';

export function getAccountStorageKey(key: string, userId?: string | null): string | null {
  return userId ? `gm3thalak:user:${userId}:${key}` : null;
}

/**
 * Read an account-owned local value. Existing unscoped values are claimed once
 * by the first signed-in account that reads them, then removed from the shared key.
 */
export function readAccountStorage(key: string, userId?: string | null): string | null {
  const accountKey = getAccountStorageKey(key, userId);
  if (!accountKey || typeof window === 'undefined') return null;

  try {
    const ownValue = window.localStorage.getItem(accountKey);
    const migrationKey = `${MIGRATION_PREFIX}${key}`;
    if (ownValue !== null) {
      if (window.localStorage.getItem(migrationKey) !== '1') {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(migrationKey, '1');
      }
      return ownValue;
    }

    if (window.localStorage.getItem(migrationKey) === '1') return null;

    const legacyValue = window.localStorage.getItem(key);
    if (legacyValue !== null) {
      window.localStorage.setItem(accountKey, legacyValue);
      window.localStorage.removeItem(key);
    }
    window.localStorage.setItem(migrationKey, '1');
    return legacyValue;
  } catch {
    return null;
  }
}

export function writeAccountStorage(key: string, userId: string | null | undefined, value: string): void {
  const accountKey = getAccountStorageKey(key, userId);
  if (!accountKey || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(accountKey, value);
  } catch {
    // Keep account data in memory when browser storage is unavailable or full.
  }
}

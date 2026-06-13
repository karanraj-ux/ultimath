/**
 * useUserFingerprint
 * Returns a stable anonymous UUID stored in localStorage.
 * Used to identify the user for template ratings without requiring login.
 */
import { useMemo } from 'react';

const KEY = 'forge_user_fingerprint';

function getOrCreateFingerprint(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2);
  }
}

export function useUserFingerprint(): string {
  return useMemo(() => getOrCreateFingerprint(), []);
}

export { getOrCreateFingerprint };

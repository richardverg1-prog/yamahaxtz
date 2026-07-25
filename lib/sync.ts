'use client';

const SYNC_KEYS = ['maintenance', 'fuel', 'gallery', 'settings', 'documents', 'wishlist', 'trips', 'checklists', 'insurance'];

function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('xtz_auth_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (new Date(s.expiresAt) < new Date()) return null;
    const uid = s.userId;
    return uid && uid !== 'default' ? uid : null;
  } catch { return null; }
}

function lk(userId: string, base: string) {
  return `xtz_u_${userId}_${base}`;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncPush() {
  if (typeof window === 'undefined') return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloud, 2000);
}

export async function pushToCloud(): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  const data: Record<string, any> = {};
  SYNC_KEYS.forEach(k => {
    const v = localStorage.getItem(lk(userId, k));
    if (v !== null) {
      try { data[k] = JSON.parse(v); } catch { /* skip corrupt key */ }
    }
  });
  const syncedAt = new Date().toISOString();
  data._syncedAt = syncedAt;

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      localStorage.setItem(lk(userId, '_syncedAt'), syncedAt);
    }
  } catch { /* network errors are silent */ }
}

export async function pullFromCloud(): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;

  try {
    const res = await fetch('/api/sync', {
      headers: { 'x-user-id': userId },
      cache: 'no-store',
    });

    if (!res.ok) return false;
    const serverData = await res.json();
    if (!serverData || !serverData._syncedAt) return false;

    const localSyncAt = localStorage.getItem(lk(userId, '_syncedAt')) ?? '';
    if (serverData._syncedAt <= localSyncAt) return false;

    SYNC_KEYS.forEach(k => {
      if (serverData[k] !== undefined) {
        localStorage.setItem(lk(userId, k), JSON.stringify(serverData[k]));
      }
    });
    localStorage.setItem(lk(userId, '_syncedAt'), serverData._syncedAt);
    return true;
  } catch {
    return false;
  }
}

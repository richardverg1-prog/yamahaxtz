'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { pullFromCloud } from '@/lib/sync';

// Module-level: reset on full page reload (F5 / new tab)
let hasInitialSynced = false;
let lastFocusPull = 0;

function norm(p: string) { return p !== '/' ? p.replace(/\/$/, '') : '/'; }

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const raw = usePathname();
  const path = norm(raw ?? '/');
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Pull on window focus — catches edits from other devices while tab was open
  useEffect(() => {
    const session = getSession();
    if (!session) return;

    function onFocus() {
      const now = Date.now();
      if (now - lastFocusPull < 30_000) return; // max once per 30s
      lastFocusPull = now;
      pullFromCloud().then(changed => {
        if (changed) window.location.reload();
      }).catch(() => {});
    }

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const session = getSession();

    if (path === '/login') {
      if (session) { router.replace('/'); return; }
      setReady(true);
      return;
    }

    if (!session) {
      router.replace('/login');
      return;
    }

    if (path === '/admin' && session.role !== 'admin') {
      router.replace('/');
      return;
    }

    if (!hasInitialSynced) {
      hasInitialSynced = true;
      pullFromCloud()
        .catch(() => {})
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [path]);

  if (!ready) return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin .8s linear infinite',
      }} />
    </div>
  );

  return <>{children}</>;
}

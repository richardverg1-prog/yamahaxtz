'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { pullFromCloud } from '@/lib/sync';

let hasInitialSynced = false;

function norm(p: string) { return p !== '/' ? p.replace(/\/$/, '') : '/'; }

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const raw = usePathname();
  const path = norm(raw ?? '/');
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Background sync: poll every 20s + on visibility change + on focus
  useEffect(() => {
    const session = getSession();
    if (!session) return;

    let active = true;
    let isFetching = false;
    let lastPull = 0;

    async function doPull() {
      const now = Date.now();
      if (!active || isFetching || now - lastPull < 10_000) return;
      lastPull = now;
      isFetching = true;
      try {
        const changed = await pullFromCloud();
        if (active && changed) window.location.reload();
      } catch { /* ignore network errors */ }
      finally { isFetching = false; }
    }

    const timer = setInterval(doPull, 20_000);

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') doPull();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', doPull);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', doPull);
    };
  }, []);

  // Auth + initial sync
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

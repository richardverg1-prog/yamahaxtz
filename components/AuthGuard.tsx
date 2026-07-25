'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { pullFromCloud } from '@/lib/sync';

function norm(p: string) { return p !== '/' ? p.replace(/\/$/, '') : '/'; }

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const raw = usePathname();
  const path = norm(raw ?? '/');
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

    const syncKey = `xtz_sync_done_${session.userId}`;
    if (!sessionStorage.getItem(syncKey)) {
      sessionStorage.setItem(syncKey, '1');
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

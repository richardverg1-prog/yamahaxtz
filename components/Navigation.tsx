'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Wrench, Droplets, BookOpen, Settings, FileText, LogOut, ShieldCheck } from 'lucide-react';
import { clearSession, getSession, isAdmin } from '@/lib/auth';

const TABS = [
  { href: '/', label: 'Painel', Icon: Home },
  { href: '/manutencao', label: 'Manutenção', Icon: Wrench },
  { href: '/combustivel', label: 'Combustível', Icon: Droplets },
  { href: '/documentos', label: 'Docs', Icon: FileText },
  { href: '/guia', label: 'Guia', Icon: BookOpen },
  { href: '/ajustes', label: 'Ajustes', Icon: Settings },
];

function norm(p: string) { return p !== '/' ? p.replace(/\/$/, '') : '/'; }

export function Navigation() {
  const raw = usePathname();
  const path = norm(raw ?? '/');
  const router = useRouter();

  if (path === '/login') return null;

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  const adminAccess = isAdmin();

  return (
    <nav className="bottom-nav">
      <div className="nav-brand">
        <span style={{ fontSize: 18 }}>🏍️</span>
        <span>XTZ Painel</span>
      </div>
      {TABS.map(({ href, label, Icon }) => {
        const active = path === href || (href !== '/' && path.startsWith(href));
        return (
          <Link key={href} href={href} className={`nav-tab${active ? ' active' : ''}`}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
      {adminAccess && (
        <Link href="/admin" className={`nav-tab${path === '/admin' ? ' active' : ''}`}>
          <ShieldCheck />
          <span>Admin</span>
        </Link>
      )}
      <button className="nav-tab nav-logout" onClick={handleLogout}>
        <LogOut />
        <span>Sair</span>
      </button>
    </nav>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wrench, Droplets, BookOpen, Settings } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Painel', Icon: Home },
  { href: '/manutencao', label: 'Manutenção', Icon: Wrench },
  { href: '/combustivel', label: 'Combustível', Icon: Droplets },
  { href: '/guia', label: 'Guia', Icon: BookOpen },
  { href: '/ajustes', label: 'Ajustes', Icon: Settings },
];

function norm(p: string) { return p !== '/' ? p.replace(/\/$/, '') : '/'; }

export function Navigation() {
  const raw = usePathname();
  const path = norm(raw ?? '/');

  return (
    <nav className="bottom-nav">
      {TABS.map(({ href, label, Icon }) => {
        const active = path === href || (href !== '/' && path.startsWith(href));
        return (
          <Link key={href} href={href} className={`nav-tab${active ? ' active' : ''}`}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

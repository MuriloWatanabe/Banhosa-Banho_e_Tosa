'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import Image from 'next/image';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { href: '/agendamentos', label: 'Agendamentos', icon: 'calendar' as const },
  { href: '/pets', label: 'Pets', icon: 'pets' as const },
  { href: '/tutores', label: 'Tutores', icon: 'users' as const },
  { href: '/profissionais', label: 'Profissionais', icon: 'staff' as const },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Image src="/logo.png" alt="Banhosa" width={24} height={24} />
        </span>
        <span>Banhosa</span>
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

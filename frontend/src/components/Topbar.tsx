'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { logoutAction } from '@/app/actions';
import { Icon } from './Icon';

const titles: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/agendamentos': 'Agendamentos',
  '/pets': 'Pets',
  '/tutores': 'Tutores',
  '/profissionais': 'Profissionais',
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Sub-rotas (ex.: /agendamentos/[id]/editar) herdam o título da seção.
  const section = Object.keys(titles).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const title = section ? titles[section] : 'Banhosa Baso';

  function logout() {
    // O cookie do JWT é httpOnly (não pode ser apagado via document.cookie),
    // então o logout precisa passar por uma Server Action.
    startTransition(async () => {
      await logoutAction();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">Pet care · Gestão</div>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <button className="user-chip" onClick={logout} disabled={isPending} title="Sair">
          <div className="avatar">BA</div>
          <div>
            <strong>Banhosa.Adm</strong>
            <small>Administrador</small>
          </div>
          <Icon name="chevron" />
        </button>
      </div>
    </header>
  );
}

/**
 * @file UI & Navegação: Sidebar
 * @description Valida a renderização dos links do menu lateral e o destaque
 * condicional do item ativo (active state) baseado na rota atual da aplicação.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - NEXT.JS HOOKS: Como é um Client Component que utiliza `usePathname`, precisamos
 *   mockar a funcionalidade para injetar as rotas de teste, já que o componente está
 *   rodando fora do contexto do App Router do Next.
 * - HOISTING: Utiliza `vi.hoisted()` para declarar a variável mockável ANTES do
 *   `vi.mock`. O Vitest eleva (hoist) as chamadas de mock para o topo do arquivo; sem isso,
 *   teríamos um erro de "Cannot access before initialization".
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | Sidebar', () => {
  it('deve renderizar todos os itens de navegação principais', () => {
    // 1. Arrange
    usePathnameMock.mockReturnValue('/dashboard');

    // 2. Act
    render(<Sidebar />);

    // 3. Assert
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Agendamentos/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pets/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tutores/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Profissionais/ })).toBeInTheDocument();
  });

  it('deve marcar como "active" apenas o item cujo href é exatamente a rota atual', () => {
    // 1. Arrange
    usePathnameMock.mockReturnValue('/pets');

    // 2. Act
    render(<Sidebar />);

    // 3. Assert
    expect(screen.getByRole('link', { name: /Pets/ })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /Dashboard/ })).not.toHaveClass('active');
  });

  it('deve manter o item principal marcado como "active" quando a rota atual for uma sub-rota (ex: /pets/novo)', () => {
    // 1. Arrange
    // Regra do componente: `pathname === item.href || pathname.startsWith(item.href + '/')`
    // Impede que o usuário fique sem indicativo de qual módulo do menu está acessando.
    usePathnameMock.mockReturnValue('/pets/novo');

    // 2. Act
    render(<Sidebar />);

    // 3. Assert
    expect(screen.getByRole('link', { name: /Pets/ })).toHaveClass('active');
  });

  it('não deve marcar nenhum item como ativo quando a rota não corresponder a nenhum link', () => {
    // 1. Arrange
    usePathnameMock.mockReturnValue('/login');

    // 2. Act
    render(<Sidebar />);

    // 3. Assert
    const links = screen.getAllByRole('link');
    links.forEach((link) => expect(link).not.toHaveClass('active'));
  });

  it('deve renderizar a marca (logo + nome "Banhosa")', () => {
    // 1. Arrange
    usePathnameMock.mockReturnValue('/dashboard');

    // 2. Act
    render(<Sidebar />);

    // 3. Assert
    expect(screen.getByText('Banhosa')).toBeInTheDocument();
    expect(screen.getByAltText('Banhosa')).toBeInTheDocument();
  });
});

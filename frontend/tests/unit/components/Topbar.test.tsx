/**
 * @file UI & Roteamento: Topbar
 * @description Valida o mapeamento dinâmico de títulos da página com base na rota atual 
 * e a lógica de encerramento de sessão (logout).
 * 
 * @type {Teste de Componente / UI}
 * 
 * @notes
 * - ROTEAMENTO VISUAL: O componente reage à rota ativa (usePathname) para exibir o 
 *   título amigável da página.
 * - SEGURANÇA (Logout): O cookie do JWT (`banhosa_token`) é httpOnly, então o logout chama a
 *   Server Action `logoutAction` (que apaga o cookie no servidor) e então redireciona.
 *   Como o proxy.ts confia neste cookie para proteger as rotas, uma falha aqui deixaria o
 *   usuário "preso" em estado de autenticação.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Topbar } from '@/components/Topbar';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { usePathnameMock, useRouterMock, pushMock, refreshMock, logoutActionMock } = vi.hoisted(() => ({
    usePathnameMock: vi.fn(),
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    useRouterMock: vi.fn(),
    logoutActionMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/actions', () => ({
    logoutAction: logoutActionMock,
}));

/**
 * Mock do roteador do Next.js (next/navigation).
 * Intercepta a rota atual para testarmos a troca de títulos e o push 
 * para validarmos o redirecionamento pós-logout.
 */
vi.mock('next/navigation', () => ({
    usePathname: usePathnameMock,
    useRouter: useRouterMock,
}));

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | Topbar', () => {
    
    beforeEach(() => {
        pushMock.mockClear();
        refreshMock.mockClear();
        logoutActionMock.mockClear();
        useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock });
    });

    it('deve exibir o título mapeado para uma rota conhecida', () => {
        // 1. Arrange
        usePathnameMock.mockReturnValue('/pets');
        
        // 2. Act
        render(<Topbar />);
        
        // 3. Assert
        expect(screen.getByRole('heading', { name: 'Pets' })).toBeInTheDocument();
    });

    it('deve herdar o título da seção em sub-rotas (ex.: edição de agendamento)', () => {
        usePathnameMock.mockReturnValue('/agendamentos/a-1/editar');

        render(<Topbar />);

        expect(screen.getByRole('heading', { name: 'Agendamentos' })).toBeInTheDocument();
    });

    it('deve exibir o título padrão quando a rota não estiver no mapa de títulos', () => {
        // 1. Arrange
        usePathnameMock.mockReturnValue('/rota-desconhecida');
        
        // 2. Act
        render(<Topbar />);
        
        // 3. Assert
        expect(screen.getByRole('heading', { name: 'Banhosa Baso' })).toBeInTheDocument();
    });

    it('deve encerrar a sessão via Server Action e redirecionar para /login ao clicar em "Sair"', async () => {
        // 1. Arrange
        usePathnameMock.mockReturnValue('/dashboard');
        const user = userEvent.setup();
        render(<Topbar />);

        // 2. Act
        await user.click(screen.getByTitle('Sair'));

        // 3. Assert
        await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
        expect(logoutActionMock).toHaveBeenCalledTimes(1);
        expect(pushMock).toHaveBeenCalledTimes(1);
    });
});

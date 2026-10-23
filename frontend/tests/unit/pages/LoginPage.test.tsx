/**
 * @file UI & Lógica de Autenticação: LoginPage
 * @description Valida o comportamento visual, controle de estado e roteamento da
 * página de login.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - A autenticação real é feita pela Server Action `loginAction` (POST /auth/login no
 *   FastAPI), que grava o JWT num cookie httpOnly. Aqui ela é mockada: o teste cobre só
 *   o comportamento da tela (erro, loading e redirecionamento).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { pushMock, refreshMock, loginActionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  loginActionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('@/app/actions', () => ({
  loginAction: loginActionMock,
}));

/** Simula o backend: só aceita as credenciais do seed. */
function fakeLogin(username: string, password: string) {
  return Promise.resolve(
    username === 'banhosa.adm' && password === 'banhosa123' ? {} : { error: 'Usuário ou senha incorretos.' },
  );
}

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | LoginPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    loginActionMock.mockReset();
    loginActionMock.mockImplementation(fakeLogin);
  });

  it('deve renderizar os campos de usuário e senha', () => {
    // 1. Arrange & Act
    render(<LoginPage />);

    // 2. Assert
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro e NÃO redirecionar quando as credenciais estiverem incorretas', async () => {
    // 1. Arrange
    const user = userEvent.setup();
    render(<LoginPage />);

    // 2. Act
    await user.type(screen.getByLabelText('Usuário'), 'usuario.errado');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // 3. Assert
    expect(await screen.findByText('Usuário ou senha incorretos.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('deve autenticar via Server Action e redirecionar para /dashboard com credenciais corretas', async () => {
    // 1. Arrange
    const user = userEvent.setup();
    render(<LoginPage />);

    // 2. Act
    await user.type(screen.getByLabelText('Usuário'), 'banhosa.adm');
    await user.type(screen.getByLabelText('Senha'), 'banhosa123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // 3. Assert
    expect(loginActionMock).toHaveBeenCalledWith('banhosa.adm', 'banhosa123');
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('Usuário ou senha incorretos.')).not.toBeInTheDocument();
  });

  it('deve limpar uma mensagem de erro anterior ao tentar novamente com sucesso', async () => {
    // 1. Arrange (Provoca o estado de erro inicial)
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Usuário'), 'errado');
    await user.type(screen.getByLabelText('Senha'), 'errado');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Usuário ou senha incorretos.')).toBeInTheDocument();

    // 2. Act (Corrige as informações e tenta novamente)
    await user.clear(screen.getByLabelText('Usuário'));
    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Usuário'), 'banhosa.adm');
    await user.type(screen.getByLabelText('Senha'), 'banhosa123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // 3. Assert (Valida que o erro sumiu e o fluxo prosseguiu)
    expect(screen.queryByText('Usuário ou senha incorretos.')).not.toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });
});

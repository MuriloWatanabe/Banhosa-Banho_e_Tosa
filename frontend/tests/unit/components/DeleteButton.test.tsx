/**
 * @file UI & Comportamento: DeleteButton
 * @description Valida o fluxo de exclusão de registros, garantindo a obrigatoriedade
 * da etapa de confirmação do usuário e o controle de estado (loading) durante a execução.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - SEGURANÇA (Ação Irreversível): O componente intercepta exclusões e força um
 *   window.confirm(). A ausência dessa checagem permitiria exclusões acidentais sem barreira.
 * - TRANSIÇÕES (useTransition): Controla o estado "pendente" (botão desabilitado)
 *   enquanto a Server Action está em voo, prevenindo múltiplos cliques.
 */

import { describe, expect, it, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteButton } from '@/components/DeleteButton';

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | DeleteButton', () => {
  // window.confirm não tem uma implementação útil no jsdom
  // (retorna false por padrão). Portanto, criamos um spy/mock
  // global para controlar esse comportamento em cada teste.
  let confirmSpy: MockInstance<typeof window.confirm>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('deve exibir a mensagem de confirmação padrão, incluindo o "label" recebido', async () => {
    // 1. Arrange
    confirmSpy.mockReturnValue(false); // Usuário cancela: irrelevante aqui, testamos apenas o texto
    const action = vi.fn();
    const user = userEvent.setup();
    render(<DeleteButton action={action} label="o pet Rex" />);

    // 2. Act
    await user.click(screen.getByRole('button', { name: 'Excluir o pet Rex' }));

    // 3. Assert
    expect(confirmSpy).toHaveBeenCalledWith(
      'Tem certeza que deseja excluir o pet Rex? Essa ação não pode ser desfeita.',
    );
  });

  it('deve usar a "confirmMessage" customizada quando fornecida, em vez da mensagem padrão', async () => {
    // 1. Arrange
    confirmSpy.mockReturnValue(false);
    const action = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteButton
        action={action}
        label="o agendamento"
        confirmMessage="Cancelar este agendamento também libera o horário do profissional. Continuar?"
      />,
    );

    // 2. Act
    await user.click(screen.getByRole('button', { name: 'Excluir o agendamento' }));

    // 3. Assert
    expect(confirmSpy).toHaveBeenCalledWith(
      'Cancelar este agendamento também libera o horário do profissional. Continuar?',
    );
  });

  it('não deve chamar a action quando o usuário cancelar a confirmação', async () => {
    // 1. Arrange
    confirmSpy.mockReturnValue(false); // Usuário rejeita a exclusão
    const action = vi.fn();
    const user = userEvent.setup();
    render(<DeleteButton action={action} label="o tutor Ana" />);

    // 2. Act
    await user.click(screen.getByRole('button', { name: 'Excluir o tutor Ana' }));

    // 3. Assert
    expect(action).not.toHaveBeenCalled();
  });

  it('deve chamar a action quando o usuário confirmar a exclusão', async () => {
    // 1. Arrange
    confirmSpy.mockReturnValue(true); // Usuário aceita a exclusão
    const action = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DeleteButton action={action} label="o tutor Ana" />);

    // 2. Act
    await user.click(screen.getByRole('button', { name: 'Excluir o tutor Ana' }));

    // 3. Assert
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it('deve desabilitar o botão enquanto a exclusão está em andamento e reabilitá-lo ao terminar', async () => {
    // 1. Arrange
    confirmSpy.mockReturnValue(true);
    const user = userEvent.setup();

    // Criamos uma Promise "controlável" para simular uma Server Action lenta.
    // Isso permite inspecionar o estado isPending = true do botão NO MEIO da operação.
    let resolveAction: () => void = () => {};
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(<DeleteButton action={action} label="o profissional Bia" />);
    const button = screen.getByRole('button', { name: 'Excluir o profissional Bia' });
    expect(button).not.toBeDisabled();

    // 2. Act (Inicia a exclusão)
    await user.click(button);

    // 3. Assert (Estado intermediário / Loading)
    // O React 19 aguarda a Promise retornada dentro do startTransition,
    // logo o botão deve desabilitar enquanto não houver o resolve().
    await waitFor(() => expect(button).toBeDisabled());

    // 4. Act (Finaliza a exclusão)
    resolveAction();

    // 5. Assert (Estado final / Sucesso)
    // Após a Promise resolver, sai do estado de transição.
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});

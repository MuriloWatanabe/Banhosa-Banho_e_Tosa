/**
 * @file UI: Mudança de Status do Agendamento
 * @description Garante que a tela de status oferece as opções de troca, pede confirmação,
 * chama a Server Action e reflete o novo status (ou o erro da API).
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - As transições permitidas são regra do backend. O frontend não as replica: oferece os
 *   demais status e exibe a mensagem da API quando a transição é recusada.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlterarStatusForm } from '@/app/(dashboard)/agendamentos/[id]/status/AlterarStatusForm';
import type { Appointment } from '@/types';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { changeAppointmentStatusActionMock, refreshMock } = vi.hoisted(() => ({
  changeAppointmentStatusActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/app/actions', () => ({
  changeAppointmentStatusAction: changeAppointmentStatusActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

// =============================================================================
// FIXTURES (DADOS DE TESTE)
// =============================================================================

const appointment: Appointment = {
  id: 'a-1',
  petId: 'p-2',
  professionalId: 'prof-1',
  petName: 'Thor',
  tutorName: 'Bruno Lima',
  service: 'Banho',
  size: 'Grande',
  professionalName: 'Carla Dias',
  date: '2030-01-15',
  startTime: '09:00:00',
  durationMinutes: 120,
  status: 'Pendente',
};

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | AlterarStatusForm', () => {
  beforeEach(() => {
    changeAppointmentStatusActionMock.mockReset();
    refreshMock.mockClear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve exibir o status atual e oferecer os demais status como opção', () => {
    render(<AlterarStatusForm appointment={appointment} />);

    expect(screen.getByTestId('current-status')).toHaveTextContent('Pendente');
    expect(screen.getByRole('button', { name: /Confirmado/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Concluído/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelado/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pendente/ })).not.toBeInTheDocument();
  });

  it('deve exibir os dados do atendimento no resumo', () => {
    const { container } = render(<AlterarStatusForm appointment={appointment} />);

    const summary = container.querySelector('.summary-card');
    expect(summary).toHaveTextContent('Thor');
    expect(summary).toHaveTextContent('15/01/2030 · 09:00');
    expect(summary).toHaveTextContent('2h');
  });

  it('NÃO deve chamar a Server Action se o usuário cancelar a confirmação', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const user = userEvent.setup();
    render(<AlterarStatusForm appointment={appointment} />);

    await user.click(screen.getByRole('button', { name: /Confirmado/ }));

    expect(changeAppointmentStatusActionMock).not.toHaveBeenCalled();
  });

  it('deve alterar o status e atualizar a tela após sucesso', async () => {
    changeAppointmentStatusActionMock.mockResolvedValue({ data: { ...appointment, status: 'Confirmado' } });
    const user = userEvent.setup();
    render(<AlterarStatusForm appointment={appointment} />);

    await user.click(screen.getByRole('button', { name: /Confirmado/ }));

    expect(changeAppointmentStatusActionMock).toHaveBeenCalledWith('a-1', 'Confirmado');
    expect(await screen.findByRole('status')).toHaveTextContent('Status alterado para "Confirmado".');
    expect(screen.getByTestId('current-status')).toHaveTextContent('Confirmado');
    expect(screen.getByRole('button', { name: /Pendente/ })).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('deve exibir o erro da API quando a transição for inválida, mantendo o status atual', async () => {
    changeAppointmentStatusActionMock.mockResolvedValue({
      error: "Transição de status inválida: 'Concluído' → 'Pendente'.",
    });
    const user = userEvent.setup();
    render(<AlterarStatusForm appointment={{ ...appointment, status: 'Concluído' }} />);

    await user.click(screen.getByRole('button', { name: /Pendente/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Transição de status inválida');
    expect(screen.getByTestId('current-status')).toHaveTextContent('Concluído');
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

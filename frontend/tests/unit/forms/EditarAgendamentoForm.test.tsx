/**
 * @file UI: Edição de Agendamento (AgendamentoForm em modo edição)
 * @description Garante que a tela de edição vem pré-preenchida com os dados do agendamento
 * e envia a remarcação (PUT) com o payload correto.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - O status NÃO faz parte do payload de edição: ele só muda pela tela de status
 *   (PATCH /agendamentos/{id}/status).
 * - Se o agendamento estiver em status final, o backend recusa a edição e a tela
 *   apenas exibe a mensagem devolvida pela API.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendamentoForm } from '@/app/(dashboard)/agendamentos/AgendamentoForm';
import type { Appointment, Pet, Professional } from '@/types';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { createAppointmentActionMock, updateAppointmentActionMock, refreshMock } = vi.hoisted(() => ({
  createAppointmentActionMock: vi.fn(),
  updateAppointmentActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/app/actions', () => ({
  createAppointmentAction: createAppointmentActionMock,
  updateAppointmentAction: updateAppointmentActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

// =============================================================================
// FIXTURES (DADOS DE TESTE)
// =============================================================================

const pets: Pet[] = [
  { id: 'p-1', name: 'Mel', species: 'Gato', breed: 'SRD', size: 'Pequeno', tutorName: 'Ana Souza' },
  {
    id: 'p-2',
    name: 'Thor',
    species: 'Cão',
    breed: 'Golden Retriever',
    size: 'Grande',
    tutorName: 'Bruno Lima',
  },
];

const professionals: Professional[] = [
  { id: 'prof-1', name: 'Carla Dias', role: 'Tosador', specialty: 'Tosa na tesoura', active: true },
  { id: 'prof-2', name: 'Diego Melo', role: 'Tosador', specialty: 'Banho', active: true },
];

const appointment: Appointment = {
  id: 'a-1',
  petId: 'p-2',
  professionalId: 'prof-2',
  petName: 'Thor',
  tutorName: 'Bruno Lima',
  service: 'Tosa higiênica',
  size: 'Grande',
  professionalName: 'Diego Melo',
  date: '2030-01-15',
  startTime: '10:30:00',
  durationMinutes: 90,
  status: 'Confirmado',
};

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | AgendamentoForm — Modo edição', () => {
  beforeEach(() => {
    createAppointmentActionMock.mockReset();
    updateAppointmentActionMock.mockReset();
    refreshMock.mockClear();
  });

  it('deve vir pré-preenchido com os dados atuais do agendamento', () => {
    render(<AgendamentoForm pets={pets} professionals={professionals} appointment={appointment} />);

    expect(screen.getByRole('heading', { name: 'Editar agendamento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pet')).toHaveValue('p-2');
    expect(screen.getByLabelText('Profissional')).toHaveValue('prof-2');
    expect(screen.getByLabelText('Serviço')).toHaveValue('Tosa higiênica');
    expect(screen.getByLabelText('Data')).toHaveValue('2030-01-15');
    expect(screen.getByLabelText('Horário')).toHaveValue('10:30');
    expect(screen.getByRole('button', { name: /Salvar alterações/ })).toBeInTheDocument();
  });

  it('deve exibir a duração e o status atuais no resumo', () => {
    const { container } = render(
      <AgendamentoForm pets={pets} professionals={professionals} appointment={appointment} />,
    );

    const summary = container.querySelector('.summary-card');
    expect(summary).toHaveTextContent('1h 30min');
    expect(summary).toHaveTextContent('Confirmado');
  });

  it('deve enviar a remarcação (sem status) para updateAppointmentAction', async () => {
    updateAppointmentActionMock.mockResolvedValue({ data: { ...appointment, durationMinutes: 45 } });
    const user = userEvent.setup();
    render(<AgendamentoForm pets={pets} professionals={professionals} appointment={appointment} />);

    await user.selectOptions(screen.getByLabelText('Pet'), 'p-1');
    await user.clear(screen.getByLabelText('Horário'));
    await user.type(screen.getByLabelText('Horário'), '14:00');
    await user.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    expect(createAppointmentActionMock).not.toHaveBeenCalled();
    expect(updateAppointmentActionMock).toHaveBeenCalledWith('a-1', {
      pet_id: 'p-1',
      profissional_id: 'prof-2',
      service: 'Tosa higiênica',
      date: '2030-01-15',
      start_time: '14:00',
    });
    expect(
      await screen.findByText('Agendamento atualizado com sucesso. Duração calculada: 45 min.'),
    ).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('deve exibir o erro da API quando o agendamento não puder ser editado', async () => {
    updateAppointmentActionMock.mockResolvedValue({
      error: "Agendamentos com status 'Concluído' não podem ser editados.",
    });
    const user = userEvent.setup();
    render(
      <AgendamentoForm
        pets={pets}
        professionals={professionals}
        appointment={{ ...appointment, status: 'Concluído' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não podem ser editados');
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

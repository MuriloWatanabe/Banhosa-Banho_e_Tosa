/**
 * @file UI & Regra de Negócio: NovoAgendamentoForm
 * @description Garante a correta renderização do formulário, os estados de bloqueio
 * por falta de dependências e o payload enviado para a Server Action.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - REGRA DE NEGÓCIO (RN-01): O frontend NÃO calcula mais a duração. Ela é calculada
 *   pelo backend e exibida a partir da resposta da API. Estes testes garantem que nenhum
 *   valor de duração é enviado pelo cliente e que a tela mostra o valor devolvido.
 * - ESTADOS DE BLOQUEIO: O formulário exige listas populadas de pets e profissionais
 *   para funcionar.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NovoAgendamentoForm } from '@/app/(dashboard)/agendamentos/novo/NovoAgendamentoForm';
import type { Pet, Professional } from '@/types';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { createAppointmentActionMock, updateAppointmentActionMock, pushMock, refreshMock } = vi.hoisted(
  () => ({
    createAppointmentActionMock: vi.fn(),
    updateAppointmentActionMock: vi.fn(),
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
  }),
);

vi.mock('@/app/actions', () => ({
  createAppointmentAction: createAppointmentActionMock,
  updateAppointmentAction: updateAppointmentActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// =============================================================================
// FIXTURES (DADOS DE TESTE)
// =============================================================================

const petPequeno: Pet = {
  id: 'p-1',
  name: 'Mel',
  species: 'Gato',
  breed: 'SRD',
  size: 'Pequeno',
  tutorName: 'Ana Souza',
};

const petGrande: Pet = {
  id: 'p-2',
  name: 'Thor',
  species: 'Cão',
  breed: 'Golden Retriever',
  size: 'Grande',
  tutorName: 'Bruno Lima',
};

const professional: Professional = {
  id: 'prof-1',
  name: 'Carla Dias',
  role: 'Tosador',
  specialty: 'Tosa na tesoura',
  active: true,
};

// =============================================================================
// UTILS
// =============================================================================

/**
 * Lê as linhas do card de resumo pelo DOM.
 * Ordem fixa no JSX: [0: Pet, 1: Porte, 2: Serviço, 3: Duração, 4: Profissional].
 */
function getSummaryRows(container: HTMLElement) {
  return container.querySelectorAll('.summary-card .summary-row');
}

// =============================================================================
// SUÍTE DE TESTES: ESTADOS VAZIOS (BLOQUEIOS)
// =============================================================================

describe('UI | NovoAgendamentoForm — Estados Vazios', () => {
  it('deve bloquear o formulário e orientar o cadastro quando não há pets', () => {
    render(<NovoAgendamentoForm pets={[]} professionals={[professional]} />);

    expect(screen.getByText(/Nenhum pet cadastrado ainda\./)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum profissional cadastrado ainda\./)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo pet/ })).toHaveAttribute('href', '/pets/novo');
  });

  it('deve bloquear o formulário e orientar o cadastro quando não há profissionais', () => {
    render(<NovoAgendamentoForm pets={[petPequeno]} professionals={[]} />);

    expect(screen.getByText(/Nenhum profissional cadastrado ainda\./)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum pet cadastrado ainda\./)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo profissional/ })).toHaveAttribute(
      'href',
      '/profissionais/novo',
    );
  });

  it('deve mostrar ambas as orientações quando faltam pets E profissionais', () => {
    render(<NovoAgendamentoForm pets={[]} professionals={[]} />);

    expect(screen.getByText(/Nenhum pet cadastrado ainda\./)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum profissional cadastrado ainda\./)).toBeInTheDocument();
  });
});

// =============================================================================
// SUÍTE DE TESTES: DURAÇÃO CALCULADA PELO BACKEND (RN-01)
// =============================================================================

describe('UI | NovoAgendamentoForm — Duração (RN-01 no backend)', () => {
  beforeEach(() => {
    createAppointmentActionMock.mockReset();
    refreshMock.mockClear();
  });

  it('não deve estimar a duração no cliente, mesmo para porte Grande', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NovoAgendamentoForm pets={[petPequeno, petGrande]} professionals={[professional]} />,
    );

    await user.selectOptions(screen.getByLabelText('Pet'), 'p-2');

    const durationRow = getSummaryRows(container)[3];
    expect(durationRow).toHaveTextContent('Calculada ao salvar');
    expect(getSummaryRows(container)[1]).toHaveTextContent('Grande');
  });

  it('deve enviar apenas IDs e a intenção do agendamento, sem duração', async () => {
    createAppointmentActionMock.mockResolvedValue({ data: { id: 'a-1', durationMinutes: 120 } });
    const user = userEvent.setup();
    render(<NovoAgendamentoForm pets={[petGrande]} professionals={[professional]} />);

    await user.clear(screen.getByLabelText('Data'));
    await user.type(screen.getByLabelText('Data'), '2030-01-15');
    await user.click(screen.getByRole('button', { name: /Criar agendamento/ }));

    expect(createAppointmentActionMock).toHaveBeenCalledTimes(1);
    const payload = createAppointmentActionMock.mock.calls[0][0];
    expect(payload).toEqual({
      pet_id: 'p-2',
      profissional_id: 'prof-1',
      service: 'Banho',
      date: '2030-01-15',
      start_time: '09:00',
      status: 'Pendente',
    });
    expect(payload).not.toHaveProperty('durationMinutes');
  });

  it('deve exibir a duração devolvida pela API após criar o agendamento', async () => {
    createAppointmentActionMock.mockResolvedValue({ data: { id: 'a-1', durationMinutes: 120 } });
    const user = userEvent.setup();
    render(<NovoAgendamentoForm pets={[petGrande]} professionals={[professional]} />);

    await user.click(screen.getByRole('button', { name: /Criar agendamento/ }));

    expect(
      await screen.findByText('Agendamento criado com sucesso. Duração calculada: 2h.'),
    ).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('deve exibir o erro de regra de negócio retornado pela API (ex.: conflito RN-02)', async () => {
    createAppointmentActionMock.mockResolvedValue({
      error: 'Conflito de horário: o profissional já possui um agendamento.',
    });
    const user = userEvent.setup();
    render(<NovoAgendamentoForm pets={[petGrande]} professionals={[professional]} />);

    await user.click(screen.getByRole('button', { name: /Criar agendamento/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Conflito de horário');
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

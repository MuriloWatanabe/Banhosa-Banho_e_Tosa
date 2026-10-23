/**
 * @file UI & Comportamento: NovoPetForm
 * @description Valida o estado de bloqueio, a reatividade do painel de resumo (live preview)
 * e o fluxo completo de submissão do formulário.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - DEPENDÊNCIA DE DADOS: Não faz sentido cadastrar um pet sem tutor. O formulário
 *   deve se auto-bloquear e orientar o usuário se a lista de tutores estiver vazia.
 * - MOCKS (Server Actions): O módulo '@/app/actions' foi mockado pois este é um teste
 *   de UNIDADE do formulário. A validação de persistência no backend/banco de dados
 *   pertence aos testes de serviço; aqui garantimos apenas que a UI envia o payload correto.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NovoPetForm } from '@/app/(dashboard)/pets/novo/NovoPetForm';
import type { Tutor } from '@/types';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const { createPetActionMock, pushMock, refreshMock } = vi.hoisted(() => ({
  createPetActionMock: vi.fn().mockResolvedValue({ data: { id: 'p-1' } }),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/app/actions', () => ({
  createPetAction: createPetActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// =============================================================================
// FIXTURES (DADOS DE TESTE)
// =============================================================================

// Dataset mínimo reutilizado entre os testes que precisam de tutores.
const tutors: Tutor[] = [
  { id: 't-1', name: 'Ana Souza', phone: '11 99999-0000', email: 'ana@email.com', petsCount: 1 },
  { id: 't-2', name: 'Bruno Lima', phone: '11 98888-1111', email: 'bruno@email.com', petsCount: 0 },
];

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | NovoPetForm', () => {
  beforeEach(() => {
    createPetActionMock.mockClear();
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it('deve exibir o estado vazio e NÃO renderizar o formulário quando não houver tutores cadastrados', () => {
    // 1. Arrange & Act
    render(<NovoPetForm tutors={[]} />);

    // 2. Assert
    expect(
      screen.getByText('Nenhum tutor cadastrado ainda. Cadastre um tutor antes de adicionar um pet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo tutor/ })).toHaveAttribute('href', '/tutores/novo');

    // Nenhum campo de formulário deve existir nesse estado
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
  });

  it('deve pré-selecionar o primeiro tutor da lista como valor padrão do select', () => {
    // 1. Arrange & Act
    render(<NovoPetForm tutors={tutors} />);

    // 2. Assert
    const tutorSelect = screen.getByLabelText('Tutor') as HTMLSelectElement;
    expect(tutorSelect.value).toBe('t-1'); // o select envia o ID do tutor
  });

  it('deve atualizar o card de resumo em tempo real conforme o usuário digita', async () => {
    // 1. Arrange
    const user = userEvent.setup();
    const { container } = render(<NovoPetForm tutors={tutors} />);

    // NOTA DE AMBIGUIDADE: Os rótulos ("Nome", "Porte", etc.) existem tanto no formulário
    // quanto no resumo. Para evitar conflito no getByText, buscamos o card de resumo
    // pelo CSS e acessamos pela ordem fixa definida no JSX:
    // [0: Nome, 1: Espécie, 2: Porte, 3: Tutor].
    const summaryRows = container.querySelectorAll('.summary-card .summary-row');
    const nameRow = summaryRows[0];

    // Valida estado inicial (antes da digitação)
    expect(nameRow).toHaveTextContent('—');

    // 2. Act
    await user.type(screen.getByLabelText('Nome'), 'Thor');

    // 3. Assert
    // "Thor" deve aparecer tanto no input quanto refletido no resumo ao vivo
    expect(screen.getByLabelText('Nome')).toHaveValue('Thor');
    expect(nameRow).toHaveTextContent('Thor');
  });

  it('deve refletir a troca de porte (size) no card de resumo', async () => {
    // 1. Arrange
    const user = userEvent.setup();
    const { container } = render(<NovoPetForm tutors={tutors} />);

    // 2. Act
    await user.selectOptions(screen.getByLabelText('Porte'), 'Grande');

    // 3. Assert
    const summaryRows = container.querySelectorAll('.summary-card .summary-row');
    const sizeSummaryRow = summaryRows[2]; // Ordem: Nome, Espécie, Porte, Tutor
    expect(sizeSummaryRow).toHaveTextContent('Grande');
  });

  it('deve enviar os dados corretos ao submeter e limpar nome/raça, mantendo a mensagem de sucesso', async () => {
    // 1. Arrange (Preenche todo o formulário)
    const user = userEvent.setup();
    render(<NovoPetForm tutors={tutors} />);

    await user.type(screen.getByLabelText('Nome'), 'Thor');
    await user.selectOptions(screen.getByLabelText('Espécie'), 'Cão');
    await user.type(screen.getByLabelText('Raça'), 'Golden Retriever');
    await user.selectOptions(screen.getByLabelText('Porte'), 'Grande');
    await user.selectOptions(screen.getByLabelText('Tutor'), 'Bruno Lima');

    // 2. Act
    await user.click(screen.getByRole('button', { name: /Cadastrar pet/ }));

    // 3. Assert
    // A Server Action recebe PetCreateInput: o tutor é referenciado pelo ID
    expect(createPetActionMock).toHaveBeenCalledWith({
      name: 'Thor',
      species: 'Cão',
      breed: 'Golden Retriever',
      size: 'Grande',
      tutor_id: 't-2',
    });

    // Valida reset do formulário (campos de texto limpos, selects mantidos)
    // e feedback visual de sucesso
    expect(await screen.findByText('Pet cadastrado com sucesso.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText('Raça')).toHaveValue('');
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

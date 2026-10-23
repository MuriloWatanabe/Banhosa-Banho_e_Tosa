/**
 * @file UI & Apresentação: StatCard
 * @description Garante o contrato de renderização de um componente puramente
 * apresentacional (Dumb Component), verificando se rótulos, valores e ícones
 * são exibidos corretamente.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - COMPONENTE DUMB: Não possui estado interno ou regras de negócio.
 *   Sua única responsabilidade é refletir os dados passados na interface.
 * - CONTRATO DE TIPAGEM: A prop `value` é rigorosamente tipada como string.
 *   Isso significa que a coerção de números (ex: String(numero)) é responsabilidade
 *   do componente pai (quem consome o StatCard), e não do card em si.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/StatCard';
import { Icon } from '@/components/Icon';

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | StatCard', () => {
  it('deve renderizar o rótulo (label) e o valor (value) recebidos via props', () => {
    // 1. Arrange & Act
    render(<StatCard label="Agendamentos hoje" value="12" icon={<Icon name="calendar" />} />);

    // 2. Assert
    expect(screen.getByText('Agendamentos hoje')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('deve renderizar o ícone passado via props dentro do container do card', () => {
    // 1. Arrange & Act
    const { container } = render(<StatCard label="Pets cadastrados" value="8" icon={<Icon name="pets" />} />);

    // 2. Assert
    // Como o ícone é passado como ReactNode, validamos indiretamente se um <svg>
    // foi montado no local correto. O desenho do SVG em si é testado em Icon.test.tsx.
    expect(container.querySelector('.stat-icon svg')).not.toBeNull();
  });

  it('deve renderizar o valor numérico desde que seja convertido previamente para string (contrato de prop)', () => {
    // Arrange, Act & Assert
    // Documenta a necessidade de conversão (String(0)) imposta pela tipagem do componente.
    render(<StatCard label="Profissionais" value={String(0)} icon={<Icon name="staff" />} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

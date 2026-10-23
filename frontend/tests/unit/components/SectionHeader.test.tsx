/**
 * @file UI & Apresentação: SectionHeader
 * @description Valida a renderização básica do título e a exibição condicional
 * do link de ação da seção.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - CONDICIONAL DE LINK: A regra de negócio principal aqui é garantir que o link
 *   só seja renderizado se AMBAS as propriedades (actionLabel e actionHref) forem
 *   fornecidas simultaneamente. Isso previne a criação de links "quebrados"
 *   (sem destino) ou "invisíveis" (sem texto) na interface.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from '@/components/SectionHeader';

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | SectionHeader', () => {
  it('deve sempre renderizar o título da seção', () => {
    // 1. Arrange & Act
    render(<SectionHeader title="Próximos atendimentos" />);

    // 2. Assert
    expect(screen.getByRole('heading', { name: 'Próximos atendimentos' })).toBeInTheDocument();
  });

  it('deve renderizar o link de ação quando actionLabel E actionHref forem fornecidos', () => {
    // 1. Arrange & Act
    render(
      <SectionHeader
        title="Próximos atendimentos"
        actionLabel="Ver agenda completa"
        actionHref="/agendamentos"
      />,
    );

    // 2. Assert
    const link = screen.getByRole('link', { name: 'Ver agenda completa' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/agendamentos');
  });

  it('não deve renderizar nenhum link quando nenhuma prop de ação for fornecida', () => {
    // 1. Arrange & Act
    render(<SectionHeader title="Próximos atendimentos" />);

    // 2. Assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('não deve renderizar o link quando apenas actionLabel for fornecido (sem href)', () => {
    // 1. Arrange & Act
    // Caso extremo: props parcialmente preenchidas não devem gerar
    // um <Link href={undefined}>, o que quebraria o roteamento do Next.
    render(<SectionHeader title="Próximos atendimentos" actionLabel="Ver mais" />);

    // 2. Assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('não deve renderizar o link quando apenas actionHref for fornecido (sem label)', () => {
    // 1. Arrange & Act
    render(<SectionHeader title="Próximos atendimentos" actionHref="/agendamentos" />);

    // 2. Assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

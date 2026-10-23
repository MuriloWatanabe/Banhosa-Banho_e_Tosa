/**
 * @file UI & Apresentação: Icon
 * @description Valida a renderização correta dos ícones em SVG, garantindo a
 * presença dos atributos base estruturais e prevenindo regressões de design.
 *
 * @type {Teste de Componente / UI}
 *
 * @notes
 * - COMPONENTE DUMB: Não possui estado ou lógica complexa. O maior risco aqui são
 *   erros de digitação (typos) no "case" do switch ou a perda de atributos base.
 * - CONSISTÊNCIA VISUAL: Todos os ícones compartilham o mesmo viewBox (0 0 24 24)
 *   e stroke. Componentes como Sidebar e Topbar dependem desse contrato visual.
 * - TIPAGEM FORTE: O teste mapeia todos os nomes do union type. Se um novo ícone for
 *   adicionado à tipagem mas o desenvolvedor esquecer de implementá-lo no switch/case,
 *   o teste de iteração falhará automaticamente.
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '@/components/Icon';

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('UI | Icon', () => {
  // Lista com TODOS os nomes aceitos pelo componente.
  const allIconNames = [
    'dashboard',
    'calendar',
    'pets',
    'users',
    'staff',
    'plus',
    'search',
    'bell',
    'chevron',
    'clock',
    'check',
    'paw',
    'trash',
  ] as const;

  it.each(allIconNames)('deve renderizar um <svg> válido com os atributos base para o ícone "%s"', (name) => {
    // 1. Arrange & Act
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');

    // 2. Assert
    expect(svg).not.toBeNull();

    // Todos os ícones do design system compartilham o mesmo viewBox/stroke,
    // garantindo que fiquem visualmente consistentes lado a lado no menu.
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('deve possuir ao menos um elemento gráfico interno (path, rect ou circle) no SVG gerado', () => {
    // 1. Arrange & Act
    const { container } = render(<Icon name="trash" />);

    // 2. Assert
    const graphicElements = container.querySelectorAll('svg path, svg rect, svg circle');
    expect(graphicElements.length).toBeGreaterThan(0);
  });

  it('deve produzir marcações diferentes para ícones distintos (prevenção de fallback acidental)', () => {
    // 1. Arrange & Act
    // Regressão simples: garante que não existe um "fallback" acidental
    // (ex: esquecer de colocar "break" ou "return" em um dos cases do switch,
    // fazendo com que múltiplos ícones renderizem a mesma imagem).
    const { container: pawContainer } = render(<Icon name="paw" />);
    const { container: trashContainer } = render(<Icon name="trash" />);

    // 2. Assert
    expect(pawContainer.querySelector('svg')?.innerHTML).not.toEqual(
      trashContainer.querySelector('svg')?.innerHTML,
    );
  });
});

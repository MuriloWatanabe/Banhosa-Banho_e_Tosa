/**
 * @file Configuração Global de Testes (Setup)
 * @description Arquivo de inicialização e configuração executado antes das suítes de
 * teste no Vitest. Prepara o ambiente JSDOM e resolve dependências exclusivas de servidor.
 *
 * @type {Test Setup}
 *
 * @notes
 * - Este arquivo é carregado globalmente.
 * - Garante a estabilidade da árvore de componentes limpando o DOM a cada ciclo.
 * - Fornece substitutos (mocks) para módulos do Next.js que quebram fora de um
 *   ambiente Node/Edge real.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// =============================================================================
// CLEANUP & TEARDOWN
// =============================================================================

/**
 * Limpeza automática do DOM após cada teste.
 * Garante o isolamento dos cenários: impede que um componente montado no teste "A"
 * vaze e gere falsos positivos/negativos no teste "B".
 */
afterEach(() => {
  cleanup();
});

// =============================================================================
// MOCKS GLOBAIS
// =============================================================================

/**
 * Mock global do <Image /> (next/image).
 * O otimizador de imagens interno do Next.js não existe no JSDOM puro.
 * Substituímos o componente nativo por uma tag <img> padrão, repassando
 * as props visuais. Centralizado aqui pois afeta múltiplos testes na aplicação.
 */
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props as { src: string; alt: string };
    // eslint-disable-next-line @next/next/no-img-element -- Mock isolado para ambiente de testes
    return <img src={src} alt={alt} {...rest} />;
  },
}));

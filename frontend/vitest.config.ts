/**
 * @file Configuração Central do Vitest
 * @description Define o ambiente de execução dos testes para o frontend do projeto Banhosa.
 * Mantém paridade estrita com o Next.js (ex: uso do alias `@/`, React 19) para garantir
 * que os testes reflitam fielmente o comportamento de produção.
 *
 * @type {Configuração}
 *
 * @notes
 * - COBERTURA (Coverage): Server Components (page.tsx) e layouts são excluídos do relatório
 *   unitário intencionalmente. Como fazem fetch e renderização no servidor, a validação
 *   destes artefatos fica delegada a testes de Integração e E2E.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// =============================================================================
// EXPORT DA CONFIGURAÇÃO
// =============================================================================

export default defineConfig({
  plugins: [react()],
  test: {
    // Ambiente de simulação do navegador em memória
    // (necessário para componentes React que manipulam eventos e o DOM).
    environment: 'jsdom',

    // Arquivo de inicialização executado automaticamente antes de cada suíte.
    // Utilizado para registrar matchers do jest-dom e garantir a limpeza do DOM.
    setupFiles: ['./tests/setup/vitest.setup.tsx'],

    // Permite utilizar métodos como describe, it e expect globalmente
    // sem a necessidade de importação manual em cada arquivo.
    globals: true,

    // Diretório base e padrão de nomenclatura para localização dos testes.
    include: ['tests/**/*.test.{ts,tsx}'],

    // =====================================================================
    // CONFIGURAÇÃO DE COBERTURA DE CÓDIGO (npm run test:coverage)
    // =====================================================================
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Ignora Server Components e definições de tipo estáticas
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/**/*.d.ts',
      ],
    },
  },

  // =========================================================================
  // RESOLUÇÃO DE MÓDULOS
  // =========================================================================
  resolve: {
    alias: {
      // Espelha a configuração de "paths" do tsconfig.json (@/* -> src/*).
      // Garante que as importações absolutas funcionem nos testes exatamente
      // como funcionam no build do Next.js.
      '@': path.resolve(__dirname, './src'),
    },
  },
});

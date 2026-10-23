/**
 * @file Testes Unitários: Utilitários de Agendamento
 * @description Valida os helpers de formatação usados na exibição dos agendamentos.
 *
 * @type {Teste de Unidade}
 *
 * @notes
 * - REGRA DE NEGÓCIO (RN-01): O cálculo de duração (porte Grande/Gigante dobra o tempo-base)
 *   NÃO existe mais no frontend. A fonte da verdade é o backend
 *   (backend/app/services/duration_service.py), coberto por testes PyTest. O frontend apenas
 *   exibe o `durationMinutes` devolvido pela API.
 */

import { describe, expect, it } from 'vitest';
import * as appointmentUtils from '@/utils/appointment';
import { formatDate, formatDuration, statusPillColor, toTimeInputValue } from '@/utils/appointment';

// =============================================================================
// SUÍTE DE TESTES: REGRAS DUPLICADAS REMOVIDAS
// =============================================================================

describe('Unit | utils/appointment — sem regras de negócio duplicadas', () => {
  it('não deve expor cálculo de duração (RN-01 é exclusiva do backend)', () => {
    expect('getAppointmentDuration' in appointmentUtils).toBe(false);
  });
});

// =============================================================================
// SUÍTE DE TESTES: FORMATAÇÃO DE TEXTO
// =============================================================================

describe('Unit | formatDuration', () => {
  it('deve formatar minutos puros (menos de uma hora) no formato "N min"', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('deve formatar horas exatas (sem minutos restantes) no formato "Nh"', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
  });

  it('deve formatar horas com minutos restantes no formato "Nh Mmin"', () => {
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(135)).toBe('2h 15min');
  });

  it('deve tratar 0 minutos como "0 min" explicitamente', () => {
    // Caso extremo: previne cair em blocos que retornam strings vazias para hora 0
    expect(formatDuration(0)).toBe('0 min');
  });
});

describe('Unit | formatDate', () => {
  it('deve converter a data ISO da API para o formato brasileiro', () => {
    expect(formatDate('2026-10-23')).toBe('23/10/2026');
  });
});

describe('Unit | toTimeInputValue', () => {
  it('deve remover os segundos do horário devolvido pela API', () => {
    expect(toTimeInputValue('09:30:00')).toBe('09:30');
  });

  it('deve manter horários que já estão no formato HH:MM', () => {
    expect(toTimeInputValue('14:00')).toBe('14:00');
  });
});

describe('Unit | statusPillColor', () => {
  it.each([
    ['Confirmado', 'green'],
    ['Concluído', 'green'],
    ['Cancelado', 'red'],
    ['Pendente', 'amber'],
  ] as const)('deve usar a cor correta para o status %s', (status, color) => {
    expect(statusPillColor(status)).toBe(color);
  });
});

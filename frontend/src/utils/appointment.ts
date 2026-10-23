import { AppointmentStatus } from '@/types';

/**
 * Serviços oferecidos no formulário de agendamento (apenas os rótulos).
 * Duração (RN-01), disponibilidade (RN-02), papel exigido do profissional e
 * transições de status são regras de negócio do backend — o frontend não as
 * replica: envia a intenção e exibe o resultado (ou o erro) devolvido pela API.
 */
export const SERVICE_OPTIONS = ['Banho', 'Banho + Tosa', 'Tosa higiênica', 'Consulta veterinária'] as const;

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

/** "2026-10-23" → "23/10/2026" */
export function formatDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/');
}

/** "09:30:00" → "09:30" (formato aceito pelo <input type="time">). */
export function toTimeInputValue(time: string): string {
  return time.slice(0, 5);
}

export function statusPillColor(status: AppointmentStatus): 'green' | 'red' | 'amber' {
  if (status === 'Confirmado' || status === 'Concluído') return 'green';
  if (status === 'Cancelado') return 'red';
  return 'amber';
}

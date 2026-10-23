'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { changeAppointmentStatusAction } from '@/app/actions';
import { APPOINTMENT_STATUSES, Appointment, AppointmentStatus } from '@/types';
import { formatDate, formatDuration, statusPillColor, toTimeInputValue } from '@/utils/appointment';
import { Icon } from '@/components/Icon';

type Props = { appointment: Appointment };

export function AlterarStatusForm({ appointment }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Quais transições são válidas é decisão do backend: aqui oferecemos todos
  // os outros status e exibimos o erro da API caso a transição seja recusada.
  const options = APPOINTMENT_STATUSES.filter((item) => item !== status);

  function changeTo(newStatus: AppointmentStatus) {
    if (!window.confirm(`Alterar o status do agendamento de ${appointment.petName} para "${newStatus}"?`))
      return;
    setError('');
    setMessage('');
    startTransition(async () => {
      const result = await changeAppointmentStatusAction(appointment.id, newStatus);
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      setStatus(result.data.status);
      setMessage(`Status alterado para "${result.data.status}".`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Agenda</div>
          <h2>Alterar status</h2>
          <p>Confirme, conclua ou cancele o atendimento.</p>
        </div>
      </div>
      <div
        className="grid content-grid"
        style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, .75fr)' }}
      >
        <section className="panel form-card">
          <div className="form-field">
            <label>Status atual</label>
            <div>
              <span className={`pill ${statusPillColor(status)}`} data-testid="current-status">
                {status}
              </span>
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 18 }}>
            <label>Alterar para</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {options.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === 'Cancelado' ? 'btn btn-secondary' : 'btn btn-primary'}
                  disabled={isPending}
                  onClick={() => changeTo(item)}
                >
                  {item === 'Cancelado' ? null : <Icon name="check" />} {item}
                </button>
              ))}
            </div>
            <small>Concluído e Cancelado são estados finais: o agendamento deixa de ser editável.</small>
          </div>
          {error ? (
            <div
              className="notice"
              role="alert"
              style={{ marginTop: 16, background: 'var(--danger-soft)', color: '#a73d3d' }}
            >
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="notice" role="status" style={{ marginTop: 16 }}>
              {message}
            </div>
          ) : null}
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Link href="/agendamentos" className="btn btn-secondary">
              Voltar
            </Link>
          </div>
        </section>
        <aside className="summary-card">
          <div className="eyebrow" style={{ color: '#e2d5c4' }}>
            Resumo
          </div>
          <h3 style={{ margin: '7px 0 12px', fontSize: 20 }}>Atendimento</h3>
          <div className="summary-row">
            <span>Pet</span>
            <strong>{appointment.petName}</strong>
          </div>
          <div className="summary-row">
            <span>Tutor</span>
            <strong>{appointment.tutorName}</strong>
          </div>
          <div className="summary-row">
            <span>Serviço</span>
            <strong>{appointment.service}</strong>
          </div>
          <div className="summary-row">
            <span>Data</span>
            <strong>
              {formatDate(appointment.date)} · {toTimeInputValue(appointment.startTime)}
            </strong>
          </div>
          <div className="summary-row">
            <span>Duração</span>
            <strong>{formatDuration(appointment.durationMinutes)}</strong>
          </div>
          <div className="summary-row">
            <span>Profissional</span>
            <strong>{appointment.professionalName}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

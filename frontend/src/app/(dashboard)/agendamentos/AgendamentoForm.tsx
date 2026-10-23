'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createAppointmentAction, updateAppointmentAction } from '@/app/actions';
import { SERVICE_OPTIONS, formatDuration, toTimeInputValue } from '@/utils/appointment';
import { Appointment, Pet, Professional } from '@/types';
import { Icon } from '@/components/Icon';

type Props = {
  pets: Pet[];
  professionals: Professional[];
  /** Quando informado, o formulário entra em modo de edição (remarcação). */
  appointment?: Appointment;
};

export function AgendamentoForm({ pets, professionals, appointment }: Props) {
  const isEdit = Boolean(appointment);
  const router = useRouter();
  const [petId, setPetId] = useState(appointment?.petId ?? pets[0]?.id ?? '');
  const [service, setService] = useState<string>(appointment?.service ?? SERVICE_OPTIONS[0]);
  const [date, setDate] = useState(() => appointment?.date ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(appointment ? toTimeInputValue(appointment.startTime) : '09:00');
  const [professionalId, setProfessionalId] = useState(
    appointment?.professionalId ?? professionals[0]?.id ?? '',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pet = pets.find((item) => item.id === petId);
  const professional = professionals.find((item) => item.id === professionalId);
  // Mantém o serviço atual selecionável mesmo que não esteja na lista padrão.
  const serviceOptions: string[] = SERVICE_OPTIONS.includes(service as (typeof SERVICE_OPTIONS)[number])
    ? [...SERVICE_OPTIONS]
    : [service, ...SERVICE_OPTIONS];

  const title = isEdit ? 'Editar agendamento' : 'Novo agendamento';
  const subtitle = isEdit
    ? 'Altere pet, serviço, profissional, data ou horário do atendimento.'
    : 'Preencha os dados para reservar um atendimento.';

  if (pets.length === 0 || professionals.length === 0) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="eyebrow">Agenda</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="panel empty">
          {pets.length === 0 ? 'Nenhum pet cadastrado ainda. ' : ''}
          {professionals.length === 0 ? 'Nenhum profissional cadastrado ainda. ' : ''}
          Cadastre-os antes de criar um agendamento.
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
            {pets.length === 0 ? (
              <a href="/pets/novo" className="btn btn-primary">
                <Icon name="plus" /> Novo pet
              </a>
            ) : null}
            {professionals.length === 0 ? (
              <a href="/profissionais/novo" className="btn btn-primary">
                <Icon name="plus" /> Novo profissional
              </a>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!pet || !professional) return;
    setLoading(true);
    setError('');
    setMessage('');
    const input = { pet_id: pet.id, profissional_id: professional.id, service, date, start_time: startTime };
    const result = appointment
      ? await updateAppointmentAction(appointment.id, input)
      : await createAppointmentAction({ ...input, status: 'Pendente' });
    setLoading(false);
    if (result.error !== undefined) {
      // Aqui chegam os erros de regra de negócio vindos do backend, ex.:
      // "Conflito de horário: o profissional já possui um agendamento..." (RN-02),
      // "Horário fora do funcionamento..." ou status que não permite edição.
      setError(result.error);
      return;
    }
    // A duração exibida é sempre a calculada pela API (RN-01).
    const duration = formatDuration(result.data.durationMinutes);
    setMessage(
      isEdit
        ? `Agendamento atualizado com sucesso. Duração calculada: ${duration}.`
        : `Agendamento criado com sucesso. Duração calculada: ${duration}.`,
    );
    router.refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Agenda</div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div
        className="grid content-grid"
        style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, .75fr)' }}
      >
        <form className="panel form-card" onSubmit={submit}>
          <div className="grid form-grid">
            <div className="form-field">
              <label htmlFor="pet">Pet</label>
              <select id="pet" className="select" value={petId} onChange={(e) => setPetId(e.target.value)}>
                {pets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.tutorName}
                  </option>
                ))}
              </select>
              {pet ? (
                <small>
                  Porte: <strong>{pet.size}</strong>
                </small>
              ) : null}
            </div>
            <div className="form-field">
              <label htmlFor="service">Serviço</label>
              <select
                id="service"
                className="select"
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {serviceOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="professional">Profissional</label>
              <select
                id="professional"
                className="select"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
              >
                {professionals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.role}
                    {item.active ? '' : ' (inativo)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="date">Data</label>
              <input
                id="date"
                className="input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="time">Horário</label>
              <input
                id="time"
                className="input"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Duração</label>
              <div className="notice">
                A duração é calculada pela API ao salvar, conforme o serviço e o porte do pet (RN-01). A
                disponibilidade do profissional também é validada no servidor (RN-02).
              </div>
            </div>
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
              {isEdit ? 'Voltar' : 'Cancelar'}
            </Link>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <Icon name="check" />{' '}
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar agendamento'}
            </button>
          </div>
        </form>
        <aside className="summary-card">
          <div className="eyebrow" style={{ color: '#e2d5c4' }}>
            Resumo
          </div>
          <h3 style={{ margin: '7px 0 12px', fontSize: 20 }}>Bloqueio de agenda</h3>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            A API calcula a duração e valida a disponibilidade do profissional antes de confirmar.
          </p>
          <div className="summary-row">
            <span>Pet</span>
            <strong>{pet?.name ?? '—'}</strong>
          </div>
          <div className="summary-row">
            <span>Porte</span>
            <strong>{pet?.size ?? '—'}</strong>
          </div>
          <div className="summary-row">
            <span>Serviço</span>
            <strong>{service}</strong>
          </div>
          <div className="summary-row">
            <span>Duração atual</span>
            <strong>
              {appointment ? formatDuration(appointment.durationMinutes) : 'Calculada ao salvar'}
            </strong>
          </div>
          <div className="summary-row">
            <span>Profissional</span>
            <strong>{professional?.name ?? '—'}</strong>
          </div>
          {appointment ? (
            <div className="summary-row">
              <span>Status</span>
              <strong>{appointment.status}</strong>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

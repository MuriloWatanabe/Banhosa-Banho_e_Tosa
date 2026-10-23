import Link from 'next/link';
import { getDashboardData } from '@/services/api';
import { Icon } from '@/components/Icon';
import { StatCard } from '@/components/StatCard';
import { SectionHeader } from '@/components/SectionHeader';
import { statusPillColor, toTimeInputValue } from '@/utils/appointment';

function formatToday() {
  const formatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return `Hoje · ${formatted}`;
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="page-header">
        <div>
          <div className="eyebrow">{formatToday()}</div>
          <h2>Bom trabalho, Banhosa.Adm 👋</h2>
        </div>

        <div className="page-actions">
          <Link href="/agendamentos/novo" className="btn btn-primary">
            <Icon name="plus" /> Novo agendamento
          </Link>
        </div>
      </div>

      <div className="grid stats-grid">
        <StatCard
          label="Agendamentos hoje"
          value={String(data.totals.appointmentsToday)}
          icon={<Icon name="calendar" />}
        />

        <StatCard
          label="Tutores ativos"
          value={String(data.totals.activeClients)}
          icon={<Icon name="users" />}
        />

        <StatCard label="Pets cadastrados" value={String(data.totals.pets)} icon={<Icon name="pets" />} />

        <StatCard
          label="Profissionais"
          value={String(data.totals.professionals)}
          icon={<Icon name="staff" />}
        />
      </div>

      <section className="panel w-full" style={{ marginTop: '40px' }}>
        <SectionHeader
          title="Próximos atendimentos"
          actionLabel="Ver agenda completa"
          actionHref="/agendamentos"
        />

        {data.appointments.length === 0 ? (
          <div className="empty">Nenhum agendamento para hoje.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Horário</th>
                  <th>Pet</th>
                  <th>Serviço</th>
                  <th>Profissional</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {data.appointments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{toTimeInputValue(a.startTime)}</strong>
                    </td>

                    <td>
                      <strong>{a.petName}</strong>
                      <div className="muted">{a.tutorName}</div>
                    </td>

                    <td>
                      {a.service}
                      <div className="muted">
                        {a.size} · {a.durationMinutes} min
                      </div>
                    </td>

                    <td>{a.professionalName}</td>

                    <td>
                      <span className={`pill ${statusPillColor(a.status)}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

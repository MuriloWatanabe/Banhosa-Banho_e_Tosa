import Link from 'next/link';
import { getAppointments } from '@/services/api';
import { Icon } from '@/components/Icon';
import { DeleteButton } from '@/components/DeleteButton';
import { deleteAppointmentAction } from '@/app/actions';
import { formatDate, formatDuration, statusPillColor, toTimeInputValue } from '@/utils/appointment';

export default async function AgendamentosPage() {
  const items = await getAppointments();
  return <>
    <div className="page-header"><div><div className="eyebrow">Operação</div><h2>Agendamentos</h2><p>Controle horários, profissionais e duração dos atendimentos.</p></div><Link href="/agendamentos/novo" className="btn btn-primary"><Icon name="plus"/> Novo agendamento</Link></div>
    <section className="panel"><div className="data-toolbar"><div className="search-box"><span className="search-icon"><Icon name="search"/></span><input className="input" placeholder="Buscar por pet ou tutor" /></div><div className="page-actions"><button className="btn btn-secondary">Hoje</button><button className="btn btn-secondary">Todos os status</button></div></div>
    {items.length === 0 ? (
      <div className="empty">Nenhum agendamento cadastrado ainda. Clique em &quot;Novo agendamento&quot; para adicionar o primeiro.</div>
    ) : (
      <div className="table-wrap"><table>
        <thead><tr><th>Data</th><th>Horário</th><th>Pet / Tutor</th><th>Serviço</th><th>Profissional</th><th>Duração</th><th>Status</th><th></th></tr></thead>
        <tbody>{items.map((a) => <tr key={a.id}>
          <td>{formatDate(a.date)}</td>
          <td>{toTimeInputValue(a.startTime)}</td>
          <td><strong>{a.petName}</strong><div className="muted">{a.tutorName}</div></td>
          <td>{a.service}<div className="muted">Porte {a.size}</div></td>
          <td>{a.professionalName}</td>
          <td>{formatDuration(a.durationMinutes)}</td>
          <td><Link href={`/agendamentos/${a.id}/status`} className={`pill ${statusPillColor(a.status)}`} title={`Alterar status do agendamento de ${a.petName}`}>{a.status}</Link></td>
          <td style={{ textAlign: 'right' }}><div style={{ display: 'inline-flex', gap: 6 }}><Link href={`/agendamentos/${a.id}/editar`} className="icon-button icon-button-sm" title={`Editar o agendamento de ${a.petName}`} aria-label={`Editar o agendamento de ${a.petName}`}><Icon name="edit"/></Link><Link href={`/agendamentos/${a.id}/status`} className="icon-button icon-button-sm" title={`Alterar status do agendamento de ${a.petName}`} aria-label={`Alterar status do agendamento de ${a.petName}`}><Icon name="check"/></Link><DeleteButton action={deleteAppointmentAction.bind(null, a.id)} label={`o agendamento de ${a.petName}`} /></div></td>
        </tr>)}</tbody>
      </table></div>
    )}
    </section>
  </>;
}

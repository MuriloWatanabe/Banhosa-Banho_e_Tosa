import Link from 'next/link';
import { getProfessionals } from '@/services/api';
import { Icon } from '@/components/Icon';
import { DeleteButton } from '@/components/DeleteButton';
import { deleteProfessionalAction } from '@/app/actions';

export default async function ProfissionaisPage() {
  const professionals = await getProfessionals();
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Cadastros</div>
          <h2>Profissionais</h2>
          <p>Equipe responsável por executar os atendimentos.</p>
        </div>
        <Link href="/profissionais/novo" className="btn btn-primary">
          <Icon name="plus" /> Novo profissional
        </Link>
      </div>
      {professionals.length === 0 ? (
        <div className="panel empty">
          Nenhum profissional cadastrado ainda. Clique em &quot;Novo profissional&quot; para adicionar o
          primeiro.
        </div>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Função</th>
                  <th>Especialidade</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.role}</td>
                    <td>{p.specialty}</td>
                    <td>
                      <span className={`pill ${p.active ? 'green' : 'red'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <DeleteButton
                        action={deleteProfessionalAction.bind(null, p.id)}
                        label={`o profissional ${p.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

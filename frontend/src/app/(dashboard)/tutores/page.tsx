import Link from 'next/link';
import { getTutors } from '@/services/api';
import { Icon } from '@/components/Icon';
import { DeleteButton } from '@/components/DeleteButton';
import { deleteTutorAction } from '@/app/actions';

export default async function TutoresPage() {
  const tutors = await getTutors();
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Cadastros</div>
          <h2>Tutores</h2>
          <p>Clientes responsáveis pelos pets cadastrados.</p>
        </div>
        <Link href="/tutores/novo" className="btn btn-primary">
          <Icon name="plus" /> Novo tutor
        </Link>
      </div>
      {tutors.length === 0 ? (
        <div className="panel empty">
          Nenhum tutor cadastrado ainda. Clique em &quot;Novo tutor&quot; para adicionar o primeiro.
        </div>
      ) : (
        <div className="grid card-grid">
          {tutors.map((t) => (
            <article className="entity-card" key={t.id}>
              <div className="entity-head">
                <div className="entity-avatar">
                  {t.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <strong>{t.name}</strong>
                  <small>{t.email}</small>
                </div>
              </div>
              <div className="entity-meta">
                <div>
                  <span>Telefone</span>
                  <strong>{t.phone}</strong>
                </div>
                <div>
                  <span>Pets</span>
                  <strong>{t.petsCount}</strong>
                </div>
              </div>
              <div className="entity-actions">
                <DeleteButton action={deleteTutorAction.bind(null, t.id)} label={`o tutor ${t.name}`} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

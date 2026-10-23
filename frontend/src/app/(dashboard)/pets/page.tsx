import Link from 'next/link';
import { getPets } from '@/services/api';
import { Icon } from '@/components/Icon';
import { DeleteButton } from '@/components/DeleteButton';
import { deletePetAction } from '@/app/actions';

export default async function PetsPage() {
  const pets = await getPets();
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Cadastros</div>
          <h2>Pets</h2>
          <p>Visualize pets e seus dados de atendimento.</p>
        </div>
        <Link href="/pets/novo" className="btn btn-primary">
          <Icon name="plus" /> Novo pet
        </Link>
      </div>
      {pets.length === 0 ? (
        <div className="panel empty">
          Nenhum pet cadastrado ainda. Clique em &quot;Novo pet&quot; para adicionar o primeiro.
        </div>
      ) : (
        <div className="grid card-grid">
          {pets.map((p) => (
            <article className="entity-card" key={p.id}>
              <div className="entity-head">
                <div className="entity-avatar">
                  <Icon name="paw" />
                </div>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.species} · {p.breed}
                  </small>
                </div>
              </div>
              <div className="entity-meta">
                <div>
                  <span>Tutor</span>
                  <strong>{p.tutorName}</strong>
                </div>
                <div>
                  <span>Porte</span>
                  <strong>{p.size}</strong>
                </div>
              </div>
              <div className="entity-actions">
                <DeleteButton action={deletePetAction.bind(null, p.id)} label={`o pet ${p.name}`} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

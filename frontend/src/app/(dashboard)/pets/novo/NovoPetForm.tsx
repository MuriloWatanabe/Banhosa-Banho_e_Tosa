'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPetAction } from '@/app/actions';
import { PetSize, Tutor } from '@/types';
import { Icon } from '@/components/Icon';

const sizes: PetSize[] = ['Pequeno', 'Médio', 'Grande', 'Gigante'];

type Props = { tutors: Tutor[] };

export function NovoPetForm({ tutors }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'Cão' | 'Gato'>('Cão');
  const [breed, setBreed] = useState('');
  const [size, setSize] = useState<PetSize>('Médio');
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (tutors.length === 0) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="eyebrow">Cadastros</div>
            <h2>Novo pet</h2>
            <p>Preencha os dados do pet para adicioná-lo à base.</p>
          </div>
        </div>
        <div className="panel empty">
          Nenhum tutor cadastrado ainda. Cadastre um tutor antes de adicionar um pet.
          <div style={{ marginTop: 14 }}>
            <a href="/tutores/novo" className="btn btn-primary">
              <Icon name="plus" /> Novo tutor
            </a>
          </div>
        </div>
      </>
    );
  }

  const selectedTutor = tutors.find((item) => item.id === tutorId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await createPetAction({ name, species, breed, size, tutor_id: tutorId });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName('');
    setBreed('');
    setMessage('Pet cadastrado com sucesso.');
    router.refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Cadastros</div>
          <h2>Novo pet</h2>
          <p>Preencha os dados do pet para adicioná-lo à base.</p>
        </div>
      </div>
      <div
        className="grid content-grid"
        style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, .75fr)' }}
      >
        <form className="panel form-card" onSubmit={submit}>
          <div className="grid form-grid">
            <div className="form-field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Thor"
              />
            </div>
            <div className="form-field">
              <label htmlFor="species">Espécie</label>
              <select
                id="species"
                className="select"
                value={species}
                onChange={(e) => setSpecies(e.target.value as 'Cão' | 'Gato')}
              >
                <option value="Cão">Cão</option>
                <option value="Gato">Gato</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="breed">Raça</label>
              <input
                id="breed"
                className="input"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Ex.: Golden Retriever"
              />
            </div>
            <div className="form-field">
              <label htmlFor="size">Porte</label>
              <select
                id="size"
                className="select"
                value={size}
                onChange={(e) => setSize(e.target.value as PetSize)}
              >
                {sizes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="tutor">Tutor</label>
              <select
                id="tutor"
                className="select"
                value={tutorId}
                onChange={(e) => setTutorId(e.target.value)}
              >
                {tutors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error ? (
            <div
              className="notice"
              style={{ marginTop: 16, background: 'var(--danger-soft)', color: '#a73d3d' }}
            >
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="notice" style={{ marginTop: 16 }}>
              {message}
            </div>
          ) : null}
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <a href="/pets" className="btn btn-secondary">
              Cancelar
            </a>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <Icon name="check" /> {loading ? 'Salvando...' : 'Cadastrar pet'}
            </button>
          </div>
        </form>
        <aside className="summary-card">
          <div className="eyebrow" style={{ color: '#e2d5c4' }}>
            Resumo
          </div>
          <h3 style={{ margin: '7px 0 12px', fontSize: 20 }}>Novo cadastro</h3>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Esses dados serão usados para calcular a duração dos atendimentos com base no porte do pet.
          </p>
          <div className="summary-row">
            <span>Nome</span>
            <strong>{name || '—'}</strong>
          </div>
          <div className="summary-row">
            <span>Espécie</span>
            <strong>{species}</strong>
          </div>
          <div className="summary-row">
            <span>Porte</span>
            <strong>{size}</strong>
          </div>
          <div className="summary-row">
            <span>Tutor</span>
            <strong>{selectedTutor?.name ?? '—'}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

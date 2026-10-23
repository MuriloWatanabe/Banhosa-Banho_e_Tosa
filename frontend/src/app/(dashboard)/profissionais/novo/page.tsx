'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProfessionalAction } from '@/app/actions';
import { Icon } from '@/components/Icon';

export default function NovoProfissionalPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Tosador' | 'Veterinário'>('Tosador');
  const [specialty, setSpecialty] = useState('');
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await createProfessionalAction({ name, role, specialty, active });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName('');
    setRole('Tosador');
    setSpecialty('');
    setActive(true);
    setMessage('Profissional cadastrado com sucesso.');
    router.refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Cadastros</div>
          <h2>Novo profissional</h2>
          <p>Preencha os dados do profissional para adicioná-lo à equipe.</p>
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
                placeholder="Ex.: Ana Paula"
              />
            </div>
            <div className="form-field">
              <label htmlFor="role">Função</label>
              <select
                id="role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value as 'Tosador' | 'Veterinário')}
              >
                <option value="Tosador">Tosador</option>
                <option value="Veterinário">Veterinário</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="specialty">Especialidade</label>
              <input
                id="specialty"
                className="input"
                required
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex.: Tosa de raça"
              />
            </div>
            <div className="form-field">
              <label htmlFor="active">Status</label>
              <select
                id="active"
                className="select"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
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
            <a href="/profissionais" className="btn btn-secondary">
              Cancelar
            </a>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <Icon name="check" /> {loading ? 'Salvando...' : 'Cadastrar profissional'}
            </button>
          </div>
        </form>
        <aside className="summary-card">
          <div className="eyebrow" style={{ color: '#e2d5c4' }}>
            Resumo
          </div>
          <h3 style={{ margin: '7px 0 12px', fontSize: 20 }}>Novo cadastro</h3>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            O profissional cadastrado ficará disponível para ser selecionado nos agendamentos.
          </p>
          <div className="summary-row">
            <span>Nome</span>
            <strong>{name || '—'}</strong>
          </div>
          <div className="summary-row">
            <span>Função</span>
            <strong>{role}</strong>
          </div>
          <div className="summary-row">
            <span>Status</span>
            <strong>{active ? 'Ativo' : 'Inativo'}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

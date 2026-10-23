'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTutorAction } from '@/app/actions';
import { Icon } from '@/components/Icon';

export default function NovoTutorPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await createTutorAction({ name, phone, email });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName('');
    setPhone('');
    setEmail('');
    setMessage('Tutor cadastrado com sucesso.');
    router.refresh();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Cadastros</div>
          <h2>Novo tutor</h2>
          <p>Preencha os dados do tutor para adicioná-lo à base.</p>
        </div>
      </div>
      <div
        className="grid content-grid"
        style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, .75fr)' }}
      >
        <form className="panel form-card" onSubmit={submit}>
          <div className="grid form-grid">
            <div className="form-field">
              <label htmlFor="name">Nome completo</label>
              <input
                id="name"
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Marina Alves"
              />
            </div>
            <div className="form-field">
              <label htmlFor="phone">Telefone</label>
              <input
                id="phone"
                className="input"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex.: (48) 99911-2233"
              />
            </div>
            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex.: marina@email.com"
              />
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
            <a href="/tutores" className="btn btn-secondary">
              Cancelar
            </a>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <Icon name="check" /> {loading ? 'Salvando...' : 'Cadastrar tutor'}
            </button>
          </div>
        </form>
        <aside className="summary-card">
          <div className="eyebrow" style={{ color: '#e2d5c4' }}>
            Resumo
          </div>
          <h3 style={{ margin: '7px 0 12px', fontSize: 20 }}>Novo cadastro</h3>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            O tutor cadastrado ficará disponível para vincular pets e agendamentos.
          </p>
          <div className="summary-row">
            <span>Nome</span>
            <strong>{name || '—'}</strong>
          </div>
          <div className="summary-row">
            <span>Telefone</span>
            <strong>{phone || '—'}</strong>
          </div>
          <div className="summary-row">
            <span>E-mail</span>
            <strong>{email || '—'}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

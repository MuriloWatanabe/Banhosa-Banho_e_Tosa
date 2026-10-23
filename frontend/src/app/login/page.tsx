'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loginAction } from '@/app/actions';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginAction(username, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-paw">
          <Image src="/logo.png" alt="Banhosa" width={32} height={32} />
        </div>
        <h1>Banhosa</h1>
        <p>Entre com seu usuário e senha para acessar o sistema.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              className="input"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu usuário"
              autoComplete="username"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <div className="notice" style={{ background: 'var(--danger-soft)', color: '#a73d3d' }}>
              {error}
            </div>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

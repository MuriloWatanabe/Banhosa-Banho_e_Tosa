// @vitest-environment node

/**
 * @file Middleware / Proxy de Segurança
 * @description "Portão de entrada" do frontend. Decide o acesso a rotas protegidas 
 * e redireciona para login em caso de ausência de credenciais.
 * 
 * @type {Teste de Unidade / Middleware}
 * 
 * @notes
 * - SEGURANÇA: O proxy só confere a PRESENÇA do cookie `banhosa_token` (JWT httpOnly).
 *   A validação da assinatura/expiração acontece no backend, a cada chamada à API.
 * - AMBIENTE: Utilizamos `@vitest-environment node` (definido acima) pois 
 *   NextRequest/NextResponse baseiam-se em Web APIs disponíveis nativamente no Node, 
 *   não havendo necessidade de renderização DOM (jsdom).
 */

import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

// =============================================================================
// SETUP & UTILS
// =============================================================================

/**
 * Helper para criar uma requisição de teste.
 * Facilita a simulação de requisições autenticadas e não autenticadas.
 */
function buildRequest(pathname: string, { authenticated = false } = {}) {
    const url = `http://localhost:3000${pathname}`;
    const headers = authenticated ? { cookie: 'banhosa_token=header.payload.signature' } : undefined;
    return new NextRequest(url, { headers });
}

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('Middleware | proxy (Proteção de Rotas)', () => {
    
    it('deve permitir acesso a rotas públicas (/login) sem exigir autenticação', () => {
        // 1. Arrange
        const request = buildRequest('/login');

        // 2. Act
        const response = proxy(request);

        // 3. Assert
        // NextResponse.next() não define redirecionamento nem altera o status.
        expect(response.headers.get('location')).toBeNull();
        expect(response.status).toBe(200);
    });

    it('deve redirecionar para /login quando tentar acessar /dashboard sem cookie de sessão', () => {
        // 1. Arrange
        const request = buildRequest('/dashboard');

        // 2. Act
        const response = proxy(request);

        // 3. Assert
        expect(response.status).toBe(307); // Redirect padrão do Next.js
        
        const location = new URL(response.headers.get('location') ?? '');
        expect(location.pathname).toBe('/login');
        
        // O proxy guarda a rota original em ?from= para pós-login
        expect(location.searchParams.get('from')).toBe('/dashboard');
    });

    it('deve permitir acesso a /dashboard quando o cookie de sessão estiver presente e válido', () => {
        // 1. Arrange
        const request = buildRequest('/dashboard', { authenticated: true });

        // 2. Act
        const response = proxy(request);

        // 3. Assert
        expect(response.headers.get('location')).toBeNull();
        expect(response.status).toBe(200);
    });

    it('deve proteger sub-rotas (ex: /pets/novo) e não apenas a raiz do prefixo', () => {
        // 1. Arrange
        const request = buildRequest('/pets/novo');

        // 2. Act
        const response = proxy(request);

        // 3. Assert
        expect(response.status).toBe(307);
        const location = new URL(response.headers.get('location') ?? '');
        expect(location.searchParams.get('from')).toBe('/pets/novo');
    });

    it('deve redirecionar para /login se o cookie do token estiver vazio', () => {
        // 1. Arrange
        const request = new NextRequest('http://localhost:3000/tutores', {
            headers: { cookie: 'banhosa_token=' },
        });
        
        // 2. Act
        const response = proxy(request);

        // 3. Assert
        expect(response.status).toBe(307);
        expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/login');
    });
});

describe('Middleware | proxy (Cookie legado)', () => {
    it('deve ignorar o antigo cookie "banhosa_auth" do modo demonstração', () => {
        const request = new NextRequest('http://localhost:3000/agendamentos', {
            headers: { cookie: 'banhosa_auth=1' },
        });

        const response = proxy(request);

        expect(response.status).toBe(307);
    });
});

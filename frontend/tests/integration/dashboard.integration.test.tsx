/**
 * @file Integração: Dashboard e API Service
 * @description Garante a correta integração entre a camada de serviços (services/api.ts)
 * e a interface do DashboardPage.
 *
 * @type {Teste de Integração}
 *
 * @notes
 * - O `services/api.ts` REAL é exercitado: só a borda de rede (`fetch`) e o cookie da
 *   requisição (`next/headers`) são simulados. Assim validamos URL, header de
 *   autenticação e o mapeamento da resposta do FastAPI até a tela.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';
import type { DashboardData } from '@/types';

// =============================================================================
// SETUP & MOCKS
// =============================================================================

vi.mock('next/headers', () => ({
	cookies: async () => ({
		get: (name: string) => (name === 'banhosa_token' ? { name, value: 'jwt-de-teste' } : undefined),
	}),
}));

const fetchMock = vi.fn();

function mockDashboardResponse(data: DashboardData) {
	fetchMock.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
}

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// =============================================================================
// SUÍTE DE TESTES
// =============================================================================

describe('Integração: Dashboard exibindo dados da API', () => {
	it('chama GET /api/v1/dashboard enviando o JWT do cookie', async () => {
		mockDashboardResponse({
			totals: { appointmentsToday: 0, activeClients: 0, pets: 0, professionals: 0 },
			appointments: [],
		});

		render(await DashboardPage());

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toMatch(/\/api\/v1\/dashboard$/);
		expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-de-teste' });
	});

	it('exibe todos os totais zerados e a mensagem de agenda vazia quando não há nenhum dado', async () => {
		mockDashboardResponse({
			totals: { appointmentsToday: 0, activeClients: 0, pets: 0, professionals: 0 },
			appointments: [],
		});

		render(await DashboardPage());

		expect(screen.getByText('Agendamentos hoje').closest('.stat-card')).toHaveTextContent('0');
		expect(screen.getByText('Tutores ativos').closest('.stat-card')).toHaveTextContent('0');
		expect(screen.getByText('Pets cadastrados').closest('.stat-card')).toHaveTextContent('0');
		expect(screen.getByText('Profissionais').closest('.stat-card')).toHaveTextContent('0');
		expect(screen.getByText('Nenhum agendamento para hoje.')).toBeInTheDocument();
	});

	it('reflete os totais e os agendamentos do dia devolvidos pela API', async () => {
		mockDashboardResponse({
			totals: { appointmentsToday: 1, activeClients: 1, pets: 1, professionals: 1 },
			appointments: [
				{
					id: 'a-1',
					petId: 'p-1',
					professionalId: 'prof-1',
					petName: 'Mel',
					tutorName: 'Ana Souza',
					service: 'Banho',
					size: 'Pequeno',
					professionalName: 'Carla Dias',
					date: new Date().toISOString().slice(0, 10),
					startTime: '09:00:00',
					durationMinutes: 60,
					status: 'Pendente',
				},
			],
		});

		render(await DashboardPage());

		expect(screen.getByText('Agendamentos hoje').closest('.stat-card')).toHaveTextContent('1');
		expect(screen.getByText('Tutores ativos').closest('.stat-card')).toHaveTextContent('1');
		expect(screen.getByText('Pets cadastrados').closest('.stat-card')).toHaveTextContent('1');
		expect(screen.getByText('Profissionais').closest('.stat-card')).toHaveTextContent('1');

		expect(screen.getByText('Mel')).toBeInTheDocument();
		expect(screen.getByText('09:00')).toBeInTheDocument();
		expect(screen.queryByText('Nenhum agendamento para hoje.')).not.toBeInTheDocument();
	});

	it('propaga o erro da API (ex.: token expirado) em vez de renderizar dados vazios', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ detail: 'Token inválido ou expirado.' }), { status: 401 })
		);

		await expect(DashboardPage()).rejects.toThrow('Token inválido ou expirado.');
	});
});

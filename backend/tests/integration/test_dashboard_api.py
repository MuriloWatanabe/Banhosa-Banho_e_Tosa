"""
@file Integração API: Dashboard
@description Testes de integração para o endpoint do dashboard, validando a consolidação 
das métricas (cards de totais) e a listagem dos próximos atendimentos do dia.

@type {Teste de Integração / API}

@notes
- REGRAS DE CONSOLIDAÇÃO: Apenas profissionais ATIVOS devem ser contabilizados no total 
  do dashboard. Profissionais inativos são filtrados.
- FILTRO TEMPORAL: A contagem e a listagem de agendamentos consideram estritamente 
  a data atual (`date.today()`), refletindo o foco operacional diário do sistema.
"""

from datetime import date, datetime, time

from app.services import agendamento_service

# ==============================================================================
# UTILS & FIXTURES LOCAIS
# ==============================================================================
# Helpers para popular o banco de dados e preparar o estado antes da leitura do dashboard.


def _create_tutor(client, headers, email="maria@example.com"):
    return client.post(
        "/api/v1/tutores",
        json={"name": "Maria Silva", "phone": "47999990000", "email": email},
        headers=headers,
    ).json()


def _create_pet(client, headers, tutor_id):
    return client.post(
        "/api/v1/pets",
        json={
            "name": "Thor",
            "species": "Cão",
            "breed": "Golden Retriever",
            "size": "Pequeno",
            "tutor_id": tutor_id,
        },
        headers=headers,
    ).json()


def _create_professional(client, headers, name="Ana Tosadora", active=True):
    return client.post(
        "/api/v1/profissionais",
        json={"name": name, "role": "Tosador", "specialty": "Tosa em geral", "active": active},
        headers=headers,
    ).json()


# ==============================================================================
# SUÍTE DE TESTES
# ==============================================================================


def test_dashboard_counts_active_resources_and_today_appointments(client, auth_headers, monkeypatch):
    # 0. Congela o "agora" no início do dia: o agendamento das 09:00 de hoje
    # não pode ser rejeitado como "no passado" (M02) conforme a hora da execução.
    monkeypatch.setattr(agendamento_service, "_now", lambda: datetime.combine(date.today(), time(0, 0)))

    # 1. Arrange (Cadastra as entidades no banco, incluindo um profissional INATIVO)
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"])
    professional = _create_professional(client, auth_headers)
    _create_professional(client, auth_headers, name="Dr. Inativo", active=False)

    appointment = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet["id"],
            "profissional_id": professional["id"],
            "service": "Banho",
            "date": date.today().isoformat(),  # Garante que o agendamento cai na regra temporal de "hoje"
            "start_time": "09:00:00",
        },
        headers=auth_headers,
    )
    assert appointment.status_code == 201

    # 2. Act (Consulta o endpoint consolidado do dashboard)
    response = client.get("/api/v1/dashboard", headers=auth_headers)

    # 3. Assert (Valida os cálculos de métricas e os dados anexados na listagem)
    assert response.status_code == 200

    # O total de profissionais deve ser 1, validando a filtragem de "Dr. Inativo"
    assert response.json()["totals"] == {
        "appointmentsToday": 1,
        "activeClients": 1,
        "pets": 1,
        "professionals": 1,
    }

    # A listagem detalhada deve estar populada corretamente
    assert response.json()["appointments"][0]["petName"] == "Thor"


def test_dashboard_requires_authentication(client):
    # 1. Arrange & Act (Tentativa de acesso direto sem token)
    response = client.get("/api/v1/dashboard")

    # 2. Assert (Deve bloquear a exibição de dados sensíveis)
    assert response.status_code == 401

"""
@file Integração API: Endpoint /agendamentos
@description Testes de integração de ponta a ponta (router -> service -> repository -> SQLite) 
para o domínio de agendamentos. Valida regras de negócio, autenticação e fluxo de dados.

@type {Teste de Integração / API}

@notes
- FONTE DE VERDADE (RN-01): O cálculo de duração da consulta (ex: dobrar tempo para 
  pets grandes) é de responsabilidade do servidor. O backend é a validação canônica.
- CONFLITOS DE AGENDA: O sistema valida disponibilidade e impede sobreposição de horários 
  para um mesmo profissional, ignorando agendamentos com status "Cancelado".
- DEPENDÊNCIAS RELACIONAIS: A criação de um agendamento exige a pré-existência e validação
  de um Pet e um Profissional válidos no banco de dados.
- VALIDAÇÕES (M02): Datas/horários no passado, profissionais inativos e serviços
  incompatíveis com o papel do profissional são rejeitados com 422.
"""

from datetime import date, datetime, timedelta

from app.services import agendamento_service

# Sempre no futuro, para não esbarrar na validação de data no passado (M02).
FUTURE_DATE = (date.today() + timedelta(days=30)).isoformat()

# ==============================================================================
# UTILS & FIXTURES LOCAIS
# ==============================================================================
# Funções auxiliares para popular o banco de dados com as entidades necessárias
# antes de testar os agendamentos em si.

def _create_tutor(client, headers):
    resp = client.post(
        "/api/v1/tutores",
        json={"name": "Maria Silva", "phone": "47999990000", "email": "maria@example.com"},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()

def _create_pet(client, headers, tutor_id, size="Grande"):
    resp = client.post(
        "/api/v1/pets",
        json={
            "name": "Thor",
            "species": "Cão",
            "breed": "Golden Retriever",
            "size": size,
            "tutor_id": tutor_id,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()

def _create_professional(client, headers, name="Ana Tosadora", role="Tosador", active=True):
    resp = client.post(
        "/api/v1/profissionais",
        json={"name": name, "role": role, "specialty": "Atendimento geral", "active": active},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _create_appointment(client, headers, pet_id, professional_id, **overrides):
    payload = {
        "pet_id": pet_id,
        "profissional_id": professional_id,
        "service": "Banho",
        "date": FUTURE_DATE,
        "start_time": "09:00:00",
        **overrides,
    }
    return client.post("/api/v1/agendamentos", json=payload, headers=headers)


# ==============================================================================
# SUÍTE DE TESTES
# ==============================================================================

def test_create_appointment_calculates_rn01_duration_on_server(client, auth_headers):
    # 1. Arrange
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Grande")
    professional = _create_professional(client, auth_headers)

    # 2. Act
    resp = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet["id"],
            "profissional_id": professional["id"],
            "service": "Banho",
            "date": FUTURE_DATE,
            "start_time": "09:00:00",
            "status": "Pendente",
        },
        headers=auth_headers,
    )

    # 3. Assert
    assert resp.status_code == 201
    body = resp.json()
    
    # Banho = 60min base; porte Grande dobra (RN-01) => 120min
    assert body["durationMinutes"] == 120


def test_overlapping_appointment_is_rejected_with_409(client, auth_headers):
    # 1. Arrange (Prepara cenário com um agendamento já existente)
    tutor = _create_tutor(client, auth_headers)
    pet_pequeno = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    professional = _create_professional(client, auth_headers)

    first = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet_pequeno["id"],
            "profissional_id": professional["id"],
            "service": "Banho",  # 60min, porte Pequeno não dobra
            "date": FUTURE_DATE,
            "start_time": "09:00:00",
            "status": "Pendente",
        },
        headers=auth_headers,
    )
    assert first.status_code == 201  # Ocupa slot das 09:00 às 10:00

    # 2. Act (Tenta criar agendamento conflitante no mesmo horário)
    second = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet_pequeno["id"],
            "profissional_id": professional["id"],
            "service": "Tosa higiênica",
            "date": FUTURE_DATE,
            "start_time": "09:30:00",  # Sobrepõe o agendamento anterior
            "status": "Pendente",
        },
        headers=auth_headers,
    )
    
    # 3. Assert
    assert second.status_code == 409


def test_appointment_requires_authentication(client):
    # 1. Arrange & Act (Tentativa de acesso sem os headers de autenticação)
    resp = client.get("/api/v1/agendamentos")
    
    # 2. Assert
    assert resp.status_code == 401


def test_appointment_requires_existing_pet_and_professional(client, auth_headers):
    # 1. Arrange (Payload apontando para IDs não cadastrados no banco)
    payload = {
        "pet_id": "pet-inexistente",
        "profissional_id": "profissional-inexistente",
        "service": "Banho",
        "date": FUTURE_DATE,
        "start_time": "09:00:00",
    }

    # 2. Act
    response = client.post("/api/v1/agendamentos", json=payload, headers=auth_headers)

    # 3. Assert
    assert response.status_code == 404
    assert "Pet" in response.json()["detail"]


def test_appointments_can_be_listed_and_deleted(client, auth_headers):
    # 1. Arrange (Cria as entidades base e 1 agendamento)
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    professional = _create_professional(client, auth_headers, name="Dr. Paulo", role="Veterinário")

    response = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet["id"],
            "profissional_id": professional["id"],
            "service": "Consulta veterinária",
            "date": FUTURE_DATE,
            "start_time": "09:00:00",
        },
        headers=auth_headers,
    )
    appointment_id = response.json()["id"]

    # 2. Act & Assert (Valida Listagem)
    listed = client.get("/api/v1/agendamentos", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()[0]["service"] == "Consulta veterinária"

    # 3. Act & Assert (Valida Exclusão e nova listagem vazia)
    deleted = client.delete(f"/api/v1/agendamentos/{appointment_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/agendamentos", headers=auth_headers).json() == []


def test_cancelled_appointment_does_not_block_new_booking(client, auth_headers):
    # 1. Arrange (Cria um agendamento com status "Cancelado")
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    professional = _create_professional(client, auth_headers)
    
    payload = {
        "pet_id": pet["id"],
        "profissional_id": professional["id"],
        "service": "Banho",
        "date": FUTURE_DATE,
        "start_time": "09:00:00",
        "status": "Cancelado",
    }

    cancelled = client.post("/api/v1/agendamentos", json=payload, headers=auth_headers)
    assert cancelled.status_code == 201

    # 2. Act (Cria um novo agendamento "Confirmado" exatamente no mesmo slot)
    active = client.post(
        "/api/v1/agendamentos",
        json={**payload, "status": "Confirmado"},
        headers=auth_headers,
    )

    # 3. Assert (A sobreposição deve ser aceita pois a primeira reserva foi cancelada)
    assert active.status_code == 201


def test_appointment_outside_business_hours_returns_validation_error(client, auth_headers):
    # 1. Arrange
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Grande")
    professional = _create_professional(client, auth_headers)

    # 2. Act (Tentativa de agendamento às 18:00, fora do limite operacional)
    response = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet["id"],
            "profissional_id": professional["id"],
            "service": "Banho",
            "date": FUTURE_DATE,
            "start_time": "18:00:00",
        },
        headers=auth_headers,
    )

    # 3. Assert
    assert response.status_code == 422
    assert "Horário fora do funcionamento" in response.json()["detail"]


def test_delete_missing_appointment_returns_not_found(client, auth_headers):
    response = client.delete("/api/v1/agendamentos/id-inexistente", headers=auth_headers)

    assert response.status_code == 404


def test_invalid_appointment_payload_returns_validation_error(client, auth_headers):
    response = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": "pet-id",
            "profissional_id": "profissional-id",
            "service": "",
            "date": "data-invalida",
            "start_time": "horario-invalido",
        },
        headers=auth_headers,
    )

    assert response.status_code == 422


# ==============================================================================
# SUÍTE DE TESTES: VALIDAÇÕES DE CRIAÇÃO (M02)
# ==============================================================================

def test_appointment_in_past_date_is_rejected(client, auth_headers):
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    professional = _create_professional(client, auth_headers)

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    response = _create_appointment(client, auth_headers, pet["id"], professional["id"], date=yesterday)

    assert response.status_code == 422
    assert "passado" in response.json()["detail"]


def test_appointment_earlier_today_is_rejected(client, auth_headers, monkeypatch):
    # Congela o "agora" às 12:00 do dia do agendamento: 09:00 já passou, 13:00 não.
    frozen_now = datetime.fromisoformat(f"{FUTURE_DATE}T12:00:00")
    monkeypatch.setattr(agendamento_service, "_now", lambda: frozen_now)

    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    professional = _create_professional(client, auth_headers)

    past_slot = _create_appointment(
        client, auth_headers, pet["id"], professional["id"], start_time="09:00:00"
    )
    future_slot = _create_appointment(
        client, auth_headers, pet["id"], professional["id"], start_time="13:00:00"
    )

    assert past_slot.status_code == 422
    assert future_slot.status_code == 201


def test_appointment_with_inactive_professional_is_rejected(client, auth_headers):
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    professional = _create_professional(client, auth_headers, active=False)

    response = _create_appointment(client, auth_headers, pet["id"], professional["id"])

    assert response.status_code == 422
    assert "inativo" in response.json()["detail"]


def test_appointment_with_service_incompatible_with_role_is_rejected(client, auth_headers):
    tutor = _create_tutor(client, auth_headers)
    pet = _create_pet(client, auth_headers, tutor["id"], size="Pequeno")
    groomer = _create_professional(client, auth_headers)
    vet = _create_professional(client, auth_headers, name="Dr. Paulo", role="Veterinário")

    vet_service_with_groomer = _create_appointment(
        client, auth_headers, pet["id"], groomer["id"], service="Consulta veterinária"
    )
    grooming_with_vet = _create_appointment(client, auth_headers, pet["id"], vet["id"], service="Banho")

    assert vet_service_with_groomer.status_code == 422
    assert "Veterinário" in vet_service_with_groomer.json()["detail"]
    assert grooming_with_vet.status_code == 422
    assert "Tosador" in grooming_with_vet.json()["detail"]

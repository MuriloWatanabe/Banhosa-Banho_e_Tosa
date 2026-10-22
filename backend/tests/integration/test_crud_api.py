"""
@file Integração API: Fluxos CRUD (Tutores, Pets, Profissionais)
@description Testes de integração abrangendo a criação, listagem e exclusão das 
entidades base do sistema. Valida persistência, integridade relacional e segurança.

@type {Teste de Integração / API}

@notes
- INTEGRIDADE RELACIONAL: Entidades dependentes (ex: Pets) validam ativamente 
  suas chaves estrangeiras. Não é possível cadastrar um Pet sem um Tutor válido.
- REGRAS DE NEGÓCIO (Unicidade): Atributos críticos, como o e-mail do Tutor, 
  são validados contra duplicidade no banco de dados.
- SEGURANÇA: Todos os endpoints de manipulação e leitura exigem token de acesso (JWT).
- VÍNCULOS (M03): Excluir tutor, pet ou profissional com agendamentos retorna 409
  com mensagem clara, em vez de estourar a FK (ON DELETE RESTRICT) como erro 500.
"""

from datetime import date, timedelta

# ==============================================================================
# UTILS & FIXTURES LOCAIS
# ==============================================================================
# Funções geradoras de payload para evitar repetição de dicionários em cada teste.

def tutor_payload(email="maria@example.com"):
    return {"name": "Maria Silva", "phone": "47999990000", "email": email}


def pet_payload(tutor_id):
    return {
        "name": "Thor",
        "species": "Cão",
        "breed": "Golden Retriever",
        "size": "Grande",
        "tutor_id": tutor_id,
    }


def professional_payload(active=True):
    return {
        "name": "Ana Tosadora",
        "role": "Tosador",
        "specialty": "Tosa em geral",
        "active": active,
    }


# ==============================================================================
# SUÍTE DE TESTES: TUTORES
# ==============================================================================

def test_tutors_can_be_created_listed_and_deleted(client, auth_headers):
    # 1. Act & Assert (Criação)
    created = client.post("/api/v1/tutores", json=tutor_payload(), headers=auth_headers)
    assert created.status_code == 201
    tutor_id = created.json()["id"]

    # 2. Act & Assert (Listagem garante persistência)
    listed = client.get("/api/v1/tutores", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()[0]["email"] == "maria@example.com"

    # 3. Act & Assert (Exclusão limpa a base)
    deleted = client.delete(f"/api/v1/tutores/{tutor_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/tutores", headers=auth_headers).json() == []


def test_duplicate_tutor_email_returns_validation_error(client, auth_headers):
    # 1. Arrange (Cadastra o primeiro tutor)
    client.post("/api/v1/tutores", json=tutor_payload(), headers=auth_headers)

    # 2. Act (Tenta cadastrar um segundo tutor com o mesmo e-mail)
    response = client.post("/api/v1/tutores", json=tutor_payload(), headers=auth_headers)

    # 3. Assert (Deve ser bloqueado por validação de unicidade)
    assert response.status_code == 422
    assert "Já existe um tutor" in response.json()["detail"]


# ==============================================================================
# SUÍTE DE TESTES: PETS
# ==============================================================================

def test_pets_require_existing_tutor_and_can_be_deleted(client, auth_headers):
    # 1. Arrange, Act & Assert (Tentativa falha ao vincular tutor inexistente)
    missing_tutor = client.post(
        "/api/v1/pets",
        json=pet_payload("tutor-inexistente"),
        headers=auth_headers,
    )
    assert missing_tutor.status_code == 404

    # 2. Arrange (Cria tutor válido)
    tutor = client.post("/api/v1/tutores", json=tutor_payload(), headers=auth_headers).json()
    
    # 3. Act & Assert (Criação bem sucedida de pet)
    created = client.post("/api/v1/pets", json=pet_payload(tutor["id"]), headers=auth_headers)
    assert created.status_code == 201
    assert created.json()["tutorName"] == "Maria Silva"

    # 4. Act & Assert (Exclusão limpa a base)
    deleted = client.delete(f"/api/v1/pets/{created.json()['id']}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/pets", headers=auth_headers).json() == []


# ==============================================================================
# SUÍTE DE TESTES: PROFISSIONAIS
# ==============================================================================

def test_professionals_can_be_created_listed_and_deleted(client, auth_headers):
    # 1. Act & Assert (Criação)
    created = client.post(
        "/api/v1/profissionais",
        json=professional_payload(active=False),
        headers=auth_headers,
    )
    assert created.status_code == 201
    assert created.json()["active"] is False

    # 2. Act & Assert (Listagem)
    listed = client.get("/api/v1/profissionais", headers=auth_headers)
    assert listed.status_code == 200
    professional_id = listed.json()[0]["id"]

    # 3. Act & Assert (Exclusão)
    deleted = client.delete(f"/api/v1/profissionais/{professional_id}", headers=auth_headers)
    assert deleted.status_code == 204


# ==============================================================================
# SUÍTE DE TESTES: SEGURANÇA E TRATAMENTO DE ERROS GENÉRICOS
# ==============================================================================

def test_delete_missing_resources_returns_not_found(client, auth_headers):
    # Arrange, Act & Assert
    # Garante o comportamento idempotente/seguro de exclusão devolvendo 404
    for route in ("tutores", "pets", "profissionais"):
        response = client.delete(f"/api/v1/{route}/id-inexistente", headers=auth_headers)
        assert response.status_code == 404


def test_protected_crud_routes_require_authentication(client):
    # Arrange, Act & Assert
    # Itera testando requisições sem os headers de autenticação
    for route in ("tutores", "pets", "profissionais"):
        response = client.get(f"/api/v1/{route}")
        assert response.status_code == 401


def test_invalid_pet_and_professional_payloads_are_rejected(client, auth_headers):
    invalid_pet = client.post(
        "/api/v1/pets",
        json={
            "name": "Thor",
            "species": "Hamster",
            "breed": "Raça",
            "size": "Pequeno",
            "tutor_id": "tutor-id",
        },
        headers=auth_headers,
    )
    invalid_professional = client.post(
        "/api/v1/profissionais",
        json={"name": "Ana", "role": "Adestrador", "active": True},
        headers=auth_headers,
    )

    assert invalid_pet.status_code == 422
    assert invalid_professional.status_code == 422


# ==============================================================================
# SUÍTE DE TESTES: EDIÇÃO (M05)
# ==============================================================================

def test_tutor_can_be_updated_and_email_must_stay_unique(client, auth_headers):
    tutor = client.post("/api/v1/tutores", json=tutor_payload(), headers=auth_headers).json()
    client.post("/api/v1/tutores", json=tutor_payload("joao@example.com"), headers=auth_headers)

    # Manter o próprio e-mail é permitido
    updated = client.put(
        f"/api/v1/tutores/{tutor['id']}",
        json={"name": "Maria Souza", "phone": "47988887777", "email": "maria@example.com"},
        headers=auth_headers,
    )
    # Assumir o e-mail de outro tutor não é
    duplicated = client.put(
        f"/api/v1/tutores/{tutor['id']}",
        json={"name": "Maria Souza", "phone": "47988887777", "email": "joao@example.com"},
        headers=auth_headers,
    )

    assert updated.status_code == 200
    assert updated.json()["name"] == "Maria Souza"
    assert updated.json()["phone"] == "47988887777"
    assert duplicated.status_code == 422


def test_pet_can_be_updated_and_moved_to_another_tutor(client, auth_headers):
    maria = client.post("/api/v1/tutores", json=tutor_payload(), headers=auth_headers).json()
    joao_payload = {**tutor_payload("joao@example.com"), "name": "João Lima"}
    joao = client.post("/api/v1/tutores", json=joao_payload, headers=auth_headers).json()
    pet = client.post("/api/v1/pets", json=pet_payload(maria["id"]), headers=auth_headers).json()

    response = client.put(
        f"/api/v1/pets/{pet['id']}",
        json={**pet_payload(joao["id"]), "name": "Thor II", "size": "Médio"},
        headers=auth_headers,
    )
    missing_tutor = client.put(
        f"/api/v1/pets/{pet['id']}", json=pet_payload("tutor-inexistente"), headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Thor II"
    assert response.json()["size"] == "Médio"
    assert response.json()["tutorName"] == "João Lima"
    assert missing_tutor.status_code == 404


def test_professional_can_be_updated_and_deactivated(client, auth_headers):
    professional = client.post(
        "/api/v1/profissionais", json=professional_payload(), headers=auth_headers
    ).json()

    response = client.put(
        f"/api/v1/profissionais/{professional['id']}",
        json={**professional_payload(active=False), "specialty": "Tosa na tesoura"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["active"] is False
    assert response.json()["specialty"] == "Tosa na tesoura"


def test_update_missing_resources_returns_not_found(client, auth_headers):
    payloads = {
        "tutores": tutor_payload(),
        "pets": pet_payload("tutor-id"),
        "profissionais": professional_payload(),
    }
    for route, payload in payloads.items():
        response = client.put(f"/api/v1/{route}/id-inexistente", json=payload, headers=auth_headers)
        assert response.status_code == 404


# ==============================================================================
# SUÍTE DE TESTES: EXCLUSÃO COM VÍNCULOS (M03)
# ==============================================================================

def _create_linked_appointment(client, headers):
    """Cria tutor -> pet -> profissional -> agendamento e devolve os registros."""
    tutor = client.post("/api/v1/tutores", json=tutor_payload(), headers=headers).json()
    pet = client.post("/api/v1/pets", json=pet_payload(tutor["id"]), headers=headers).json()
    professional = client.post("/api/v1/profissionais", json=professional_payload(), headers=headers).json()
    appointment = client.post(
        "/api/v1/agendamentos",
        json={
            "pet_id": pet["id"],
            "profissional_id": professional["id"],
            "service": "Banho",
            "date": (date.today() + timedelta(days=30)).isoformat(),
            "start_time": "09:00:00",
        },
        headers=headers,
    )
    assert appointment.status_code == 201
    return tutor, pet, professional, appointment.json()


def test_deleting_resources_with_appointments_returns_409(client, auth_headers):
    tutor, pet, professional, _ = _create_linked_appointment(client, auth_headers)

    for route, resource_id in (
        ("tutores", tutor["id"]),
        ("pets", pet["id"]),
        ("profissionais", professional["id"]),
    ):
        response = client.delete(f"/api/v1/{route}/{resource_id}", headers=auth_headers)
        assert response.status_code == 409
        assert "agendamentos vinculados" in response.json()["detail"]

    # Nada foi removido
    assert len(client.get("/api/v1/tutores", headers=auth_headers).json()) == 1
    assert len(client.get("/api/v1/pets", headers=auth_headers).json()) == 1
    assert len(client.get("/api/v1/profissionais", headers=auth_headers).json()) == 1


def test_resources_can_be_deleted_after_their_appointments(client, auth_headers):
    tutor, pet, professional, appointment = _create_linked_appointment(client, auth_headers)

    client.delete(f"/api/v1/agendamentos/{appointment['id']}", headers=auth_headers)

    deleted_professional = client.delete(f"/api/v1/profissionais/{professional['id']}", headers=auth_headers)
    deleted_tutor = client.delete(f"/api/v1/tutores/{tutor['id']}", headers=auth_headers)

    assert deleted_professional.status_code == 204
    assert deleted_tutor.status_code == 204
    # O pet foi removido em cascata junto com o tutor
    assert client.get("/api/v1/pets", headers=auth_headers).json() == []

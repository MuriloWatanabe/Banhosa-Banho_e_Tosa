"""
@file Configuração de Fixtures (Pytest)
@description Define os recursos compartilhados (fixtures) para a suíte de testes 
da API, incluindo banco de dados em memória, cliente HTTP de teste e utilitários de autenticação.

@type {Test Setup / Fixtures}

@notes
- BANCO DE DADOS: Utilizamos SQLite em memória via dependency override (`get_db`) 
  no lugar do PostgreSQL real. Isso mantém a suíte rápida e livre de infraestrutura 
  externa (adequado para escopos menores/acadêmicos).
- ARQUITETURA: As regras de negócio (services) são agnósticas de banco e possuem 
  seus próprios testes unitários puros, independentes destas fixtures.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models import Usuario  # noqa: F401

# ==============================================================================
# FIXTURES DE BANCO DE DADOS
# ==============================================================================


@pytest.fixture()
def db_session():
    """
    Gera uma sessão de banco de dados SQLite em memória para testes isolados.
    Executa a criação das tabelas e garante o fechamento da conexão (teardown).
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ==============================================================================
# FIXTURES DE CLIENTE HTTP (FASTAPI)
# ==============================================================================


@pytest.fixture()
def client(db_session):
    """
    Fornece um TestClient do FastAPI interceptando a injeção de dependência.
    Substitui a conexão de banco real (get_db) pela sessão em memória isolada
    criada na fixture `db_session`.
    """

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    # Limpeza para evitar vazamento do override para outras suítes
    app.dependency_overrides.clear()


# ==============================================================================
# FIXTURES DE AUTENTICAÇÃO
# ==============================================================================


@pytest.fixture()
def auth_headers(db_session, client):
    """
    Cria um usuário de teste, realiza a autenticação na API e retorna
    os headers Authorization (Bearer token) prontos para uso nas requisições.
    """
    # 1. Arrange: Cria usuário admin para os testes
    usuario = Usuario(username="teste.adm", hashed_password=hash_password("senha123"), active=True)
    db_session.add(usuario)
    db_session.commit()

    # 2. Act: Simula o login para obter o JWT
    response = client.post("/api/v1/auth/login", json={"username": "teste.adm", "password": "senha123"})
    token = response.json()["access_token"]

    # 3. Retorno: Header autenticado
    return {"Authorization": f"Bearer {token}"}

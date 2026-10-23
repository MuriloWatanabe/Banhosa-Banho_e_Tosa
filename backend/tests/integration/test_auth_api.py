"""
@file Integração API: Health Check & Autenticação
@description Testes de integração para os endpoints públicos de verificação de saúde (health) 
e fluxos de segurança (login, validação de token JWT e bloqueio de usuários inativos).

@type {Teste de Integração / API}

@notes
- SEGURANÇA: O endpoint de login é a porta de entrada para geração de tokens JWT. 
  Testamos explicitamente as falhas de credencial e a trava de segurança para usuários inativos.
- DEPENDÊNCIA ESTADUAL: Testes de autenticação requerem a inserção prévia de um usuário 
  no banco de dados em memória para simular o comportamento de verificação real de hash de senha.
"""

from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models import Usuario

# ==============================================================================
# SUÍTE DE TESTES
# ==============================================================================


def test_health_check(client):
    # 1. Arrange & Act (Requisição simples sem dependências)
    response = client.get("/health")

    # 2. Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_returns_token_and_me_returns_current_user(client, db_session):
    # 1. Arrange (Cria um usuário ativo no banco)
    db_session.add(Usuario(username="admin", hashed_password=hash_password("senha"), active=True))
    db_session.commit()

    # 2. Act (Realiza o login para obter o token)
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "senha"})
    assert login.status_code == 200

    token = login.json()["access_token"]

    # 3. Act (Utiliza o token gerado para acessar a rota protegida `/me`)
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    # 4. Assert (Valida se a rota `/me` reconheceu o usuário do token)
    assert me.status_code == 200
    assert me.json() == {"username": "admin", "active": True}


def test_login_rejects_invalid_password(client, db_session):
    # 1. Arrange (Cria um usuário válido no banco)
    db_session.add(Usuario(username="admin", hashed_password=hash_password("senha"), active=True))
    db_session.commit()

    # 2. Act (Tenta logar com senha divergente)
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "errada"})

    # 3. Assert
    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha incorretos."


def test_login_rejects_inactive_user(client, db_session):
    # 1. Arrange (Cria um usuário INATIVO no banco)
    db_session.add(Usuario(username="admin", hashed_password=hash_password("senha"), active=False))
    db_session.commit()

    # 2. Act (Tenta logar com credenciais corretas, porém conta inativa)
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "senha"})

    # 3. Assert
    assert response.status_code == 403
    assert response.json()["detail"] == "Usuário desativado. Contate um administrador."


def test_protected_route_rejects_invalid_token(client):
    # 1. Arrange & Act (Tenta acessar rota protegida com formato JWT inválido/falso)
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer token-invalido"},
    )

    # 2. Assert
    assert response.status_code == 401


def test_protected_route_rejects_token_without_subject(client):
    token = jwt.encode({}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


def test_protected_route_rejects_inactive_user_token(client, db_session):
    db_session.add(Usuario(username="inativo", hashed_password=hash_password("senha"), active=False))
    db_session.commit()
    token = create_access_token("inativo")

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401

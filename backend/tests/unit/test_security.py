"""
@file Unitários: Segurança e JWT
@description Valida as funções criptográficas da aplicação, incluindo o 
hashing de senhas e o ciclo de vida (criação, decodificação e expiração) 
dos tokens JWT.

@type {Teste de Unidade}

@notes
- SEGURANÇA (Hashing): Senhas nunca devem ser expostas em texto plano. O teste 
  garante que o hash gerado seja diferente da string original e validável.
- INTEGRIDADE (JWT): Tokens expirados ou malformados não devem levantar erros fatais 
  (500), mas sim serem tratados graciosamente retornando `None`, o que aciona o 401 
  na camada de rotas.
"""

from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password

# ============================================================================
# SUÍTE DE TESTES: HASHING DE SENHAS
# ============================================================================


def test_password_hash_can_be_verified_without_exposing_plaintext() -> None:
    # 1. Arrange & Act (Gera o hash a partir de uma senha em texto plano)
    hashed_password = hash_password("senha-segura")

    # 2. Assert (Valida se foi criptografada corretamente e se a verificação funciona)
    assert hashed_password != "senha-segura"
    assert verify_password("senha-segura", hashed_password)
    assert not verify_password("senha-errada", hashed_password)


# ============================================================================
# SUÍTE DE TESTES: TOKENS JWT
# ============================================================================


def test_access_token_contains_subject_and_extra_claims() -> None:
    # 1. Arrange & Act (Cria o token com dados adicionais customizados)
    token = create_access_token("admin", {"scope": "admin"})

    # 2. Act (Decodifica o token gerado)
    payload = decode_access_token(token)

    # 3. Assert (Valida a presença das claims obrigatórias e customizadas)
    assert payload is not None
    assert payload["sub"] == "admin"
    assert payload["scope"] == "admin"
    assert payload["exp"] > datetime.now(UTC).timestamp()


def test_decode_access_token_returns_none_for_malformed_token() -> None:
    # Arrange, Act & Assert
    # Garante que um token estruturalmente inválido seja rejeitado
    # de forma segura (retornando None em vez de crashar a aplicação).
    assert decode_access_token("token-malformado") is None


def test_decode_access_token_returns_none_for_expired_token() -> None:
    # 1. Arrange (Forja manualmente um token com a data de expiração no passado)
    expired_token = jwt.encode(
        {"sub": "admin", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    # 2. Act & Assert
    # O decodificador deve verificar o tempo de vida (claim "exp")
    # e rejeitar o acesso devolvendo None.
    assert decode_access_token(expired_token) is None

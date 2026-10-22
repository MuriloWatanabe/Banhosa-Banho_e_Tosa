from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    InactiveUserError,
    InvalidCredentialsError,
    NotFoundError,
    ValidationError,
)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Exception handlers -----------------------------------------------------
# Traduzem exceções de domínio (levantadas pela camada `services`, sem
# nenhuma dependência do FastAPI) para respostas HTTP com o status
# correto. Isso evita try/except repetido em cada router e mantém a
# camada de serviço 100% testável de forma isolada.

def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": message})


@app.exception_handler(NotFoundError)
async def not_found_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
    return _error_response(status.HTTP_404_NOT_FOUND, str(exc))


@app.exception_handler(ConflictError)
async def conflict_handler(_request: Request, exc: ConflictError) -> JSONResponse:
    return _error_response(status.HTTP_409_CONFLICT, str(exc))


@app.exception_handler(ValidationError)
async def validation_handler(_request: Request, exc: ValidationError) -> JSONResponse:
    return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))


@app.exception_handler(InvalidCredentialsError)
async def invalid_credentials_handler(_request: Request, exc: InvalidCredentialsError) -> JSONResponse:
    return _error_response(status.HTTP_401_UNAUTHORIZED, str(exc))


@app.exception_handler(InactiveUserError)
async def inactive_user_handler(_request: Request, exc: InactiveUserError) -> JSONResponse:
    return _error_response(status.HTTP_403_FORBIDDEN, str(exc))


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, _exc: IntegrityError) -> JSONResponse:
    # Rede de segurança: os services já checam vínculos e conflitos antes de
    # gravar, mas qualquer violação de constraint que escape (FK RESTRICT,
    # unique, etc.) vira 409 com mensagem clara em vez de erro 500.
    return _error_response(
        status.HTTP_409_CONFLICT,
        "Operação não permitida: viola uma restrição de integridade dos dados "
        "(ex.: registro com vínculos).",
    )


# --- Rotas -------------------------------------------------------------------

@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)

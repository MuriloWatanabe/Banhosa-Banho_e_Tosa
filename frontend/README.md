# Banhosa Baso — Front-end

Frontend do MVP do sistema de banho, tosa e atendimento veterinário, seguindo a especificação do projeto.

## Stack

- Next.js 16 (App Router)
- React 19
- Node.js >= 20.9
- TypeScript com `strict: true`
- CSS próprio, sem biblioteca visual externa

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validação

```bash
npm run typecheck   # gera os tipos de rota (next typegen) e roda o tsc
npm run lint
npm run format:check # verifica a formatação com Prettier
npm run test        # Vitest (npm run test:coverage para cobertura)
npm run build
```

Ao executar `npm install`, o Husky configura o hook de pre-commit. O lint-staged
aplica ESLint e Prettier somente aos arquivos adicionados ao commit.

## Integração com FastAPI

**Já integrado.** `src/services/api.ts` chama a API FastAPI de verdade (via
`fetch`, rodando no servidor Next.js — Server Components / Server Actions),
em vez do mock em memória original.

### Configuração

```bash
cp .env.local.example .env.local
# ajuste API_URL se o backend não estiver em http://localhost:8000
```

### Autenticação

O login (`/login`) chama `POST /api/v1/auth/login` no backend e guarda o JWT
retornado num cookie `banhosa_token` **httpOnly** (não acessível via
JavaScript no navegador — só o servidor Next.js lê e envia esse token como
`Authorization: Bearer <token>` nas chamadas à API). O `proxy.ts` (antigo `middleware.ts`, renomeado no Next.js 16) checa
a presença desse cookie para proteger as rotas do dashboard; a validação de
verdade do token acontece a cada chamada à API (que responde 401 se
inválido/expirado).

Use as credenciais do seed do backend: `banhosa.adm` / `banhosa123`.

### O que mudou em relação ao mock original

- `createPet` agora envia `tutor_id` (não mais `tutorName`) — o formulário
  de novo pet passou a usar o `<select>` com o `id` do tutor.
- `createAppointment` agora envia `pet_id` e `profissional_id` (não mais
  `petName`/`professionalName`/`size`/`durationMinutes`) — a API recalcula
  a duração (RN-01) e valida a disponibilidade do profissional (RN-02) no
  servidor. A duração mostrada no formulário antes de salvar é só uma
  estimativa de UI.
- Toda Server Action de criação/remoção agora retorna `{ error?: string }`
  em vez de lançar exceção silenciosamente — os formulários exibem esse
  erro (ex.: `409 Conflito de horário: ...` vindo da RN-02, ou e-mail de
  tutor duplicado).
- Logout passa por uma Server Action (`logoutAction`), já que o cookie do
  token é `httpOnly` e não pode mais ser apagado via `document.cookie`.

### Edição e status de agendamentos

- `/agendamentos/{id}/editar` — remarca o atendimento (`PUT /agendamentos/{id}`).
  O formulário é o mesmo da criação (`AgendamentoForm`), pré-preenchido.
- `/agendamentos/{id}/status` — confirma, conclui ou cancela
  (`PATCH /agendamentos/{id}/status`).

O frontend **não** replica regras de negócio: a duração (RN-01) não é mais
estimada no cliente — a tela mostra o `durationMinutes` devolvido pela API —
e as transições de status permitidas são decididas pelo backend. Erros como
conflito de horário ou transição inválida são exibidos com a mensagem da API.

### Rodando os dois juntos

```bash
# terminal 1 — backend
cd backend && uvicorn app.main:app --reload --port 8000

# terminal 2 — frontend
cd frontend && npm run dev
```

Abra `http://localhost:3000` — vai redirecionar para `/login`.

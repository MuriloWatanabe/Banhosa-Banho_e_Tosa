
# 🐾 Banhosa Baso e Tosa

> Documento oficial de padronização técnica e fluxo de trabalho do projeto.
> Disciplina: **Manutenção e Melhoria de Software**

## 📌 Sobre o Projeto

**Contexto:** um pet shop precisa otimizar a agenda de banho, tosa e atendimento veterinário, hoje prejudicada por **atrasos constantes** e **agendamentos sobrepostos** nos tosadores principais.

**Escopo funcional (MVP):**

- Cadastro de tutores, pets e profissionais.
- Agendamento de serviços com seleção de **porte do animal** e **tipo de tosa**.

**Regra de Negócio crítica (RN-01):**

> Cães de porte **Grande** ou **Gigante** devem alocar um tempo de agenda **equivalente ao dobro** do tempo de um cão de porte **Pequeno**.

Essa regra impacta diretamente o motor de cálculo de disponibilidade de horários e deve ser tratada como regra de domínio (não como detalhe de UI), com cobertura de testes obrigatória em qualquer PR que a envolva.

**Evoluções previstas (backlog futuro):**

- Envio de fotos do pet pronto durante o dia (notificação ao tutor).
- Controle de estoque de shampoos e perfumes consumidos por atendimento.

## 👥 Equipe e Responsabilidades

| Papel                             | Responsabilidade principal                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Product Owner (PO)**            | Prioriza o backlog, valida entregas sob a ótica de negócio, é o "dono" do critério de aceite.                          |
| **Engenheiro de Requisitos**      | Detalha e formaliza histórias de usuário e regras de negócio (ex: RN-01), mantém a rastreabilidade requisito → código. |
| **Desenvolvedor Front-end**       | Implementa a interface em React/Next.js, consome a API, garante usabilidade e responsividade.                          |
| **Desenvolvedor Back-end**        | Implementa regras de negócio, API REST em FastAPI e modelagem de dados em PostgreSQL.                                  |
| **QA (Quality Assurance)**        | Escreve e executa casos de teste, valida PRs sob a ótica de qualidade, garante cobertura de regras críticas.           |
| **DevOps / Eng. de Configuração** | Mantém CI/CD, ambientes, versionamento de infraestrutura e a integridade das branches `main`/`dev`.                    |

> Toda Pull Request precisa de **pelo menos 1 aprovação** de alguém fora da função de quem escreveu o código.

## ☭ Stack Tecnológica

- **Front-end:** React + Next.js + TypeScript
- **Back-end:** Python + FastAPI + Alembic
- **Banco de Dados:** PostgreSQL
- **Versionamento:** Git / GitHub
- **Testes:** Front-end com Vitest / Back-end com PyTest
- **CI/CD:** GitHub Actions

## 🌲 Estrutura do Projeto

```text
banho_tosa/
├── README.md                   # Visão geral do projeto
│
├── backend/                    # API em Python com FastAPI, regras de negócio e banco
│   ├── app/                    # Código principal da aplicação backend
│   │   ├── api/                # Endpoints da API: auth, tutores, pets, profissionais, agendamentos e dashboard
│   │   ├── core/               # Configurações, banco, segurança e exceções
│   │   ├── models/             # Modelos do banco de dados
│   │   ├── repositories/       # Acesso e persistência dos dados
│   │   ├── schemas/            # Schemas de validação e serialização
│   │   ├── services/           # Lógica de negócio da aplicação
│   │   ├── tests/              # Testes automatizados do backend
│   │   ├── main.py             # Aplicação FastAPI
│   │   └── seed.py             # Seed inicial de dados
│   ├── alembic/                # Migrações do banco de dados
│   ├── Dockerfile              # Dockerfile do backend
│   ├── requirements.txt        # Dependências do backend
│   ├── pyproject.toml          # Configuração do projeto Python
│   ├── alembic.ini             # Configuração do Alembic
│   └── README.md               # Instruções do backend
│
├── frontend/                   # Aplicação web em Next.js + TypeScript
│   ├── src/                    # Código principal do frontend
│   │   ├── app/                # Rotas e páginas do app (login, dashboard, CRUDs)
│   │   ├── components/         # Componentes reutilizáveis da interface
│   │   ├── services/           # Comunicação com a API backend
│   │   ├── types/              # Tipos TypeScript compartilhados
│   │   ├── utils/              # Funções auxiliares e utilitários
│   │   ├── proxy.ts            # Proteção de rotas autenticadas (substitui o middleware.ts no Next.js 16)
│   │   └── app/page.tsx        # Página inicial
│   ├── public/                 # Arquivos estáticos públicos
│   ├── tests/                  # Testes do frontend
│   ├── package.json            # Dependências e scripts do frontend
│   ├── next.config.mjs         # Configuração do Next.js
│   ├── vitest.config.ts        # Configuração do Vitest
│   ├── dockerfile              # Dockerfile do frontend
│   └── README.md               # Instruções do frontend
├── docker-compose.yml          # Arquivo para executar o projeto
```

## 🔚 Endpoints

### Endpoints Principais Back-end

| Método     | Rota                                | Descrição                                          |
| ---------- | ----------------------------------- | -------------------------------------------------- |
| POST       | `/api/v1/auth/login`                | Login (Retorna JWT)                                |
| GET        | `/api/v1/dashboard`                 | Totais + Agendamentos do Dia                       |
| GET/POST   | `/api/v1/tutores`                   | Listar e Criar Tutores                             |
| PUT/DELETE | `/api/v1/tutores/{id}`              | Editar e Remover Tutores                           |
| GET/POST   | `/api/v1/pets`                      | Listar e Criar Pets                                |
| PUT/DELETE | `/api/v1/pets/{id}`                 | Editar e Remover Pets                              |
| GET/POST   | `/api/v1/profissionais`             | Listar e Criar Profissionais                       |
| PUT/DELETE | `/api/v1/profissionais/{id}`        | Editar (inclusive inativar) e Remover Profissionais |
| GET/POST   | `/api/v1/agendamentos`              | Listar e Criar Agendamentos                        |
| PUT/DELETE | `/api/v1/agendamentos/{id}`         | Remarcar e Remover Agendamentos                    |
| PATCH      | `/api/v1/agendamentos/{id}/status`  | Confirmar, Concluir ou Cancelar um Agendamento     |

> Todas as rotas acima (exceto `/auth/login`) exigem `Authorization: Bearer <token>`.
>
> - Excluir tutor, pet ou profissional que possua agendamentos retorna **409** — para preservar o histórico, prefira inativar o profissional.
> - Transições de status permitidas: `Pendente → Confirmado | Concluído | Cancelado` e `Confirmado → Concluído | Cancelado`. `Concluído` e `Cancelado` são finais (o agendamento deixa de ser editável).

### Endpoints Principais Front-end

| Método | Rota                  | Descrição                                                 |
| ------ | --------------------- | --------------------------------------------------------- |
| GET    | `/`                   | Redireciona para `/login`                                 |
| GET    | `/login`              | Tela de autenticação                                      |
| GET    | `/dashboard`          | Dashboard principal com indicadores e agendamentos do dia |
| GET    | `/agendamentos`       | Listagem da agenda                                        |
| GET    | `/agendamentos/novo`  | Formulário de criação de agendamento                      |
| GET    | `/agendamentos/{id}/editar` | Edição/remarcação de agendamento                    |
| GET    | `/agendamentos/{id}/status` | Mudança de status (confirmar, concluir, cancelar)   |
| GET    | `/pets`               | Listagem de pets                                          |
| GET    | `/pets/novo`          | Cadastro de novo pet                                      |
| GET    | `/tutores`            | Listagem de tutores                                       |
| GET    | `/tutores/novo`       | Cadastro de novo tutor                                    |
| GET    | `/profissionais`      | Listagem de profissionais                                 |
| GET    | `/profissionais/novo` | Cadastro de novo profissional                             |

> O frontend consome a API do backend em `/api/v1`, conforme implementado em `src/services/api.ts`.
> No frontend, as rotas protegidas são validadas pelo proxy em `src/proxy.ts` (convenção do Next.js 16, que substituiu o `middleware.ts`) e redirecionam para `/login` quando o usuário não está autenticado.
>
> Regras de negócio (duração RN-01, conflitos RN-02, transições de status) ficam **somente no backend**: o frontend envia a intenção e exibe o resultado ou o erro devolvido pela API.

## 💻 Setup — Ambiente de Desenvolvimento

### 1. Pré-requisitos

- Git
- Docker e Docker Compose

### 2. Clonar o projeto

```bash
git clone https://github.com/Rubinho01/Banhosa-Banho_e_Tosa
cd Banhosa-Banho_e_Tosa
```

## Execução do projeto


```bash
# 1) Na raiz do projeto "banhosa-completo/"
$ docker compose up

# 2) Para executar a criação do usuário teste para desenvolvimento:
$ docker compose exec backend python -m app.seed # Ainda em "banhosa-completo/"
```

Abra `http://localhost:3000` — login com `banhosa.adm` / `banhosa123`.

## Estado atual

- **Backend**: API completa, arquitetura em camadas (`api/schemas/models/
  services/repositories/core/tests`), RN-01 e RN-02 implementadas e
  testadas via `pytest`, autenticação JWT, migrations via Alembic.
- **Frontend**: já integrado à API real (não usa mais o mock em memória).
  Login, CRUD de tutores/pets/profissionais e criação de agendamentos
  conversam de fato com o backend.
- **Pendente de validação**: rodar testes para correção de bugs
## Estratégia de Branches

> Adotamos uma versão **simplificada do GitFlow**, com duas branches permanentes e branches de apoio de vida curta.
> O objetivo é manter simplicidade suficiente para um time de 6 pessoas, sem abrir mão de segurança em produção.

### Branches Permanentes

| Branch | Propósito                                                                                   | Regras                                                                         |
| ------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `main` | Reflete **exatamente** o que está em produção/homologação. Código aqui é estável e testado. | Protegida. Só recebe merge vindo de `dev` ou `hotfix/*`. Nenhum commit direto. |
| `dev`  | Branch de integração contínua. Reflete o **próximo release**.                               | Protegida. Só recebe merge via Pull Request. Nenhum commit direto.             |

### Branches de apoio (Temporárias)

| Tipo                     | Nasce de | Vai para           | Quando usar                                                                             |
| ------------------------ | -------- | ------------------ | --------------------------------------------------------------------------------------- |
| `feature/*`              | `dev`    | `dev`              | Nova funcionalidade ou história do backlog.                                             |
| `bugfix/*`               | `dev`    | `dev`              | Correção de bug encontrado **em desenvolvimento/homologação** (ainda não em produção).  |
| `hotfix/*`               | `main`   | `main` **e** `dev` | Correção **urgente** de um bug em produção.                                             |
| `release/*` _(opcional)_ | `dev`    | `main` **e** `dev` | Estabilização de uma versão antes de publicar (congelamento de escopo, ajustes finais). |

## Padrões e Convenções

### Mensagens de Commit — Conventional Commits

Todos os commits devem seguir o padrão **[Conventional Commits](https://www.conventionalcommits.org/pt-br/)**:

```text
<tipo>(<escopo>): <descrição curta no imperativo>
[corpo explicando o "porquê" da mudança]
[rodapé opcional: referências a issues, breaking changes]
```

**Tipos permitidos:**

| Tipo       | Uso                                                                          |
| ---------- | ---------------------------------------------------------------------------- |
| `feat`     | Nova funcionalidade para o usuário.                                          |
| `fix`      | Correção de bug.                                                             |
| `docs`     | Alteração apenas em documentação.                                            |
| `style`    | Formatação, ponto e vírgula, espaços — sem alteração de lógica.              |
| `refactor` | Refatoração de código que não corrige bug nem adiciona feature.              |
| `test`     | Adição ou correção de testes.                                                |
| `chore`    | Tarefas de build, dependências, configs — sem impacto em código de produção. |
| `perf`     | Melhoria de performance.                                                     |
| `ci`       | Alterações em pipelines de CI/CD.                                            |

### Convenções de Código — Front-end (React / Next.js / TypeScript)

- **Tipagem estrita:** `strict: true` no `tsconfig.json`. Proibido uso de `any` sem justificativa comentada.
- **Componentização:** componentes pequenos e coesos (Single Responsibility). Prefira composição a componentes gigantes.
- **Nomenclatura:**
  - Componentes: `PascalCase` (`AgendamentoForm.tsx`).
  - Hooks customizados: `camelCase` prefixado com `use` (`useDisponibilidadeAgenda.ts`).
  - Variáveis e funções: `camelCase`.
- **Estrutura de pastas sugerida:**
  ```
  src/                    # Código principal do frontend
  ├── app/                # Rotas e páginas do app (login, dashboard, CRUDs)
  ├── components/         # Componentes reutilizáveis da interface
  ├── services/           # Comunicação com a API backend
  ├── types/              # Tipos TypeScript compartilhados
  ├── utils/              # Funções auxiliares e utilitários
  ```
- **Estado e efeitos colaterais:** evitar lógica de negócio dentro de componentes visuais; extrair para hooks/services.
- **Formatação:** ESLint + Prettier obrigatórios, rodando via _pre-commit hook_ (ex: Husky + lint-staged). PR com erro de lint não deve ser aberto.
- **Acessibilidade:** uso de HTML semântico e atributos ARIA quando aplicável.
- **Sem "código morto":** remover imports, variáveis e componentes não utilizados antes do commit.

### 2.3 Convenções de Código — Back-end (Python / FastAPI / PostgreSQL)

- **Estilo:** seguir **PEP 8**, com formatação automática via `black` e organização de imports via `isort`. Lint com `ruff` ou `flake8`.
- **Tipagem:** uso obrigatório de _type hints_ em funções e métodos. Validação de payloads via **Pydantic**.
- **Nomenclatura:**
  - Módulos e funções: `snake_case`.
  - Classes: `PascalCase`.
  - Constantes: `UPPER_SNAKE_CASE`.
- **Arquitetura em camadas** (evitar lógica de negócio dentro do router):
  ```
  app/                    # Código principal da aplicação backend
  ├── api/                # Endpoints da API: auth, tutores, pets, profissionais, agendamentos e dashboard
  ├── core/               # Configurações, banco, segurança e exceções
  ├── models/             # Modelos do banco de dados
  ├── repositories/       # Acesso e persistência dos dados
  ├── schemas/            # Schemas de validação e serialização
  ├── services/           # Lógica de negócio da aplicação
  ```
- **Regras de negócio isoladas:** regras como a RN-01 (duração dobrada para porte Grande/Gigante) devem viver na camada `services/`, nunca direto no router ou na query — isso garante que sejam testáveis unitariamente.
- **Banco de dados (PostgreSQL):**
  - Migrations obrigatórias via **Alembic** — nunca alterar schema manualmente em produção.
  - Nomes de tabelas no plural e em `snake_case` (`pets`, `agendamentos`, `profissionais`).
  - Chaves estrangeiras nomeadas de forma explícita (`tutor_id`, `profissional_id`).
  - Toda constraint de integridade relevante (ex: unicidade, not null) deve existir também no nível do banco, não só na aplicação.
- **Tratamento de erros:** usar `HTTPException` do FastAPI com códigos de status corretos e mensagens claras; nunca deixar exceptions "estourarem" sem tratamento.
- **Testes:** `pytest` obrigatório para regras de negócio críticas. Meta mínima: toda regra de negócio (RN) documentada precisa de teste automatizado correspondente.

## Fluxo de Trabalho do Backlog

Passo a passo prático que **todo desenvolvedor** deve seguir ao pegar um item do backlog.

### asso a passo

1. **Pegue a tarefa no board** e mova para "Em andamento". Confirme com o PO ou Engenheiro de Requisitos se a história/critério de aceite está claro.
2. **Atualize sua `dev` local:**
   ```bash
   git checkout dev
   git pull origin dev
   ```
3. **Crie a branch** seguindo o padrão de nomenclatura.
4. **Desenvolva em commits pequenos e frequentes**, seguindo o Conventional Commits.
5. **Escreva/atualize os testes** relacionados à mudança (especialmente se tocar em regra de negócio como a RN-01).
6. **Rode lint, testes e build localmente antes de subir:**

   ```bash
   # Front-end
   npm run lint && npm run test && npm run build

   # Back-end
   ruff check . && black --check . && pytest
   ```

7. **Suba a branch e abra o Pull Request** apontando para `dev`.
8. **Solicite revisão** de pelo menos 1 integrante (idealmente de outra função — ex: back-end revisado por QA ou front-end).
9. **Ajuste conforme os comentários** do code review.
10. **Após aprovação**, o merge é feito (preferencialmente _squash merge_ para manter o histórico de `dev` limpo).
11. **Mova o card no board** para "Concluído" e apague a branch remota.

### Regras de Nomenclatura de Branches

**Formato padrão:**

```text
<tipo>/<descricao-curta-em-kebab-case>
```

**Exemplos práticos aplicados ao projeto:**

| Tipo       | Exemplo                                |
| ---------- | -------------------------------------- |
| `feature/` | `feature/agendamento-por-porte-animal` |
| `bugfix/`  | `bugfix/sobreposicao-horario-tosador`  |
| `hotfix/`  | `hotfix/falha-login-producao`          |
| `release/` | `release/1.2.0`                        |
| `docs/`    | `docs/atualiza-readme-padroes`         |
| `chore/`   | `chore/configura-pipeline-ci`          |

**Regras:**

- Sempre em `kebab-case`, sem espaços, sem acentos.
- Sempre referenciar o número da issue/card do backlog, quando existir.
- Nunca reaproveitar uma branch antiga para uma tarefa nova.

### 3.3 Checklist Obrigatório para Abertura de Pull Request

Todo PR deve usar o seguinte checklist na descrição:

```markdown
## Descrição

<!-- O que foi feito e por quê -->

## Tipo de mudança

- [ ] feat (nova funcionalidade)
- [ ] fix (correção de bug)
- [ ] refactor
- [ ] docs
- [ ] chore/test/ci

## Checklist

- [ ] Código segue os padrões definidos no README (lint sem erros)
- [ ] Testes automatizados foram criados/atualizados
- [ ] Todos os testes passam localmente
- [ ] Regras de negócio impactadas foram validadas (ex: RN-01, se aplicável)
- [ ] Não há `console.log`, `print()` de debug ou código comentado esquecido
- [ ] Documentação/README atualizado, se necessário
- [ ] Branch está atualizada com a `dev` (sem conflitos)
- [ ] Screenshots ou GIF anexados (obrigatório para mudanças de UI)
```

**Regras adicionais:**

- PR **não deve ser aberto** com testes ou lint quebrados.
- PRs grandes demais (>400 linhas de diff, como regra de bolso) devem ser quebrados em PRs menores sempre que possível.
- O título do PR deve seguir o mesmo padrão do Conventional Commits (ex: `feat(agendamento): duração dobrada para porte grande`).

> Nenhum PR é mergeado em `dev` ou `main` sem **pelo menos 1 aprovação** de outro integrante do time. Mudanças que envolvam a RN-01 (regra de duração por porte) exigem aprovação adicional do QA.


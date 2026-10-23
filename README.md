
# 🐾 Banhosa - Banho e Tosa

> Documento oficial de padronização técnica e fluxo de trabalho do projeto.
> Disciplina: **Manutenção e Melhoria de Software**

## 📌 Sobre o Projeto

**Contexto:** um pet shop precisa otimizar a agenda de banho, tosa e atendimento veterinário, hoje prejudicada por **atrasos constantes** e **agendamentos sobrepostos** nos tosadores principais.

**Escopo funcional (MVP):**

- Cadastro de tutores, pets e profissionais.
- Agendamento de serviços com seleção de **porte do animal** e **tipo de tosa**.

## Regras de Negócio

| ID | Regra | Onde está implementada |
|----|-------|------------------------|
| RN-01 | **Duração do atendimento.** Cada serviço tem uma duração-base: Banho 60 min, Banho + Tosa 60 min, Tosa higiênica 45 min, Consulta veterinária 30 min. Pets de porte **Grande** ou **Gigante** ocupam **2× a duração-base**; Pequeno e Médio ocupam a duração-base. O cálculo é sempre feito no servidor. | `services/duration_service.py` |
| RN-02 | **Conflito de horário.** Um profissional não pode ter dois agendamentos (não cancelados) com intervalos sobrepostos no mesmo dia. O intervalo de um agendamento é `[início, início + duração)`: um agendamento que começa exatamente quando outro termina é permitido. Agendamentos **Cancelados** liberam o horário. Ao remarcar, o próprio agendamento é ignorado na checagem. Violação retorna **409** (`Conflito de horário: ...`). Garantida em duas camadas: no service (com lock da linha do profissional) e por constraint `EXCLUDE` no PostgreSQL (`ex_agendamentos_profissional_sem_sobreposicao`). | `services/availability_service.py`, `models/agendamento.py` |
| RN-03 | **Horário de funcionamento.** O atendimento deve começar a partir das 08h e **terminar até as 19h** (início + duração). Configurável por `BUSINESS_START_HOUR` / `BUSINESS_END_HOUR`. | `availability_service.assert_within_business_hours` |
| RN-04 | **Profissional apto.** O profissional precisa estar **ativo**, e o serviço exige um papel: Banho, Banho + Tosa e Tosa higiênica → *Tosador*; Consulta veterinária → *Veterinário*. | `agendamento_service._assert_professional_active`, `_assert_service_matches_role` |
| RN-05 | **Sem agendamento no passado.** Data/hora de início anterior ao momento atual (fuso `America/Sao_Paulo`) é rejeitada. | `agendamento_service._assert_not_in_past` |
| RN-06 | **Transições de status.** `Pendente → Confirmado \| Concluído \| Cancelado`; `Confirmado → Concluído \| Cancelado`. `Concluído` e `Cancelado` são estados finais e o agendamento deixa de ser editável. | `agendamento_service._ALLOWED_STATUS_TRANSITIONS` |

Essa regra impacta diretamente o motor de cálculo de disponibilidade de horários e deve ser tratada como regra de domínio (não como detalhe de UI), com cobertura de testes obrigatória em qualquer PR que a envolva.

**Evoluções previstas (backlog futuro):**

# Refinamento do backlog — Fotos do pet e Controle de estoque

Data: 23/10/2026. Base: `main` do fork `MuriloWatanabe/Banhosa-Banho_e_Tosa`.
Os números de RN abaixo continuam a sequência proposta em `revisao-documentacao.md` (RN-01 a RN-06 já existem no código). **RN-07 em diante são propostas** e dependem das decisões da seção "Perguntas para o PO".

---

## 0. O que o código atual impõe a esses dois itens

Fatos lidos no repositório que moldam as duas funcionalidades:

| Fato no código | Consequência |
|---|---|
| `Tutor` tem só `name`, `phone` e `email` (único). Tutor **não tem login**; só a equipe autentica (JWT). | O tutor não consegue "abrir o sistema" para ver fotos. O envio precisa levar a foto anexada ou um link assinado com validade. |
| Não existe campo de aceite/consentimento de comunicação no tutor. | Precisa de campo novo e de decisão sobre opt-in antes de qualquer envio. |
| O `docker-compose.yml` só tem Postgres, backend e frontend; o único volume é `banhosa_pgdata`. O `.env.example` não tem nenhuma configuração de e-mail, SMS ou armazenamento. | Falta infraestrutura de armazenamento de arquivos e de envio de mensagens. Isso é decisão de arquitetura, não detalhe. |
| `Concluído` e `Cancelado` são estados finais; o agendamento "deixa de ser editável" (`update_appointment` recusa). | Anexar fotos depois de concluído **não pode** ser tratado como editar o agendamento. A baixa de estoque na conclusão acontece uma única vez, o que ajuda a garantir idempotência. |
| `change_status` hoje só troca o status e salva. | Os dois itens se penduram nessa mesma transição (`→ Concluído`). Precisam de desenho que não transforme essa função em um bloco enorme. |
| Os serviços (Banho, Banho + Tosa, Tosa higiênica, Consulta veterinária) e as durações vivem em `config.py` (dicionários), **não há tabela de serviços**. | A "ficha de consumo" do estoque não tem uma entidade serviço à qual se ligar. Ver decisão E4. |
| O `profissional_repository` já tem `get_by_id_for_update` (lock de linha) para a RN-02. | Há padrão pronto para proteger o saldo do estoque contra conclusões simultâneas. |
| Regras só no backend, em `services/`, com teste `pytest` por RN (convenção do README). | Cada RN nova abaixo já vem com cenários que viram testes. |

---

## 1. O que está fraco nos itens como estão escritos hoje

O README tem uma linha para cada um:

> *Envio de fotos do pet pronto durante o dia (notificação ao tutor).*
> *Controle de estoque de shampoos e perfumes consumidos por atendimento.*

| Item | Ambiguidade | Por que atrapalha |
|---|---|---|
| Fotos | "Enviar" por qual canal (e-mail, WhatsApp, SMS)? Quem tira e quem dispara? "Durante o dia" é um horário, um prazo ou só contexto? "Pet pronto" corresponde a qual status? | Sem canal não há estimativa nem infraestrutura; sem gatilho não há critério de aceite testável. |
| Fotos | Não menciona consentimento, formato, tamanho, retenção nem o que acontece se o envio falhar. | São justamente as regras que viram bugs e riscos de privacidade. |
| Estoque | "Consumido por atendimento": medido na hora ou padrão por serviço? Em que unidade? A baixa ocorre em qual status? | Muda o modelo de dados (ficha técnica × lançamento manual) e o ponto de integração com `change_status`. |
| Estoque | Não diz o que fazer com saldo insuficiente nem quem repõe/ajusta. | Decisão de negócio que não pode ser deixada para o desenvolvedor. |
| Ambos | Sem ator, sem métrica de sucesso, sem fora de escopo. | Não passam na Definition of Ready descrita no README (item 01 do passo a passo: confirmar com o PO que história e critério estão claros). |

**Redação sugerida para o README (substitui as duas linhas):**

```markdown
**Evoluções previstas (backlog futuro):**

- **Fotos do pet pronto:** a equipe anexa fotos ao agendamento (Confirmado ou Concluído) e o sistema as envia ao tutor por e-mail, respeitando o aceite de comunicação do tutor. Entrega assíncrona, com status e reenvio. Ver `docs/backlog/fotos-do-pet.md`.
- **Estoque de shampoos e perfumes:** cada serviço consome uma quantidade padrão de produtos por porte; o sistema dá baixa automaticamente ao concluir o atendimento, mantém histórico de movimentações e alerta estoque mínimo. Ver `docs/backlog/estoque.md`.
```

---

# PARTE A — Envio de fotos do pet ao tutor

## A.1 Objetivo e valor

Dar ao tutor a confirmação de que o pet está pronto e bem cuidado, e reduzir o fluxo de ligações e mensagens avulsas para a recepção perguntando "já está pronto?". O problema original do pet shop (atrasos e confusão na agenda) também melhora: o tutor sabe quando buscar o pet.

**Fora de escopo (sugerido):** galeria permanente do pet, login do tutor, WhatsApp automático, vídeos, edição/filtros de imagem, reconhecimento de imagem.

## A.2 Decisões de arquitetura que precisam ser tomadas antes

| ID | Decisão | Opções | Recomendação |
|---|---|---|---|
| F1 | Canal de entrega | E-mail (já existe, `Tutor.email` obrigatório e único); WhatsApp (precisa de API oficial, templates e opt-in); SMS (sem imagem) | **E-mail primeiro.** Já há o dado, não há custo por mensagem relevante, aceita imagem. WhatsApp vira fase 2, com a camada de envio já abstraída. |
| F2 | Onde guardar o arquivo | Binário no PostgreSQL; disco local em volume Docker; armazenamento de objetos compatível com S3 (ex.: MinIO no compose, S3 em produção) | **Objetos (S3 compatível), guardando só a chave no banco.** Binário no Postgres incha backup e consultas; disco local não escala nem sobrevive a troca de servidor. |
| F3 | Como a imagem chega ao tutor | Anexada ao e-mail; link assinado com validade | **Link assinado com validade** (padrão sugerido: 7 dias) e miniatura no corpo do e-mail. Evita e-mails pesados e permite revogar. Como o tutor não tem conta, URL pública permanente está descartada. |
| F4 | Como disparar o envio | Dentro da requisição de upload; tarefa em segundo plano; fila dedicada | **Tarefa assíncrona** (a requisição de upload nunca espera o provedor de e-mail). Comece com `BackgroundTasks` do FastAPI + tabela de status para retentativa; migre para fila se o volume exigir. |
| F5 | Tratamento da imagem | Guardar original; redimensionar; remover metadados | **Redimensionar e remover EXIF.** A foto é tirada com o celular da equipe e o EXIF pode conter geolocalização e dados do aparelho. |

## A.3 Regras de negócio propostas

| ID | Regra |
|---|---|
| RN-07 | **Elegibilidade.** Só é possível anexar fotos a um agendamento com status **Confirmado** ou **Concluído**. Pendente e Cancelado são rejeitados. Anexar ou remover foto **não é edição do agendamento**: continua permitido em Concluído. *(Pendente pode ir direto a Concluído no código atual; se o PO quiser aceitar foto em Pendente, é só incluir na regra.)* |
| RN-08 | **Arquivo.** Formatos JPEG, PNG ou WebP, validados pelo **conteúdo** (não pela extensão). Tamanho máximo do original: 5 MB. Máximo de 5 fotos por agendamento. Imagem redimensionada (lado maior ≤ 1600 px) e sem EXIF. Todos os limites configuráveis em `config.py`, no mesmo estilo de `BUSINESS_START_HOUR`. |
| RN-09 | **Aceite do tutor.** O sistema só envia fotos se o tutor tiver aceite de comunicação ativo (campo novo no cadastro). Sem aceite, a foto fica guardada no agendamento e o envio é bloqueado com mensagem clara. O tutor pode revogar a qualquer momento. |
| RN-10 | **Envio.** Assíncrono e idempotente: no máximo **um envio por foto por canal** (restrição única no banco). Falha de entrega: até 3 tentativas com espera crescente; esgotadas, o status vira **Falhou** e a recepção pode reenviar manualmente. O estado do envio é sempre visível no agendamento. |
| RN-11 | **Acesso.** Fotos nunca são públicas. Endpoints exigem Bearer como os demais; o tutor acessa por link assinado com validade. Link expirado devolve mensagem clara e a recepção pode gerar outro. |
| RN-12 | **Retenção.** Fotos são apagadas (arquivo e registro) após um prazo definido pelo PO após a conclusão, e quando o agendamento é removido (`DELETE /agendamentos/{id}` já existe). Remover o registro **deve** remover o objeto do armazenamento. |

## A.4 Histórias de usuário e critérios de aceite

Perfis: **Equipe** (tosador/recepção, quem usa o sistema) e **Tutor** (recebe a mensagem, não usa o sistema).

### F-01 — Anexar fotos do pet pronto
*Como membro da equipe, quero anexar fotos ao agendamento a partir do celular, para registrar o resultado do atendimento.*

```gherkin
Cenário: anexar foto válida a agendamento Confirmado
  Dado um agendamento com status "Confirmado"
  Quando a equipe envia uma imagem JPEG de 2 MB
  Então a foto é salva sem metadados EXIF e com lado maior de no máximo 1600 px
  E a resposta é 201 com o identificador da foto e status de envio "Não enviada"

Cenário: agendamento cancelado
  Dado um agendamento com status "Cancelado"
  Quando a equipe tenta anexar uma foto
  Então a resposta é um erro de validação com mensagem citando o status
  E nenhum arquivo é gravado

Cenário: arquivo disfarçado
  Dado um arquivo "pet.jpg" cujo conteúdo é um executável
  Quando a equipe tenta enviá-lo
  Então a resposta é erro de validação e nada é gravado

Cenário: limites
  Dado um agendamento que já possui 5 fotos
  Quando a equipe tenta anexar a sexta
  Então a resposta é erro de validação informando o limite
  E uma imagem de 6 MB também é rejeitada com mensagem sobre o tamanho

Cenário: anexar depois de concluído
  Dado um agendamento "Concluído"
  Quando a equipe anexa uma foto
  Então a foto é aceita (anexar foto não edita o agendamento)
```

### F-02 — Enviar fotos ao tutor
*Como membro da equipe, quero enviar as fotos ao tutor com um clique, para que ele saiba que o pet está pronto.*

```gherkin
Cenário: envio com aceite
  Dado um tutor com aceite de comunicação e um agendamento com 2 fotos não enviadas
  Quando a equipe aciona "Enviar ao tutor"
  Então a resposta é imediata (202) com os envios em status "Pendente de envio"
  E em seguida cada foto passa a "Enviada" e o tutor recebe um e-mail com links assinados

Cenário: tutor sem aceite
  Dado um tutor sem aceite de comunicação
  Quando a equipe aciona o envio
  Então a resposta é erro de validação informando que o tutor não aceitou receber mensagens
  E nenhum e-mail é disparado

Cenário: duplo clique
  Dado um envio já criado para uma foto
  Quando a equipe aciona o envio de novo para a mesma foto
  Então nenhum segundo e-mail é disparado e a resposta indica o envio existente

Cenário: falha do provedor
  Dado que o provedor de e-mail recusa a entrega
  Quando as 3 tentativas se esgotam
  Então o status do envio é "Falhou" com o motivo registrado
  E a equipe vê o botão "Reenviar"
```

### F-03 — Acompanhar o status dos envios
*Como recepção, quero ver quais fotos foram enviadas, para não mandar em duplicidade e saber o que falhou.*

```gherkin
Cenário: listagem
  Dado um agendamento com fotos em vários estados
  Quando a equipe abre o agendamento
  Então cada foto mostra o estado (Não enviada, Pendente de envio, Enviada, Falhou) e a data/hora do último evento

Cenário: indicador no dashboard
  Dado que existem envios com status "Falhou" hoje
  Quando a equipe abre o dashboard
  Então o total de envios com falha aparece como indicador
```

### F-04 — Registrar o aceite de comunicação do tutor
*Como recepção, quero registrar se o tutor aceita receber fotos, para respeitar a vontade dele.*

```gherkin
Cenário: novo tutor
  Quando a recepção cadastra um tutor
  Então o formulário apresenta o campo de aceite, que fica desmarcado até a pessoa marcá-lo

Cenário: revogação
  Dado um tutor com aceite ativo
  Quando a recepção desativa o aceite
  Então envios futuros são bloqueados
  E envios já "Pendente de envio" são cancelados

Cenário: tutores já existentes
  Dado os tutores cadastrados antes da funcionalidade
  Então todos ficam sem aceite até alguém registrá-lo (a migration não presume consentimento)
```

### F-05 — Remover foto enviada por engano
*Como membro da equipe, quero apagar uma foto, para corrigir um erro antes de ela chegar ao tutor.*

```gherkin
Cenário: foto ainda não enviada
  Dado uma foto com status "Não enviada"
  Quando a equipe a remove
  Então o registro e o arquivo no armazenamento são apagados

Cenário: foto já enviada
  Dado uma foto "Enviada"
  Quando a equipe a remove
  Então o registro e o arquivo são apagados e o link enviado ao tutor passa a mostrar que o conteúdo foi removido
```

## A.5 Esboço técnico (sem implementar)

**Banco** (migration Alembic nova; nomes no padrão do README — plural, `snake_case`, chaves estrangeiras explícitas):

- `agendamento_fotos`: `id` (UUID em texto, como as demais tabelas), `agendamento_id` (FK; `ON DELETE CASCADE`, com remoção do objeto no service), `storage_key`, `content_type`, `size_bytes`, `created_at`, `created_by`.
- `fotos_envios`: `id`, `foto_id` (FK), `canal` (enum; só "E-mail" no início), `status` (enum: Pendente de envio, Enviada, Falhou), `tentativas`, `ultimo_erro`, `enviado_em`; **unique `(foto_id, canal)`** (garante a idempotência da RN-10).
- `tutores`: coluna `aceita_comunicacao` (boolean, `NOT NULL`, default `false`) e `aceite_atualizado_em`.

**API** (consistente com as rotas existentes):

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/agendamentos/{id}/fotos` | Anexar foto (multipart) |
| GET | `/api/v1/agendamentos/{id}/fotos` | Listar fotos e status de envio |
| DELETE | `/api/v1/agendamentos/{id}/fotos/{foto_id}` | Remover foto |
| POST | `/api/v1/agendamentos/{id}/fotos/envio` | Enviar (ou reenviar) ao tutor |

**Camadas:** regra em `services/foto_service.py`, acesso a dados em `repositories/`, envio de e-mail atrás de uma interface (`NotificationChannel`) para o WhatsApp entrar depois sem tocar na regra. O frontend continua só enviando a intenção e mostrando erro/resultado (convenção do README); a tela mobile da equipe deve abrir a câmera direto (`<input type="file" accept="image/*" capture>`).

**Configuração nova em `.env.example`:** credenciais do provedor de e-mail, endereço remetente, endpoint/bucket/credenciais do armazenamento, validade dos links. Todas com valor de desenvolvimento no compose (ex.: MinIO + um servidor SMTP de teste).

## A.6 Fatiamento sugerido (entregas independentes)

1. **Foto no agendamento** (F-01, F-05, RN-07/08/11/12): valor interno imediato, sem e-mail.
2. **Aceite + envio** (F-04, F-02, RN-09/10): entrega o valor principal ao tutor.
3. **Visibilidade e robustez** (F-03, reenvio, indicador no dashboard, retenção automática).

---

# PARTE B — Controle de estoque de shampoos e perfumes

## B.1 Objetivo e valor

Saber quanto de cada produto resta, sem contagem manual diária, e ser avisado antes de acabar. A baixa automática vem de um fato que o sistema já conhece: o atendimento foi **concluído**.

**Fora de escopo (sugerido):** compras e fornecedores, custo e margem por atendimento, inventário físico com código de barras, outros insumos (toalhas, lâminas), estoque por lote/validade.

## B.2 Decisões de arquitetura que precisam ser tomadas antes

| ID | Decisão | Opções | Recomendação |
|---|---|---|---|
| E1 | Como medir o consumo | Lançar manualmente em cada atendimento; **quantidade padrão por serviço e porte** (ficha de consumo); sensor/balança | **Ficha de consumo padrão com possibilidade de ajuste manual.** Lançamento manual em todo atendimento atrapalha a rotina da equipe; a ficha dá a baixa automática e o ajuste corrige desvios. |
| E2 | Quando dar baixa | Ao criar, ao confirmar, ao concluir | **Ao concluir.** Cancelamento e remarcação são comuns e não consomem produto; `Concluído` é final no código, então a baixa acontece uma única vez. |
| E3 | Saldo insuficiente na conclusão | Bloquear a conclusão; permitir e deixar o saldo negativo | **Não bloquear.** O serviço já foi feito; impedir a conclusão distorce a agenda. O saldo pode ficar negativo, o movimento é sinalizado e o alerta de estoque dispara. |
| E4 | Onde guardar a ficha de consumo | Dicionário em `config.py` (como as durações); tabela no banco | **Tabela no banco.** Quantidades mudam com o dia a dia da loja (troca de marca, diluição) e quem altera é o gestor, não o desenvolvedor. Como não há tabela de serviços, a chave é o nome do serviço (texto), validado contra os serviços de `config.py`. Registrar como débito técnico: promover serviço a entidade quando surgir a próxima necessidade. |
| E5 | Registro do saldo | Só um número atualizado; histórico imutável de movimentações (ledger) + saldo | **Ledger imutável com saldo materializado.** Cada movimentação (entrada, consumo, ajuste) é uma linha que nunca é editada; o saldo é a soma, guardado também na linha do produto para leitura rápida. Dá auditoria e corrige discrepâncias sem apagar história. |
| E6 | Concorrência | Atualizar sem travar; lock da linha do produto | **Lock da linha do produto** durante a baixa, reaproveitando o padrão do `get_by_id_for_update` da RN-02. |

## B.3 Regras de negócio propostas

| ID | Regra |
|---|---|
| RN-13 | **Produto.** Cada produto tem nome, categoria (**Shampoo** ou **Perfume**), unidade de medida (**ml** ou **unidade**), saldo, estoque mínimo e flag ativo. Produto com movimentações não pode ser excluído (**409**, como já ocorre com tutor/pet/profissional); deve ser inativado. Produto inativo não entra em fichas novas nem recebe entrada. |
| RN-14 | **Ficha de consumo.** Define, para cada combinação (serviço, porte do pet, produto), a quantidade consumida. Serviços sem ficha (ex.: Consulta veterinária) não consomem estoque. Valores padrão iniciais são definidos pelo pet shop; **ponto de partida sugerido:** replicar a RN-01 (Grande e Gigante = 2× o consumo de Pequeno e Médio) e ajustar depois com dados reais. |
| RN-15 | **Baixa automática.** Ao transitar para **Concluído**, o sistema registra um movimento de **Consumo** para cada produto da ficha aplicável (serviço + porte do pet **no momento da conclusão**). A baixa e a mudança de status acontecem **na mesma transação**: se a baixa falhar, o status não muda. Nenhuma baixa em Pendente, Confirmado ou Cancelado. |
| RN-16 | **Idempotência.** No máximo um movimento de Consumo por (agendamento, produto) — restrição única no banco. Repetir a conclusão (ex.: requisição duplicada) não baixa duas vezes. |
| RN-17 | **Saldo insuficiente.** A conclusão **nunca** é bloqueada por falta de estoque. O saldo pode ficar negativo; o movimento recebe a marca de "saldo insuficiente" para conferência. |
| RN-18 | **Movimentações.** Tipos: **Entrada** (reposição), **Consumo** (automático), **Ajuste** (correção de inventário). Entrada e ajuste exigem quantidade positiva ou negativa conforme o caso e **motivo obrigatório** nos ajustes. Movimentações são imutáveis: erro se corrige com novo Ajuste, nunca editando a linha. |
| RN-19 | **Alerta de estoque mínimo.** Produto ativo com saldo ≤ estoque mínimo é sinalizado na listagem de produtos e como indicador no `GET /api/v1/dashboard`. |
| RN-20 | **Ajuste do consumo no atendimento (opcional, fase 3).** Antes de concluir, a equipe pode alterar a quantidade de um produto do atendimento (ex.: pelagem muito suja); a diferença é registrada com motivo. |

## B.4 Histórias de usuário e critérios de aceite

Perfis: **Gestor** (cadastra produtos e fichas, faz ajustes) e **Equipe** (conclui atendimentos). *Ver a pergunta P5 sobre permissões: hoje só existe um login de equipe.*

### S-01 — Cadastrar produtos
*Como gestor, quero cadastrar shampoos e perfumes com estoque mínimo, para controlar o que a loja usa.*

```gherkin
Cenário: cadastro válido
  Quando o gestor cadastra "Shampoo neutro 5 L" categoria "Shampoo", unidade "ml", estoque mínimo 1000
  Então o produto é criado ativo com saldo 0

Cenário: quantidade inválida
  Quando o gestor informa estoque mínimo negativo
  Então a resposta é erro de validação

Cenário: excluir produto com histórico
  Dado um produto com movimentações
  Quando o gestor tenta excluí-lo
  Então a resposta é 409 sugerindo inativar
  E ao inativar, o produto some das fichas novas mas continua no histórico
```

### S-02 — Registrar entrada de estoque
*Como gestor, quero lançar a reposição, para o saldo refletir a compra.*

```gherkin
Cenário: entrada
  Dado um produto com saldo 500
  Quando o gestor registra Entrada de 5000
  Então o saldo passa a 5500
  E existe uma movimentação imutável de Entrada com autor e data

Cenário: entrada inválida
  Quando a quantidade é zero ou negativa
  Então a resposta é erro de validação e o saldo não muda

Cenário: produto inativo
  Dado um produto inativo
  Quando o gestor tenta registrar Entrada
  Então a resposta é erro de validação
```

### S-03 — Definir a ficha de consumo por serviço e porte
*Como gestor, quero definir quanto de cada produto cada serviço consome por porte, para a baixa ser automática.*

```gherkin
Cenário: definir ficha
  Quando o gestor define que "Banho" para porte "Pequeno" consome 30 ml de "Shampoo neutro 5 L"
  Então a ficha é salva e passa a valer para novos atendimentos concluídos

Cenário: serviço inexistente
  Quando o gestor usa um nome de serviço que não está na lista de serviços do sistema
  Então a resposta é erro de validação listando os serviços válidos (mesma mensagem da RN-01)

Cenário: mudança de ficha não reescreve o passado
  Dado atendimentos já concluídos com a ficha antiga
  Quando a ficha é alterada
  Então os movimentos de Consumo já registrados permanecem intactos
```
*(Os 30 ml são só ilustração do cenário; as quantidades reais são definidas pelo pet shop.)*

### S-04 — Baixa automática ao concluir o atendimento
*Como equipe, quero que concluir o atendimento baixe o estoque sozinho, para não precisar lançar nada.*

```gherkin
Cenário: baixa com estoque suficiente
  Dado um agendamento "Banho" de um pet de porte Grande, com ficha que consome 60 ml de "Shampoo neutro 5 L"
  E o produto tem saldo 1000
  Quando a equipe muda o status para "Concluído"
  Então o status muda
  E o saldo do produto passa a 940
  E existe um movimento de Consumo ligado ao agendamento

Cenário: serviço sem ficha
  Dado uma "Consulta veterinária"
  Quando o agendamento é concluído
  Então nenhum movimento é criado e o status muda normalmente

Cenário: cancelamento não consome
  Dado um agendamento "Confirmado"
  Quando é cancelado
  Então nenhum movimento é criado e o saldo não muda

Cenário: saldo insuficiente não bloqueia
  Dado um produto com saldo 20 e consumo de 60
  Quando o agendamento é concluído
  Então o status muda para "Concluído"
  E o saldo fica em -40, com o movimento marcado "saldo insuficiente"
  E o produto aparece em alerta

Cenário: requisição duplicada
  Dado um agendamento já "Concluído"
  Quando a mesma mudança de status chega de novo
  Então a resposta é a de transição inválida já existente
  E o saldo não é debitado uma segunda vez

Cenário: conclusões simultâneas
  Dado dois agendamentos que usam o mesmo produto concluídos ao mesmo tempo
  Então o saldo final é exatamente o saldo inicial menos os dois consumos

Cenário: falha na baixa
  Dado que a gravação do movimento falha
  Quando a equipe conclui o agendamento
  Então o status continua como estava e a resposta é de erro
```

### S-05 — Ajustar o estoque (inventário)
*Como gestor, quero corrigir o saldo depois de contar as prateleiras, para o sistema refletir a realidade.*

```gherkin
Cenário: ajuste com motivo
  Dado um produto com saldo 940 e contagem física de 900
  Quando o gestor registra Ajuste de -40 com o motivo "perda por derramamento"
  Então o saldo passa a 900 e o movimento guarda o motivo

Cenário: ajuste sem motivo
  Quando o gestor tenta ajustar sem informar o motivo
  Então a resposta é erro de validação

Cenário: movimentação não é editável
  Quando alguém tenta alterar ou apagar uma movimentação existente
  Então a operação não existe na API
```

### S-06 — Alerta de estoque mínimo
*Como gestor, quero ser avisado antes de acabar, para repor a tempo.*

```gherkin
Cenário: abaixo do mínimo
  Dado um produto ativo com estoque mínimo 1000 e saldo 900
  Quando o gestor abre o dashboard ou a lista de produtos
  Então o produto aparece sinalizado e o dashboard mostra o total de produtos em alerta

Cenário: produto inativo
  Dado um produto inativo abaixo do mínimo
  Então ele não gera alerta
```

### S-07 — Consultar o histórico de consumo
*Como gestor, quero ver para onde foi cada produto, para detectar desperdício.*

```gherkin
Cenário: histórico por produto
  Quando o gestor abre as movimentações de um produto filtrando por período
  Então vê entradas, consumos (com link para o agendamento) e ajustes em ordem cronológica
  E a soma das movimentações bate com o saldo atual
```

## B.5 Esboço técnico

**Banco** (migration nova; tipos numéricos exatos, **não** `float`):

- `produtos`: `id`, `name`, `categoria` (enum Shampoo/Perfume), `unidade` (enum ml/unidade), `saldo` (`Numeric(12,2)`), `estoque_minimo`, `active`, `created_at`.
- `fichas_consumo`: `id`, `service` (texto, validado contra `config.py`), `porte` (enum `PortePet` já existente), `produto_id` (FK), `quantidade`; **unique `(service, porte, produto_id)`**.
- `movimentacoes_estoque`: `id`, `produto_id` (FK), `tipo` (Entrada/Consumo/Ajuste), `quantidade` (com sinal), `motivo`, `agendamento_id` (FK nullable), `saldo_insuficiente` (boolean), `created_at`, `created_by`; **unique parcial `(agendamento_id, produto_id)` onde `tipo = 'Consumo'`** (garante a RN-16).
- Imutabilidade: sem rotas de `PUT`/`DELETE` em movimentações e, opcionalmente, trigger de bloqueio.

**API** (padrão das rotas atuais):

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/v1/produtos` | Listar (com indicador de alerta) e criar |
| PUT/DELETE | `/api/v1/produtos/{id}` | Editar (inclusive inativar) e remover (409 se houver histórico) |
| GET/POST | `/api/v1/produtos/{id}/movimentacoes` | Histórico; lançar Entrada ou Ajuste |
| GET/PUT | `/api/v1/consumo` | Consultar e definir a ficha de consumo |
| GET | `/api/v1/dashboard` | Passa a incluir o total de produtos em alerta |

**Camadas:** `services/estoque_service.py` com `calcular_consumo(servico, porte)` **pura** (testável sem banco, como `duration_service`) e `baixar_estoque(db, agendamento)` chamada por `change_status` ao entrar em `Concluído`. Para não encher `agendamento_service`, a baixa é um passo isolado atrás de uma função, executada **dentro da mesma sessão/transação** (E2, RN-15).

## B.6 Fatiamento sugerido

1. **Catálogo e entrada** (S-01, S-02, RN-13/18): cadastro e saldo funcionando, ainda sem automação.
2. **Ficha + baixa automática** (S-03, S-04, RN-14/15/16/17): o coração da funcionalidade.
3. **Ajuste, alerta e histórico** (S-05, S-06, S-07, RN-19).
4. *(Opcional)* Ajuste por atendimento (RN-20) e relatório de consumo por período.

---

# PARTE C — O que vale nos dois itens

## C.1 Interação entre as funcionalidades

Ambas se ligam à transição `→ Concluído`, mas com naturezas opostas:

| | Estoque | Fotos |
|---|---|---|
| Quando | Na transição | Antes ou depois da conclusão |
| Consistência | **Síncrona, mesma transação** | **Assíncrona**, depois do commit |
| Falhou | Desfaz a conclusão | Registra "Falhou" e permite reenvio |

Recomendação: **não colocar nenhuma das duas lógicas diretamente dentro de `change_status`**; chamar uma função de cada uma, para a regra de transição de status continuar legível e testável.

## C.2 Definition of Done sugerida

- Cada RN nova tem teste `pytest` (convenção do README), incluindo os cenários de erro acima.
- Migration Alembic criada e testada em banco limpo e em banco com dados.
- Constraints de integridade (unicidades, `NOT NULL`) existem **no banco**, não só no código (convenção do README).
- Novas variáveis de ambiente documentadas em `.env.example` **e** no compose.
- README atualizado: tabela de RN (RN-07 em diante), endpoints novos e seção "Estado atual".
- PR com screenshot/GIF das telas novas e aprovação adicional do QA, por mexer em regra de negócio.

## C.3 Riscos

| Risco | Mitigação |
|---|---|
| Dado pessoal do tutor (e-mail) e conteúdo gerado em ambiente da loja. | Aceite explícito, link com validade, EXIF removido, retenção definida. Revisão jurídica do texto de aceite (não é aconselhamento jurídico). |
| Provedor de e-mail com instabilidade. | Envio assíncrono com retentativas, status visível e reenvio manual. |
| Estoque divergente da realidade, porque a ficha é média. | Ajuste de inventário com motivo, histórico imutável e relatório de consumo para recalibrar a ficha. |
| `change_status` crescer e ficar frágil. | Funções isoladas por responsabilidade (C.1) e testes por cenário. |
| Serviços ainda fixos em `config.py`. | Registrar o débito técnico; promover serviço a entidade quando surgir a próxima necessidade. |

---

## Limites desta análise

Foram lidos só os arquivos citados em `revisao-documentacao.md`. Não consegui abrir os testes, as migrations, os schemas, os routers nem os componentes do frontend. Antes de implementar: conferir o tratamento de `ValidationError` (código HTTP), como o login define perfis de usuário e se já existe algum módulo de e-mail ou upload que eu não tenha visto.

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
cp backend/.env.example backend/.env

# Na raiz do projeto "Banhosa-Banho_e_Tosa/"
$ docker compose up

# Para executar a criação do usuário teste para desenvolvimento:
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

### Passo a passo

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
   npm run lint && npm run format:check && npm run test && npm run build

   # Back-end
   ruff check . && black --check . && isort --check-only . && pytest
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


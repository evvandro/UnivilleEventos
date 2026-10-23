# CLAUDE.md — Univille Eventos

Software Engineering Challenge 2026 (Univille, campus São Bento do Sul). Sistema de Gestão de Eventos Institucionais.
Fonte da verdade dos requisitos: fotos do caderno em `Docs/` (JPG). O agente `qa-regras-negocio` confere o sistema contra elas. Proposta visual: `docs/proposta.html`.

## Prazos (inegociáveis)
- 23/10/2026 **18h45**: link do GitHub público postado no grupo. Código e estrutura do banco congelam nesse horário. Atraso = nota zero.
- Defesa: 5 min. Precisa provar a persistência (criar ou editar, dar F5, o dado continua lá).
- Rubrica: 30 funcionalidades, 20 banco real, 20 regras de negócio (validações, conflitos, estados, permissões), 15 UI, 15 qualidade técnica/README.

## Regras do desafio
- Proibido Lovable/Bolt. ChatGPT/Copilot/Claude são permitidos **com transparência no README**.
- Componentes genéricos reutilizados precisam ser declarados no README.
- Só dados fictícios. Nada de segredo, token ou credencial real no repo (`.env` fora do git; `.env.example` dentro).
- README: nome da equipe e integrantes, resumo, tecnologias, instalação/execução, configuração do banco, usuários de teste, componentes reutilizados, IA usada.

## Domínio
Perfis: **Visitante** (público, sem login), **Solicitante**, **Administrador**. Sem autocadastro, sem recuperação de senha. Senha com hash.
Login: **matrícula + senha** (decisão do PO; o caderno 6.4 fala em "e-mail único (login)"). Por enquanto a matrícula só precisa ter dígitos e no futuro virá do sistema acadêmico. O e-mail continua obrigatório e único no cadastro.

Estados da solicitação:
- `RASCUNHO`: pode estar incompleto; o autor edita ou exclui.
- `AGUARDANDO`: o autor edita ou cancela; o admin aprova ou rejeita.
- `REJEITADO`: justificativa obrigatória, visível ao autor; o autor corrige e reenvia.
- `APROVADO`: publicado; só o admin edita ou cancela, revalidando o conflito.
- `CANCELADO`: não aparece no público; o registro é mantido.

Regras:
- Campos obrigatórios no ENVIO: nome, tema, data, hora início/fim, local, curso/coordenação, solicitante (texto livre), palestrante, público-alvo, justificativa, objetivo, cerimonial, haverá inscrições, necessidade de declarações (as três últimas são sim/não). Opcionais: recursos, observações.
- Centro de custo vem automaticamente do curso/coordenação.
- O ambiente determina os recursos selecionáveis. Um evento ocupa um ambiente em um único dia; o fim deve ser depois do início; data atual ou futura; horário entre 00h00 e 23h59.
- `autor_id` (usuário logado) é diferente de `solicitante_nome` (texto livre). Guardar os dois.
- **Conflito**: mesmo ambiente + mesma data + intervalo sobreposto com um evento APROVADO. Checar no envio e de novo na aprovação ou na edição do aprovado. Intervalo semiaberto `[início, fim)`: 19–20 e 20–21 não conflitam. Garantia final no banco: `EXCLUDE USING gist` com `WHERE status='APROVADO'`.
- Período da agenda pública: padrão **mês atual + 2** (exigência do caderno), mas **configurável**. Guardar em `configuracao.meses_agenda_publica` (padrão 3, mínimo 3), editável pelo admin em Cadastros › Configurações. Nunca fixar "3" no código: a API e o front leem esse valor, e a API recusa meses fora do período.
- Página inicial: calendário mensal (abas para cada mês do período) com eventos coloridos por tema, mais a lista "Próximos eventos" em ordem cronológica com todos os campos. Só aprovados. Campos visíveis: data, evento, tema, início, local, palestrante, realização (curso). O calendário é escolha nossa (o caderno não exige); busca, paginação e página de detalhe continuam fora do escopo.
- Admin: CRUD de temas, ambientes, recursos (N:N com ambiente), cursos→centro de custo, centros de custo e usuários (nome, e-mail único, senha, perfil, desativar). Exclusão de auxiliar só sem vínculos.
- Relatório: filtros por período, curso e tema, individuais ou combinados. Colunas: nome, data, início/fim, tema, curso, centro de custo, local, solicitante, status. CSV com os mesmos registros.
- Inscrições/declarações são apenas flags sim/não. NÃO implementar inscrição de participantes nem certificados.
- O seed precisa cobrir usuários, locais, recursos, temas, cursos e eventos em todos os estados.

## Stack e estrutura (implementado)
Monorepo com npm workspaces:
- `packages/shared`: schemas Zod (rascunho × envio), enums, DTOs e `errosPorCampo`. É consumido como TS direto, sem build.
- `apps/api`: Fastify 5 + Prisma 6 + PostgreSQL 16, rodando com `tsx`. Módulos em `src/modules/<dominio>/routes.ts`.
  - O domínio de solicitações fica em `modules/solicitacoes/`:
    - `transicoes.ts`: tabela pura de estados × ações × papel;
    - `conflito.ts`;
    - `service.ts`: interface pequena (`criar`, `atualizar`, `enviar`, `cancelar`, `excluir`, `aprovar`, `rejeitar`, `listar*`, `obter`).
  - Cadastros simples usam a fábrica `modules/cadastros/crud.ts`.
- `apps/web`: React 19 + Vite + React Router 7 + Tailwind 4 (tokens em `src/index.css`).
  - Sem lib de componentes; `lib/api.ts` (fetch) e `lib/useApi.ts`.
  - Duas áreas:
    - `PublicLayout`: barra + Entrar/ProfileMenu;
    - `AppLayout`: botão Menu → gaveta lateral (`components/Overlay.tsx` Drawer) com grupo Administração só para admin, mais o ProfileMenu com Sair.
- Auth: JWT em cookie httpOnly `univille_token` (8h); preHandlers `autenticar` e `exigirAdmin` em `apps/api/src/auth.ts`.

Comandos: `npm run db:up` | `db:migrate` | `db:seed` | `dev` | `test` | `typecheck` | `build` | `start`.
- O seed APAGA os dados.
- `prisma migrate reset` exige consentimento explícito do usuário (o Prisma bloqueia agentes). Para corrigir uma migration falha, prefira `prisma migrate resolve --rolled-back <nome>` + `migrate deploy`.
- Mudança de schema: escrever uma nova pasta em `prisma/migrations/` com o SQL. A `EXCLUDE` e o `CHECK` não são representáveis no schema.prisma; evite `migrate dev`, que tenta gerar o diff.

Horários: data `YYYY-MM-DD` e hora `HH:mm` "de parede", guardadas em `timestamp` sem fuso. A `Date` em UTC é só um contêiner (`src/tempo.ts`). "Hoje" usa `America/Sao_Paulo`.

Segurança já implementada:
- `@fastify/helmet`;
- `@fastify/rate-limit` (teto global por IP, `RATE_LIMIT_MAX`);
- força bruta no login em `modules/auth/tentativas.ts`: conta só erros, 5 por conta+IP e 20 por IP a cada 15 min, em memória;
- trava de linha `FOR UPDATE` em toda transição de solicitação.

Relatório para impressão: a rota do front `/admin/relatorios/agenda` (fora do AppLayout) segue o modelo do PO e usa `status=APROVADO` por padrão. O logo é `apps/web/public/logo-univille.png` (branco); em fundo claro use a classe `.logo-verde` (mask CSS).

Agentes de QA em `.claude/agents/`: `qa-seguranca`, `qa-funcional` e `qa-api-dados`. Eles só reportam; para testes de limite, cada um sobe a sua própria instância da API em outra porta.

Deploy (pendente, quem configura é o usuário): AWS free tier com uma única EC2, Postgres em container e `npm start` servindo a API + `apps/web/dist` na porta 3333. **Antes de mexer na parte AWS, avisar o usuário.**

## Identidade visual (base: clone do login Enturma em ~/Desktop/Facul/univille)
- Fonte: `"Helvetica Neue", Helvetica, Arial, sans-serif` (só ela).
- Barra superior verde `#00562b`, 58px. Fundo de login: `bg.png` (pôr do sol borrado, em `docs/bg.png`) com uma caixa branca de sombra leve.
- Botão primário azul `#347bb7` (borda `#2e6da4`, hover `#286090`); links `#337ab7`; campos lavanda `#e9f0fe` com borda `#a6a7b1`.
- Status em etiquetas no estilo Bootstrap 3: rascunho cinza, aguardando âmbar, aprovado verde, rejeitado vermelho, cancelado ardósia.
- Referência das telas: `docs/proposta.html`.

## Padrões de código
- Regras de negócio e permissões **sempre no servidor**; o front só espelha.
- API por módulo: regras de negócio num `service.ts` (ex.: `modules/solicitacoes/service.ts`, com as transições centralizadas em `transicoes.ts`). Módulos só de leitura/CRUD simples (agenda, relatórios, usuários, cadastros) podem consultar o Prisma na própria rota; ao ganharem regra, extraia um service.
- Validação de rascunho (parcial) e de envio (completa) com schemas Zod em `packages/shared`.
- Mensagens de erro em pt-BR, específicas (ex.: dizer qual evento conflita).
- Commits em inglês, imperativos e curtos.

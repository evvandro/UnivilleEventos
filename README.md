# Univille Eventos

Sistema de gestão de eventos institucionais. Engineering Challenge 2026, Univille São Bento do Sul.

**Equipe:** QuintoByte
**Integrantes:** Gustavo Dums, Emilim, Murilo e Evandro

## O que faz

- Agenda pública com os eventos aprovados (mês atual + 2).
- O solicitante cria um pedido, salva rascunho, envia e acompanha o status.
- O admin aprova ou rejeita (com motivo), edita/cancela aprovados e mantém os cadastros.
- Conflito de local e horário é bloqueado no envio, na aprovação e no banco.
- Relatórios por período, curso, tema e situação, com exportação CSV e versão para impressão/PDF.

## Tecnologias

- **Front:** React 19, TypeScript, Vite, React Router, Tailwind CSS
- **API:** Node.js 22+, Fastify, Zod
- **Banco:** PostgreSQL 16 com Prisma (migrations em `apps/api/prisma`)
- **Auth:** login por matrícula, JWT em cookie httpOnly e senha com bcrypt
- **Testes:** Vitest

Monorepo com npm workspaces:

```
apps/api         API e banco
apps/web         front-end
packages/shared  validações e tipos usados pelos dois
```

## Como rodar

Precisa de **Node.js 22+** e **Docker** (Docker Desktop aberto). Funciona em Windows, macOS e Linux.

Todos os comandos rodam na **pasta raiz do projeto** (onde está este README). Não é preciso entrar em `apps/api` nem em `apps/web`.

```bash
git clone https://github.com/evvandro/UnivilleEventos.git
cd UnivilleEventos
npm install          # instala tudo e cria apps/api/.env automaticamente
npm run db:up        # sobe o Postgres no Docker e espera ficar pronto
npm run db:migrate   # cria as tabelas
npm run db:seed      # dados de teste (apaga o que existir)
npm run dev          # API (porta 3333) + front: http://localhost:5173
```

Nas próximas vezes basta `npm run db:up` e `npm run dev`. Para parar o banco: `npm run db:down`.

Outros comandos: `npm test`, `npm run typecheck`, `npm run lint` (ESLint), `npm run prettier` (formata o código), `npm run build` e `npm start` (produção, porta 3333).

**Problemas comuns**

- _Porta 5432 ocupada:_ já existe outro Postgres rodando na máquina. Pare-o ou mude a porta em `docker-compose.dev.yml` e no `DATABASE_URL` de `apps/api/.env`.
- _Porta 5173 ocupada:_ o Vite usa a próxima livre (5174, 5175...). Veja o endereço que aparece no terminal.
- _`docker: command not found` ou erro de conexão:_ abra o Docker Desktop antes do `npm run db:up`.

## Banco

Configurado em `apps/api/.env`:

```
DATABASE_URL="postgresql://univille:univille@localhost:5432/univille_eventos?schema=public"
JWT_SECRET="troque-esta-chave-em-producao"
PORT=3333
```

## Login

O acesso é feito com **matrícula + senha**.

- A matrícula aceita só números (ex.: `2026000002`). Letras, e-mail ou campo vazio são recusados.
- Não existe autocadastro: o administrador cria os usuários em **Administração > Usuários**, informando matrícula, nome, e-mail, senha e perfil.
- Usuário desativado não consegue entrar.

## Usuários de teste

| Matrícula  | Senha    | Usuário                          |
| ---------- | -------- | -------------------------------- |
| 2026000001 | admin123 | Setor de Eventos (administrador) |
| 2026000002 | senha123 | Ana Medeiros Felix (solicitante) |
| 2026000003 | senha123 | Carlos Prado Lima (solicitante)  |
| 2026000004 | senha123 | Bruno Tschoeke Dias (desativado) |

Todos os dados são fictícios.

## Ferramentas de IA

Usamos o Claude Code no planejamento, no código, nos testes e na documentação. Todo o resultado passou por revisão da equipe.

Para a validação, a equipe optou por orquestrar agentes especializados. Cada agente fica responsável por uma parte específica do sistema e só testa e reporta, sem alterar código. As correções foram feitas depois, a partir dos relatórios.

| Agente            | Responsabilidade                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Segurança         | Autenticação, proteção contra força bruta, SQL injection, sessão JWT e permissões por perfil (visitante, solicitante e administrador). |
| Funcional         | Testa cada tela como um usuário real: formulários, validações de campos e os cenários de uso de cada perfil.                           |
| API e dados       | Estrutura da API, limites de requisição, tabelas, constraints e índices do banco, e os relatórios (tela, CSV e impressão).             |
| Regras de negócio | Confere cada regra do caderno do desafio contra o sistema e aponta o que falta ou foi implementado diferente.                          |

Dividir a revisão assim deixou cada análise mais profunda e ajudou a achar problemas que passariam numa revisão geral. Dois exemplos: a condição de corrida entre duas aprovações simultâneas e mensagens de erro que ainda apareciam em inglês.

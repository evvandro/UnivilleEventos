-- Necessário para o EXCLUDE com igualdade de inteiro + sobreposição de intervalo
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('SOLICITANTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('RASCUNHO', 'AGUARDANDO', 'APROVADO', 'REJEITADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centro_custo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "centro_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curso" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "centro_custo_id" INTEGER NOT NULL,

    CONSTRAINT "curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tema" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambiente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidade" INTEGER,

    CONSTRAINT "ambiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurso" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambiente_recurso" (
    "ambiente_id" INTEGER NOT NULL,
    "recurso_id" INTEGER NOT NULL,

    CONSTRAINT "ambiente_recurso_pkey" PRIMARY KEY ("ambiente_id","recurso_id")
);

-- CreateTable
CREATE TABLE "solicitacao" (
    "id" SERIAL NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'RASCUNHO',
    "autor_id" INTEGER NOT NULL,
    "nome" TEXT,
    "tema_id" INTEGER,
    "inicio" TIMESTAMP(0),
    "fim" TIMESTAMP(0),
    "ambiente_id" INTEGER,
    "curso_id" INTEGER,
    "solicitante_nome" TEXT,
    "palestrante" TEXT,
    "publico_alvo" TEXT,
    "justificativa" TEXT,
    "objetivo" TEXT,
    "cerimonial" BOOLEAN,
    "havera_inscricoes" BOOLEAN,
    "necessita_declaracoes" BOOLEAN,
    "observacoes" TEXT,
    "motivo_rejeicao" TEXT,
    "enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_recurso" (
    "solicitacao_id" INTEGER NOT NULL,
    "recurso_id" INTEGER NOT NULL,

    CONSTRAINT "solicitacao_recurso_pkey" PRIMARY KEY ("solicitacao_id","recurso_id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" SERIAL NOT NULL,
    "solicitacao_id" INTEGER NOT NULL,
    "de" "StatusSolicitacao",
    "para" "StatusSolicitacao" NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "configuracao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "centro_custo_codigo_key" ON "centro_custo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "curso_nome_key" ON "curso"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "tema_nome_key" ON "tema"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ambiente_nome_key" ON "ambiente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "recurso_nome_key" ON "recurso"("nome");

-- CreateIndex
CREATE INDEX "solicitacao_status_inicio_idx" ON "solicitacao"("status", "inicio");

-- CreateIndex
CREATE INDEX "solicitacao_autor_id_idx" ON "solicitacao"("autor_id");

-- CreateIndex
CREATE INDEX "historico_status_solicitacao_id_idx" ON "historico_status"("solicitacao_id");

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "centro_custo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambiente_recurso" ADD CONSTRAINT "ambiente_recurso_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambiente_recurso" ADD CONSTRAINT "ambiente_recurso_recurso_id_fkey" FOREIGN KEY ("recurso_id") REFERENCES "recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_tema_id_fkey" FOREIGN KEY ("tema_id") REFERENCES "tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_recurso" ADD CONSTRAINT "solicitacao_recurso_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_recurso" ADD CONSTRAINT "solicitacao_recurso_recurso_id_fkey" FOREIGN KEY ("recurso_id") REFERENCES "recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Regras de negócio garantidas pelo próprio banco ------------------------------

-- Cada evento ocupa um único dia e termina depois de começar.
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_horario_valido"
  CHECK ("inicio" IS NULL OR "fim" IS NULL OR ("fim" > "inicio" AND "inicio"::date = "fim"::date));

-- Dois eventos APROVADOS nunca ocupam o mesmo ambiente em horários sobrepostos.
-- Intervalo semiaberto '[)': 19h–20h e 20h–21h podem coexistir.
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_sem_conflito_aprovado"
  EXCLUDE USING gist ("ambiente_id" WITH =, tsrange("inicio", "fim", '[)') WITH &&)
  WHERE ("status" = 'APROVADO');

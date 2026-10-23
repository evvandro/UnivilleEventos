-- Data separada dos horários: permite salvar rascunho só com a data.
ALTER TABLE "solicitacao" ADD COLUMN "data" DATE;

ALTER TABLE "solicitacao" DROP CONSTRAINT "solicitacao_horario_valido";
ALTER TABLE "solicitacao" ADD CONSTRAINT "solicitacao_horario_valido" CHECK (
  ("inicio" IS NULL OR ("data" IS NOT NULL AND "inicio"::date = "data")) AND
  ("fim" IS NULL OR ("data" IS NOT NULL AND "fim"::date = "data")) AND
  ("inicio" IS NULL OR "fim" IS NULL OR "fim" > "inicio")
);

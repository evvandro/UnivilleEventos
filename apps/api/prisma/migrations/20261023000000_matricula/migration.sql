-- Login passa a ser a matrícula (somente dígitos). O e-mail continua obrigatório e único.
ALTER TABLE "usuario" ADD COLUMN "matricula" TEXT;
UPDATE "usuario" SET "matricula" = '2026' || lpad("id"::text, 6, '0') WHERE "matricula" IS NULL;
ALTER TABLE "usuario" ALTER COLUMN "matricula" SET NOT NULL;
CREATE UNIQUE INDEX "usuario_matricula_key" ON "usuario"("matricula");
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_matricula_digitos" CHECK ("matricula" ~ '^[0-9]{1,20}$');

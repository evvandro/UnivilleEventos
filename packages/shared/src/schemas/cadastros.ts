import { z } from 'zod';
import { MESES_AGENDA_MAXIMO, MESES_AGENDA_MINIMO, PERFIS, STATUS } from '../enums';

const nome = (msg = 'Informe o nome') => z.string({ error: msg }).trim().min(1, msg).max(120);

/** Matrícula: por enquanto, só dígitos (no futuro, vinda do sistema acadêmico). */
export const matriculaSchema = z
  .string({ error: 'Informe a matrícula' })
  .trim()
  .min(1, 'Informe a matrícula')
  .max(20, 'A matrícula tem no máximo 20 dígitos')
  .regex(/^\d+$/, 'A matrícula deve conter apenas números');

export const loginSchema = z.object({
  matricula: matriculaSchema,
  senha: z.string({ error: 'Informe a senha' }).min(1, 'Informe a senha'),
});

export const temaSchema = z.object({ nome: nome() });
export const recursoSchema = z.object({ nome: nome() });
export const centroCustoSchema = z.object({
  codigo: z.string({ error: 'Informe o código' }).trim().min(1, 'Informe o código').max(30),
  descricao: nome('Informe a descrição'),
});
export const cursoSchema = z.object({
  nome: nome(),
  centroCustoId: z.coerce
    .number({ error: 'Selecione o centro de custo' })
    .int()
    .positive('Selecione o centro de custo'),
});
export const ambienteSchema = z.object({
  nome: nome(),
  capacidade: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.coerce.number().int().positive('Capacidade deve ser positiva').nullable(),
  ),
  recursoIds: z.array(z.coerce.number().int().positive()).default([]),
});

const email = z.string({ error: 'Informe o e-mail' }).trim().toLowerCase().email('E-mail inválido');
const senha = z.string().min(6, 'A senha precisa de pelo menos 6 caracteres').max(100);

export const usuarioCriarSchema = z.object({
  matricula: matriculaSchema,
  nome: nome('Informe o nome completo'),
  email,
  senha,
  perfil: z.enum(PERFIS, { error: 'Selecione o perfil' }),
  ativo: z.boolean().default(true),
});
export const usuarioAtualizarSchema = usuarioCriarSchema.extend({
  senha: z.preprocess((v) => (v === '' || v == null ? undefined : v), senha.optional()),
});

export const configuracaoSchema = z.object({
  mesesAgendaPublica: z.coerce
    .number({ error: 'Informe a quantidade de meses' })
    .int()
    .min(MESES_AGENDA_MINIMO, `O mínimo é ${MESES_AGENDA_MINIMO} meses (mês atual + 2)`)
    .max(MESES_AGENDA_MAXIMO, `O máximo é ${MESES_AGENDA_MAXIMO} meses`),
});

const dataOpcional = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
);
const idQuery = z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional());

export const relatorioFiltroSchema = z.object({
  de: dataOpcional,
  ate: dataOpcional,
  cursoId: idQuery,
  temaId: idQuery,
  status: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(STATUS.filter((s) => s !== 'RASCUNHO') as [string, ...string[]]).optional(),
  ),
});
export type RelatorioFiltro = z.output<typeof relatorioFiltroSchema>;

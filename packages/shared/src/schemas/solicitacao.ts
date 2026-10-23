import { z } from 'zod';

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Converte string vazia em null antes de validar (inputs HTML mandam ''). */
const vazioParaNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const textoOpcional = (max: number) =>
  z.preprocess(vazioParaNull, z.string().trim().max(max, `Máximo de ${max} caracteres`).nullish());
const idOpcional = z.preprocess(vazioParaNull, z.coerce.number().int().positive().nullish());
const boolOpcional = z.boolean().nullish();

/**
 * Rascunho: tudo opcional, mas o que vier preenchido precisa ter formato válido.
 * Usado ao salvar rascunho (pode estar incompleto).
 */
export const solicitacaoRascunhoSchema = z.object({
  nome: textoOpcional(200),
  temaId: idOpcional,
  data: z.preprocess(vazioParaNull, z.string().regex(DATA, 'Data inválida').nullish()),
  horaInicio: z.preprocess(
    vazioParaNull,
    z.string().regex(HORA, 'Horário inválido (00:00 a 23:59)').nullish(),
  ),
  horaFim: z.preprocess(
    vazioParaNull,
    z.string().regex(HORA, 'Horário inválido (00:00 a 23:59)').nullish(),
  ),
  ambienteId: idOpcional,
  cursoId: idOpcional,
  solicitanteNome: textoOpcional(200),
  palestrante: textoOpcional(200),
  publicoAlvo: textoOpcional(300),
  justificativa: textoOpcional(2000),
  objetivo: textoOpcional(2000),
  cerimonial: boolOpcional,
  haveraInscricoes: boolOpcional,
  necessitaDeclaracoes: boolOpcional,
  recursoIds: z.array(z.coerce.number().int().positive()).default([]),
  observacoes: textoOpcional(2000),
});

const obrigatorio = (msg: string, max = 200) =>
  z.preprocess(
    vazioParaNull,
    z.string({ error: msg }).trim().min(1, msg).max(max, `Máximo de ${max} caracteres`),
  );
const idObrigatorio = (msg: string) =>
  z.preprocess(vazioParaNull, z.coerce.number({ error: msg }).int(msg).positive(msg));
const simNao = (msg: string) => z.boolean({ error: msg });

/**
 * Envio: todos os campos obrigatórios do caderno (6.2) e término depois do início.
 * Usado ao enviar, ao editar uma solicitação já enviada e quando o admin edita um aprovado.
 */
export const solicitacaoEnvioSchema = z
  .object({
    nome: obrigatorio('Informe o nome do evento'),
    temaId: idObrigatorio('Selecione o tema'),
    data: z.preprocess(vazioParaNull, z.string({ error: 'Informe a data' }).regex(DATA, 'Data inválida')),
    horaInicio: z.preprocess(
      vazioParaNull,
      z.string({ error: 'Informe o horário inicial' }).regex(HORA, 'Horário inválido (00:00 a 23:59)'),
    ),
    horaFim: z.preprocess(
      vazioParaNull,
      z.string({ error: 'Informe o horário final' }).regex(HORA, 'Horário inválido (00:00 a 23:59)'),
    ),
    ambienteId: idObrigatorio('Selecione o local'),
    cursoId: idObrigatorio('Selecione o curso/coordenação'),
    solicitanteNome: obrigatorio('Informe o solicitante'),
    palestrante: obrigatorio('Informe o palestrante'),
    publicoAlvo: obrigatorio('Informe o público-alvo', 300),
    justificativa: obrigatorio('Informe a justificativa', 2000),
    objetivo: obrigatorio('Informe o objetivo', 2000),
    cerimonial: simNao('Informe se haverá cerimonial'),
    haveraInscricoes: simNao('Informe se haverá inscrições'),
    necessitaDeclaracoes: simNao('Informe se haverá necessidade de declarações'),
    recursoIds: z.array(z.coerce.number().int().positive()).default([]),
    observacoes: textoOpcional(2000),
  })
  .refine((d) => d.horaFim > d.horaInicio, {
    message: 'O término deve ser depois do início',
    path: ['horaFim'],
  });

export const rejeitarSchema = z.object({
  motivo: z
    .string({ error: 'Informe o motivo da rejeição' })
    .trim()
    .min(5, 'Explique o motivo (mínimo de 5 caracteres)')
    .max(1000),
});

export type SolicitacaoPayload = {
  nome: string | null;
  temaId: number | null;
  data: string | null;
  horaInicio: string | null;
  horaFim: string | null;
  ambienteId: number | null;
  cursoId: number | null;
  solicitanteNome: string | null;
  palestrante: string | null;
  publicoAlvo: string | null;
  justificativa: string | null;
  objetivo: string | null;
  cerimonial: boolean | null;
  haveraInscricoes: boolean | null;
  necessitaDeclaracoes: boolean | null;
  recursoIds: number[];
  observacoes: string | null;
};
export type SolicitacaoEnvio = z.output<typeof solicitacaoEnvioSchema>;

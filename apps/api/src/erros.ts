import { Prisma } from '@prisma/client';
import { errosPorCampo } from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

/** Erro de regra de negócio com status HTTP e mensagem em pt-BR para o usuário. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public campos?: Record<string, string>,
  ) {
    super(message);
  }
}

export const naoEncontrado = (o = 'Registro') => new AppError(404, `${o} não encontrado.`);
export const proibido = (msg = 'Você não tem permissão para esta ação.') => new AppError(403, msg);

/**
 * Violação da constraint de conflito de agenda (SQLSTATE 23P01). Um deadlock (40P01) entre duas
 * gravações concorrentes no mesmo ambiente também é tratado como conflito (a outra venceu).
 */
export function ehViolacaoDeConflito(e: unknown) {
  const texto = e instanceof Error ? e.message : String(e);
  return (
    texto.includes('solicitacao_sem_conflito_aprovado') ||
    texto.includes('23P01') ||
    texto.includes('40P01')
  );
}

/** Erros de parsing do próprio Fastify, traduzidos (a API responde sempre em pt-BR). */
const MENSAGENS_FASTIFY: Record<string, string> = {
  FST_ERR_CTP_EMPTY_JSON_BODY: 'O corpo da requisição está vazio. Envie um JSON válido.',
  FST_ERR_CTP_INVALID_JSON_BODY: 'O corpo da requisição não é um JSON válido.',
  FST_ERR_CTP_BODY_TOO_LARGE: 'O corpo da requisição é grande demais (máximo de 1 MB).',
  FST_ERR_CTP_INVALID_MEDIA_TYPE: 'Tipo de conteúdo não suportado. Envie application/json.',
};

export function registrarTratamentoDeErros(app: FastifyInstance) {
  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof AppError) {
      return reply.status(erro.status).send({ message: erro.message, campos: erro.campos });
    }
    if (erro instanceof ZodError) {
      return reply
        .status(400)
        .send({ message: 'Confira os campos destacados.', campos: errosPorCampo(erro) });
    }
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2002') {
        return reply.status(409).send({ message: 'Já existe um registro com esse valor.' });
      }
      if (erro.code === 'P2003' || erro.code === 'P2014') {
        return reply.status(409).send({
          message:
            req.method === 'DELETE'
              ? 'Não é possível excluir: o registro está vinculado a eventos ou a outros cadastros.'
              : 'Um dos itens selecionados não existe mais. Recarregue a página e tente novamente.',
        });
      }
      if (erro.code === 'P2025') {
        return reply.status(404).send({ message: 'Registro não encontrado.' });
      }
    }
    if (ehViolacaoDeConflito(erro)) {
      return reply.status(409).send({
        message: 'Conflito de agenda: já existe um evento aprovado neste local e horário.',
      });
    }
    const codigo = (erro as { code?: string }).code;
    if (codigo && MENSAGENS_FASTIFY[codigo]) {
      return reply
        .status((erro as { statusCode?: number }).statusCode ?? 400)
        .send({ message: MENSAGENS_FASTIFY[codigo] });
    }
    const status = (erro as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.status(status).send({ message: (erro as Error).message });
    }
    req.log.error(erro);
    return reply.status(500).send({ message: 'Erro inesperado no servidor. Tente novamente.' });
  });
}

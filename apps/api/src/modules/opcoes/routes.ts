import type { OpcoesDTO } from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { autenticar } from '../../auth';
import { prisma } from '../../db';
import { ambienteInclude, ambienteParaDTO } from '../cadastros/routes';

/** Listas para montar os selects do formulário de solicitação. */
export async function opcoesRoutes(app: FastifyInstance) {
  app.get('/opcoes', { preHandler: autenticar }, async (): Promise<OpcoesDTO> => {
    const [temas, cursos, ambientes] = await Promise.all([
      prisma.tema.findMany({ orderBy: { nome: 'asc' } }),
      prisma.curso.findMany({ include: { centroCusto: true }, orderBy: { nome: 'asc' } }),
      prisma.ambiente.findMany({ include: ambienteInclude, orderBy: { nome: 'asc' } }),
    ]);
    return {
      temas: temas.map((t) => ({ id: t.id, nome: t.nome })),
      cursos,
      ambientes: ambientes.map(ambienteParaDTO),
    };
  });
}

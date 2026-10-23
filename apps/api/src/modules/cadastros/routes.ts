import type { Prisma } from '@prisma/client';
import {
  ambienteSchema,
  centroCustoSchema,
  cursoSchema,
  recursoSchema,
  temaSchema,
  type AmbienteDTO,
} from '@univille/shared';
import type { FastifyInstance } from 'fastify';
import { autenticar, exigirAdmin } from '../../auth';
import { prisma } from '../../db';
import { registrarCrud } from './crud';

const ambienteInclude = {
  recursos: { include: { recurso: true }, orderBy: { recurso: { nome: 'asc' } } },
} satisfies Prisma.AmbienteInclude;

export function ambienteParaDTO(
  a: Prisma.AmbienteGetPayload<{ include: typeof ambienteInclude }>,
): AmbienteDTO {
  return {
    id: a.id,
    nome: a.nome,
    capacidade: a.capacidade,
    recursos: a.recursos.map((r) => ({ id: r.recurso.id, nome: r.recurso.nome })),
  };
}
export { ambienteInclude };

export async function cadastrosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', autenticar);
  app.addHook('preHandler', exigirAdmin);

  registrarCrud(app, { caminho: '/admin/temas', delegate: prisma.tema, schema: temaSchema });
  registrarCrud(app, { caminho: '/admin/recursos', delegate: prisma.recurso, schema: recursoSchema });
  registrarCrud(app, {
    caminho: '/admin/centros-custo',
    delegate: prisma.centroCusto,
    schema: centroCustoSchema,
    orderBy: { codigo: 'asc' },
  });
  registrarCrud(app, {
    caminho: '/admin/cursos',
    delegate: prisma.curso,
    schema: cursoSchema,
    include: { centroCusto: true },
  });
  registrarCrud(app, {
    caminho: '/admin/ambientes',
    delegate: prisma.ambiente,
    schema: ambienteSchema,
    include: ambienteInclude,
    paraDTO: ambienteParaDTO,
    paraCriar: ({ recursoIds, ...d }) => ({
      ...d,
      recursos: { create: recursoIds.map((recursoId) => ({ recursoId })) },
    }),
    paraAtualizar: ({ recursoIds, ...d }) => ({
      ...d,
      recursos: { deleteMany: {}, create: recursoIds.map((recursoId) => ({ recursoId })) },
    }),
  });
}
